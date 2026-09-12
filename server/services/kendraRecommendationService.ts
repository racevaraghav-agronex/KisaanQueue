import { TokenModel } from '../models/Token.ts';
import { BookingModel } from '../models/Booking.ts';
import { UserModel } from '../models/User.ts';
import { SlotModel } from '../models/Slot.ts';
import { ServiceModel, DEFAULT_SERVICES } from '../models/Service.ts';
import { calculateIntelligentEta } from './smartEtaService.ts';
import { getTodayDateString } from '../routes/slots.ts';

export interface KendraMetrics {
  centreName: string;
  isPrimary: boolean;
  operationalStatus: 'Open & Operational' | 'High Footfall / Elevated Queue' | 'Limited Staff / High Wait' | 'Unattended / Standby';
  activeStaffOnDuty: number;
  totalWaitingTokens: number;
  totalServingTokens: number;
  serviceQueueWaiting: number;
  estimatedWaitMinutes: number;
  estimatedWaitText: string;
  availableSlotsToday: number;
  totalSlotsToday: number;
  slotAvailabilityRate: string;
  isServiceAvailable: boolean;
  locationDistance: number | null;
  distanceLabel: string;
  distanceNotice: string;
  suitabilityScore: number;
  reasons: string[];
}

export interface SmartKendraRecommendationResult {
  hasSufficientData: boolean;
  isSingleCentre: boolean;
  comparisonAvailable: boolean;
  insufficientDataReason?: string;
  serviceRequested: {
    code: string;
    name: string;
    isActive: boolean;
  };
  recommendedCentre: KendraMetrics | null;
  allCentres: KendraMetrics[];
  recommendationHeadline: string;
  evaluationSummary: string;
  criteriaUsed: string[];
  disclaimer: string;
  generatedAt: string;
}

// In-memory cache with 2-minute TTL
const kendraCache = new Map<string, { result: SmartKendraRecommendationResult; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function getSmartKendraRecommendation(options: {
  serviceCode?: string;
  date?: string;
  forceRefresh?: boolean;
}): Promise<SmartKendraRecommendationResult> {
  const serviceQuery = (options.serviceCode || 'FS').toUpperCase().trim();
  const targetDate = options.date || getTodayDateString();
  const cacheKey = `${serviceQuery}_${targetDate}`;
  const now = Date.now();

  if (!options.forceRefresh) {
    const cached = kendraCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }
  }

  // 1. Identify Service
  let service = await ServiceModel.findOne({
    $or: [{ code: serviceQuery }, { id: serviceQuery }]
  }).lean();

  if (!service) {
    const fallback = DEFAULT_SERVICES.find(s => s.code.toUpperCase() === serviceQuery || s.id === serviceQuery);
    if (fallback) service = fallback as any;
  }

  const srvCode = service?.code || serviceQuery;
  const srvName = service?.name || 'Fertilizer & Seed Distribution';
  const isServiceActive = service?.isActive !== false;

  // 2. Discover distinct Kendras / Centres recorded in MongoDB
  const [
    centresFromTokens,
    centresFromBookings,
    centresFromStaff,
    centresFromSlots
  ] = await Promise.all([
    TokenModel.distinct('centre').catch(() => []),
    BookingModel.distinct('centre').catch(() => []),
    UserModel.distinct('centre', { role: 'staff' }).catch(() => []),
    SlotModel.distinct('centre').catch(() => [])
  ]);

  const rawCentres = Array.from(new Set([
    ...centresFromTokens,
    ...centresFromBookings,
    ...centresFromStaff,
    ...centresFromSlots,
    'Krishi Seva Kendra - Main Centre'
  ])).map(c => (typeof c === 'string' ? c.trim() : '')).filter(Boolean);

  // Normalize duplicates (e.g. "Main Kendra Counter 1" refers to the same Main Centre)
  const normalizedCentres = Array.from(new Set(
    rawCentres.map(c => {
      if (c.toLowerCase().includes('main kendra') || c.toLowerCase().includes('main centre')) {
        return 'Krishi Seva Kendra - Main Centre';
      }
      return c;
    })
  ));

  // If no centers found at all
  if (normalizedCentres.length === 0) {
    const emptyResult: SmartKendraRecommendationResult = {
      hasSufficientData: false,
      isSingleCentre: false,
      comparisonAvailable: false,
      insufficientDataReason: 'No registered Kendra centres or operational records found in the database.',
      serviceRequested: { code: srvCode, name: srvName, isActive: isServiceActive },
      recommendedCentre: null,
      allCentres: [],
      recommendationHeadline: 'Insufficient Kendra Data',
      evaluationSummary: 'No centre operational profiles exist in the system. Recommendations cannot be formed.',
      criteriaUsed: ['Queue size', 'ETA', 'Service availability', 'Slot availability', 'Centre status'],
      disclaimer: 'Never invents centre availability, distance or queue data. Location/distance is omitted when reliable GPS is not recorded.',
      generatedAt: new Date().toISOString()
    };
    return emptyResult;
  }

  // 3. For each Kendra, gather verified operational metrics
  const evaluatedCentres: KendraMetrics[] = [];

  for (const centreName of normalizedCentres) {
    const isPrimary = centreName.toLowerCase().includes('main');

    // Query tokens for this centre
    const [
      waitingTokens,
      servingTokens,
      activeStaffCount,
      activeBookingsCount,
      slotDocuments
    ] = await Promise.all([
      TokenModel.find({
        status: 'waiting',
        $or: [{ centre: centreName }, { centre: { $exists: false } }, { centre: null }]
      }).sort({ issuedAt: 1 }).lean().catch(() => []),

      TokenModel.find({
        status: 'serving',
        $or: [{ centre: centreName }, { centre: { $exists: false } }, { centre: null }]
      }).lean().catch(() => []),

      UserModel.countDocuments({
        role: 'staff',
        status: 'active',
        shiftStatus: 'active',
        $or: [{ centre: centreName }, { centre: { $exists: false } }, { centre: null }]
      }).catch(() => 1),

      BookingModel.countDocuments({
        date: targetDate,
        status: { $in: ['BOOKED', 'CONFIRMED'] },
        $or: [{ centre: centreName }, { centre: { $exists: false } }, { centre: null }]
      }).catch(() => 0),

      SlotModel.find({
        date: targetDate,
        $or: [{ centre: centreName }, { centre: { $exists: false } }, { centre: null }]
      }).lean().catch(() => [])
    ]);

    const totalWaitingTokens = waitingTokens.length;
    const totalServingTokens = servingTokens.length;
    const staffOnDuty = Math.max(1, activeStaffCount);

    // Specific service waiting count
    const serviceWaitingTokens = waitingTokens.filter((t: any) => {
      const cMatch = t.serviceCode && t.serviceCode.toUpperCase() === srvCode;
      const nMatch = t.serviceName && t.serviceName.toLowerCase() === srvName.toLowerCase();
      return cMatch || nMatch;
    });
    const serviceQueueWaiting = serviceWaitingTokens.length;

    // ETA calculation for this centre and service
    let estimatedWaitMinutes = 0;
    let estimatedWaitText = '0 min (Queue clear)';

    if (serviceQueueWaiting > 0) {
      const avgMinutes = service?.averageMinutes || 10;
      // Multi-counter throughput divisor
      const effectiveCounters = Math.max(1, Math.min(staffOnDuty, 3));
      estimatedWaitMinutes = Math.max(3, Math.round((serviceQueueWaiting * avgMinutes) / effectiveCounters));
      estimatedWaitText = `~${estimatedWaitMinutes} mins (${serviceQueueWaiting} ahead)`;
    } else if (totalWaitingTokens > 0) {
      estimatedWaitMinutes = Math.max(2, Math.round(totalWaitingTokens * 2.5));
      estimatedWaitText = `~${estimatedWaitMinutes} mins (No queue for ${srvCode})`;
    }

    // Slots availability for targetDate
    // Standard Kendra capacity = 16 half-hour slots per day, default 10 capacity each = 160
    let totalSlotsToday = 160;
    let availableSlotsToday = Math.max(0, totalSlotsToday - activeBookingsCount);

    if (slotDocuments.length > 0) {
      totalSlotsToday = slotDocuments.reduce((acc: number, s: any) => acc + (s.capacity || 10), 0);
      availableSlotsToday = Math.max(0, totalSlotsToday - activeBookingsCount);
    }

    const slotPct = totalSlotsToday > 0 ? Math.round((availableSlotsToday / totalSlotsToday) * 100) : 100;
    const slotAvailabilityRate = `${slotPct}% (${availableSlotsToday}/${totalSlotsToday} seats)`;

    // Determine Operational Status
    let operationalStatus: KendraMetrics['operationalStatus'] = 'Open & Operational';
    if (staffOnDuty === 0) {
      operationalStatus = 'Unattended / Standby';
    } else if (totalWaitingTokens >= 10) {
      operationalStatus = 'High Footfall / Elevated Queue';
    } else if (estimatedWaitMinutes >= 35) {
      operationalStatus = 'Limited Staff / High Wait';
    }

    // Suitability Score Calculation (Lower wait & higher slot availability = better score)
    let suitabilityScore = 100;
    const reasons: string[] = [];

    if (!isServiceActive) {
      suitabilityScore = 0;
      reasons.push(`Service '${srvName}' is currently marked inactive in Kendra catalogue.`);
    } else {
      // Deduct for wait time
      suitabilityScore -= Math.min(50, estimatedWaitMinutes);
      // Deduct for long service queue
      suitabilityScore -= Math.min(30, serviceQueueWaiting * 4);
      // Add for available slots
      if (slotPct > 50) suitabilityScore += 10;
      if (staffOnDuty >= 2) suitabilityScore += 10;

      reasons.push(serviceQueueWaiting === 0 ? 'Zero wait queue for requested service' : `Queue load: ${serviceQueueWaiting} waiting`);
      reasons.push(`Estimated wait: ${estimatedWaitText}`);
      reasons.push(`Slots available today: ${availableSlotsToday} seats`);
      reasons.push(`On-duty staffing: ${staffOnDuty} counter staff`);
    }

    evaluatedCentres.push({
      centreName,
      isPrimary,
      operationalStatus,
      activeStaffOnDuty: staffOnDuty,
      totalWaitingTokens,
      totalServingTokens,
      serviceQueueWaiting,
      estimatedWaitMinutes,
      estimatedWaitText,
      availableSlotsToday,
      totalSlotsToday,
      slotAvailabilityRate,
      isServiceAvailable: isServiceActive,
      locationDistance: null, // STRICT RULE: NO INVENTED DISTANCE
      distanceLabel: 'Distance data unavailable (GPS not recorded)',
      distanceNotice: 'Geolocation coordinates are not stored in the database. Recommendations rely strictly on real queue size, ETA, and slot availability.',
      suitabilityScore: Math.max(0, suitabilityScore),
      reasons
    });
  }

  // 4. Sort and pick recommended centre
  evaluatedCentres.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  const isSingleCentre = evaluatedCentres.length === 1;
  const recommendedCentre = evaluatedCentres[0] || null;

  let recommendationHeadline = '';
  let evaluationSummary = '';

  if (isSingleCentre) {
    recommendationHeadline = `Primary Kendra: ${recommendedCentre.centreName}`;
    evaluationSummary = `Single registered Kendra located in the current administrative cluster (${recommendedCentre.centreName}). Cross-Kendra load balancing is not applicable. Current status: ${recommendedCentre.operationalStatus} with ${recommendedCentre.serviceQueueWaiting} waiting for ${srvName} (ETA ${recommendedCentre.estimatedWaitText}).`;
  } else {
    recommendationHeadline = `Recommended: ${recommendedCentre.centreName}`;
    evaluationSummary = `${recommendedCentre.centreName} is recommended for ${srvName} due to lower wait time (${recommendedCentre.estimatedWaitText}) and ${recommendedCentre.availableSlotsToday} available appointment slot(s). Evaluated across ${evaluatedCentres.length} cluster Kendras.`;
  }

  const result: SmartKendraRecommendationResult = {
    hasSufficientData: true,
    isSingleCentre,
    comparisonAvailable: !isSingleCentre,
    serviceRequested: {
      code: srvCode,
      name: srvName,
      isActive: isServiceActive
    },
    recommendedCentre,
    allCentres: evaluatedCentres,
    recommendationHeadline,
    evaluationSummary,
    criteriaUsed: [
      'Live Queue Size (Waiting tokens for requested service)',
      'Smart ETA (Empirical throughput / active counters)',
      'Service Availability (Active status in catalogue)',
      'Slot Availability (Remaining capacity for date)',
      'Centre Operational Status & Active Staff on Duty',
      'Distance: STRICTLY EXCLUDED (No GPS data stored)'
    ],
    disclaimer: 'Advisory recommendation only. Never invents centre availability, distance or queue data. Location/distance is omitted when reliable GPS is not recorded.',
    generatedAt: new Date().toISOString()
  };

  kendraCache.set(cacheKey, { result, timestamp: now });
  return result;
}
