import { TokenModel } from '../models/Token.ts';
import { UserModel } from '../models/User.ts';
import { ServiceModel, DEFAULT_SERVICES } from '../models/Service.ts';
import { getGeminiClient } from './aiService.ts';

export interface ServiceQueuePressure {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  waitingCount: number;
  servingCount: number;
  activeCountersCount: number;
  activeCounterNumbers: number[];
  assignedStaffNames: string[];
  oldestWaitingMinutes: number;
  pressureLevel: 'low' | 'moderate' | 'high';
  pressureReason: string;
}

export interface CounterUtilization {
  counterNumber: number;
  staffId: string | null;
  staffName: string | null;
  assignedService: string | null;
  shiftStatus: 'active' | 'break' | 'offline' | 'unassigned';
  currentServingToken: string | null;
  utilizationStatus: 'busy' | 'idle' | 'on_break' | 'offline' | 'unstaffed';
  statusText: string;
}

export interface StaffRecommendationItem {
  id: string;
  priority: 'urgent' | 'high' | 'moderate' | 'info';
  type: 'assign_counter' | 'reallocate_counter' | 'activate_auxiliary' | 'shift_break' | 'optimal_balance';
  title: string;
  description: string;
  suggestedAction: string;
  serviceName?: string;
  targetCounter?: number;
  suggestedStaffName?: string;
  rationale: string;
  impact: string;
}

export interface SmartStaffRecommendationResult {
  hasSufficientData: boolean;
  status: 'optimal' | 'rebalance_suggested' | 'high_pressure_alert' | 'insufficient_data';
  overallAssessment: string;
  executiveSummary: string;
  source: 'gemini' | 'deterministic_synthesis';
  totalStaffOnShift: number;
  activeStaffOnDuty: number;
  staffOnBreak: number;
  staffOffline: number;
  activeCountersCount: number;
  totalCountersConfigured: number;
  queuePressureByService: ServiceQueuePressure[];
  counterUtilization: CounterUtilization[];
  recommendations: StaffRecommendationItem[];
  disclaimer: string;
  generatedAt: string;
}

// In-memory cache with 2-minute TTL to respect MongoDB Atlas Free Tier and AI quotas
let cachedResult: SmartStaffRecommendationResult | null = null;
let lastCalculatedTimestamp = 0;
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function getSmartStaffRecommendations(forceRefresh = false): Promise<SmartStaffRecommendationResult> {
  const now = Date.now();
  if (!forceRefresh && cachedResult && now - lastCalculatedTimestamp < CACHE_TTL_MS) {
    return cachedResult;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. Gather real MongoDB records concurrently
  const [
    waitingTokens,
    servingTokens,
    allStaffList,
    servicesList
  ] = await Promise.all([
    TokenModel.find({ status: 'waiting' }).sort({ issuedAt: 1 }).lean().catch(() => []),
    TokenModel.find({ status: 'serving' }).lean().catch(() => []),
    UserModel.find({ role: 'staff', status: { $ne: 'inactive' } }).lean().catch(() => []),
    ServiceModel.find({ isActive: { $ne: false } }).lean().catch(() => [])
  ]);

  const effectiveServices = servicesList.length > 0 ? servicesList : (DEFAULT_SERVICES as any[]);

  // 2. Tally Staff counts
  const totalStaffCount = allStaffList.length;
  const activeStaffList = allStaffList.filter((s: any) => s.shiftStatus === 'active' || !s.shiftStatus);
  const breakStaffList = allStaffList.filter((s: any) => s.shiftStatus === 'break');
  const offlineStaffList = allStaffList.filter((s: any) => s.shiftStatus === 'offline');

  // 3. Counter utilization (Counters 1 through 6)
  const TOTAL_COUNTERS = 6;
  const counterUtilization: CounterUtilization[] = [];

  for (let c = 1; c <= TOTAL_COUNTERS; c++) {
    const assignedStaff = allStaffList.find((s: any) => s.counterNumber === c);
    const servingToken = servingTokens.find((t: any) => t.counterNumber === c);

    let shiftStatus: CounterUtilization['shiftStatus'] = 'unassigned';
    let utilizationStatus: CounterUtilization['utilizationStatus'] = 'unstaffed';
    let statusText = 'No staff assigned to this counter';

    if (assignedStaff) {
      shiftStatus = (assignedStaff.shiftStatus as any) || 'active';
      if (shiftStatus === 'break') {
        utilizationStatus = 'on_break';
        statusText = `${assignedStaff.name} is on scheduled break`;
      } else if (shiftStatus === 'offline') {
        utilizationStatus = 'offline';
        statusText = `${assignedStaff.name} is currently offline`;
      } else if (servingToken) {
        utilizationStatus = 'busy';
        statusText = `Serving Token ${servingToken.tokenNumber} (${servingToken.serviceName || 'Service'})`;
      } else {
        utilizationStatus = 'idle';
        statusText = `Staff on duty (${assignedStaff.name}), currently idle`;
      }
    }

    counterUtilization.push({
      counterNumber: c,
      staffId: assignedStaff ? String(assignedStaff._id) : null,
      staffName: assignedStaff ? assignedStaff.name : null,
      assignedService: assignedStaff?.assignedService || null,
      shiftStatus,
      currentServingToken: servingToken ? servingToken.tokenNumber : null,
      utilizationStatus,
      statusText
    });
  }

  // 4. Calculate Queue Pressure per Service
  const queuePressureByService: ServiceQueuePressure[] = [];

  for (const srv of effectiveServices) {
    const srvCode = (srv.code || '').toUpperCase();
    const srvName = srv.name || 'General Support';

    // Find waiting tokens matching this service
    const matchedWaiting = waitingTokens.filter((t: any) => {
      const codeMatch = t.serviceCode && t.serviceCode.toUpperCase() === srvCode;
      const nameMatch = t.serviceName && t.serviceName.toLowerCase() === srvName.toLowerCase();
      const idMatch = t.serviceId && String(t.serviceId) === String(srv._id || srv.id);
      return codeMatch || nameMatch || idMatch;
    });

    // Find serving tokens matching this service
    const matchedServing = servingTokens.filter((t: any) => {
      const codeMatch = t.serviceCode && t.serviceCode.toUpperCase() === srvCode;
      const nameMatch = t.serviceName && t.serviceName.toLowerCase() === srvName.toLowerCase();
      return codeMatch || nameMatch;
    });

    // Active counters serving this service right now
    const activeCountersForService = [
      ...new Set(matchedServing.map((t: any) => t.counterNumber).filter(Boolean))
    ] as number[];

    // Staff assigned to this service
    const assignedStaff = activeStaffList.filter((st: any) => {
      if (!st.assignedService) return false;
      const assignLower = st.assignedService.toLowerCase();
      return assignLower.includes(srvName.toLowerCase()) || assignLower.includes(srvCode.toLowerCase());
    });

    const assignedStaffNames = assignedStaff.map((st: any) => st.name);

    // Oldest waiting calculation
    let oldestWaitingMinutes = 0;
    if (matchedWaiting.length > 0 && matchedWaiting[0].issuedAt) {
      const issuedTime = new Date(matchedWaiting[0].issuedAt).getTime();
      oldestWaitingMinutes = Math.max(0, Math.round((now - issuedTime) / 60000));
    }

    // Determine Pressure Level
    let pressureLevel: 'low' | 'moderate' | 'high' = 'low';
    let pressureReason = 'Demand is within normal operational capacity.';

    const waitingCount = matchedWaiting.length;
    const servingCount = matchedServing.length;
    const activeCountersCount = Math.max(activeCountersForService.length, assignedStaff.length > 0 ? 1 : 0);

    if (waitingCount >= 5 || (waitingCount >= 3 && activeCountersCount === 0) || oldestWaitingMinutes >= 25) {
      pressureLevel = 'high';
      if (activeCountersCount === 0) {
        pressureReason = `${waitingCount} farmer(s) waiting with NO active counter attending this service.`;
      } else {
        pressureReason = `High load: ${waitingCount} waiting vs ${activeCountersCount} active counter(s). Oldest wait is ~${oldestWaitingMinutes}m.`;
      }
    } else if (waitingCount >= 2 || oldestWaitingMinutes >= 12) {
      pressureLevel = 'moderate';
      pressureReason = `Moderate load: ${waitingCount} farmer(s) waiting. Monitoring throughput.`;
    } else {
      pressureLevel = 'low';
      pressureReason = waitingCount === 0 ? 'Queue is clear. Counter ready.' : `${waitingCount} farmer(s) in queue. Serviced smoothly.`;
    }

    queuePressureByService.push({
      serviceId: String(srv._id || srv.id || srvCode),
      serviceCode: srvCode,
      serviceName: srvName,
      waitingCount,
      servingCount,
      activeCountersCount,
      activeCounterNumbers: activeCountersForService,
      assignedStaffNames,
      oldestWaitingMinutes,
      pressureLevel,
      pressureReason
    });
  }

  // 5. Generate Grounded Actionable Recommendations
  const recommendations: StaffRecommendationItem[] = [];

  // Sort queue pressure by severity: high first, then moderate
  const highPressureServices = queuePressureByService.filter(s => s.pressureLevel === 'high');
  const moderatePressureServices = queuePressureByService.filter(s => s.pressureLevel === 'moderate');
  const idleCounters = counterUtilization.filter(c => c.utilizationStatus === 'idle');
  const unstaffedCounters = counterUtilization.filter(c => c.utilizationStatus === 'unstaffed');

  // Recommendation 1: High Pressure services
  for (const srv of highPressureServices) {
    // Check if an idle counter can be reallocated
    if (idleCounters.length > 0) {
      const idle = idleCounters[0];
      recommendations.push({
        id: `rec-high-realloc-${srv.serviceCode}`,
        priority: 'urgent',
        type: 'reallocate_counter',
        title: `High Pressure: ${srv.serviceName}`,
        description: `${srv.serviceName} queue is under high pressure (${srv.waitingCount} waiting, oldest ~${srv.oldestWaitingMinutes}m). Counter 0${idle.counterNumber} (${idle.staffName || 'Staff'}) is currently idle.`,
        suggestedAction: `Consider temporarily assigning Counter 0${idle.counterNumber} to ${srv.serviceName} to relieve queue congestion.`,
        serviceName: srv.serviceName,
        targetCounter: idle.counterNumber,
        suggestedStaffName: idle.staffName || undefined,
        rationale: `Imbalance detected: ${srv.waitingCount} farmers waiting for ${srv.serviceName} while Counter 0${idle.counterNumber} has 0 queue load.`,
        impact: `Expected to cut wait time by approximately 40–50% for ${srv.serviceName}.`
      });
    } else if (unstaffedCounters.length > 0) {
      const unstaffed = unstaffedCounters[0];
      recommendations.push({
        id: `rec-high-open-${srv.serviceCode}`,
        priority: 'urgent',
        type: 'assign_counter',
        title: `Activate Auxiliary Counter for ${srv.serviceName}`,
        description: `${srv.serviceName} queue is under high pressure with ${srv.waitingCount} farmers waiting; only ${srv.activeCountersCount} counter(s) attending.`,
        suggestedAction: `Consider assigning another eligible counter (e.g. Counter 0${unstaffed.counterNumber}) to handle ${srv.serviceName}.`,
        serviceName: srv.serviceName,
        targetCounter: unstaffed.counterNumber,
        rationale: `Service demand exceeds single-counter capacity. Oldest waiting farmer has been in queue for ${srv.oldestWaitingMinutes} mins.`,
        impact: `Doubles service throughput for ${srv.serviceName} during seasonal rush.`
      });
    } else {
      recommendations.push({
        id: `rec-high-capacity-${srv.serviceCode}`,
        priority: 'high',
        type: 'activate_auxiliary',
        title: `Service Bottleneck: ${srv.serviceName}`,
        description: `${srv.serviceName} has ${srv.waitingCount} waiting farmers with all active counters fully occupied.`,
        suggestedAction: `Consider deploying auxiliary staff or expediting token verification at Counter ${srv.activeCounterNumbers.join(', ') || '1'}.`,
        serviceName: srv.serviceName,
        rationale: `Maximum physical counters currently occupied. Prioritize quick-resolution inquiries.`,
        impact: `Prevents queue accumulation beyond Kendra seating capacity.`
      });
    }
  }

  // Recommendation 2: Moderate Pressure without adequate counters
  for (const srv of moderatePressureServices) {
    if (srv.activeCountersCount === 0) {
      const targetCounter = unstaffedCounters[0]?.counterNumber || idleCounters[0]?.counterNumber || 2;
      recommendations.push({
        id: `rec-mod-unattended-${srv.serviceCode}`,
        priority: 'high',
        type: 'assign_counter',
        title: `Assign Staff to ${srv.serviceName}`,
        description: `${srv.waitingCount} farmer(s) are in queue for ${srv.serviceName}, but no counter is actively serving this category.`,
        suggestedAction: `Assign an available staff member to Counter 0${targetCounter} for ${srv.serviceName}.`,
        serviceName: srv.serviceName,
        targetCounter,
        rationale: `Queue is growing without active service throughput.`,
        impact: `Eliminates unserved backlog before it reaches high pressure threshold.`
      });
    }
  }

  // Recommendation 3: Staff Break & Offline Coordination
  if (breakStaffList.length >= 2 && waitingTokens.length > 3) {
    recommendations.push({
      id: 'rec-stagger-breaks',
      priority: 'moderate',
      type: 'shift_break',
      title: 'Stagger Staff Rest Periods',
      description: `${breakStaffList.length} staff members are currently on break while ${waitingTokens.length} farmers are in queue.`,
      suggestedAction: 'Consider staggering staff breaks so at least 2 service counters remain operational during peak hours.',
      rationale: 'Simultaneous staff breaks during peak hours cause sudden spikes in farmer wait times.',
      impact: 'Maintains steady token servicing rhythm throughout the shift.'
    });
  }

  // Recommendation 4: Balanced state fallback
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec-optimal-balance',
      priority: 'info',
      type: 'optimal_balance',
      title: 'Counter & Staff Allocation Is Optimal',
      description: `Current staffing (${activeStaffList.length} active on shift) is well-proportioned to the waiting queue (${waitingTokens.length} waiting).`,
      suggestedAction: 'Maintain current counter assignments. No staff re-allocation required at this time.',
      rationale: 'All service queues are operating within target response parameters (< 10 min wait).',
      impact: 'Orderly Kendra operations with stable farmer turnover.'
    });
  }

  // Overall status evaluation
  let status: SmartStaffRecommendationResult['status'] = 'optimal';
  if (highPressureServices.length > 0) status = 'high_pressure_alert';
  else if (moderatePressureServices.length > 0 || recommendations.some(r => r.priority === 'high')) status = 'rebalance_suggested';

  const totalWaiting = waitingTokens.length;
  const activeCountersCount = counterUtilization.filter(c => c.utilizationStatus === 'busy').length;

  const fallbackExecutiveSummary = status === 'high_pressure_alert'
    ? `High queue pressure detected in ${highPressureServices.map(s => s.serviceName).join(', ')}. ${totalWaiting} farmer(s) waiting across Kendra desks. Recommend deploying auxiliary counter capacity.`
    : status === 'rebalance_suggested'
    ? `Moderate queue activity detected. ${totalWaiting} farmer(s) waiting across ${activeStaffList.length} active staff on shift. Rebalancing recommended for optimal throughput.`
    : `Kendra queue operations are balanced. ${activeStaffList.length} staff active across ${activeCountersCount} operational counter(s) handling ${totalWaiting} waiting farmer(s).`;

  let executiveSummary = fallbackExecutiveSummary;
  let source: 'gemini' | 'deterministic_synthesis' = 'deterministic_synthesis';

  // 6. Optional AI Synthesis with Gemini 3.8 Flash
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    try {
      const ai = getGeminiClient();
      const prompt = `You are the operations advisor for Krishi Seva Kendra (Kisan Queue System).
Analyze this verified real-time staff and queue load dataset:
- Total waiting farmers: ${totalWaiting}
- Active staff on shift: ${activeStaffList.length} (On break: ${breakStaffList.length}, Offline: ${offlineStaffList.length})
- Active counters serving now: ${activeCountersCount} of ${TOTAL_COUNTERS}
- Queue pressure by service:
${JSON.stringify(queuePressureByService.map(s => ({
  service: s.serviceName,
  waiting: s.waitingCount,
  serving: s.servingCount,
  activeCounters: s.activeCountersCount,
  pressure: s.pressureLevel,
  oldestWaitMins: s.oldestWaitingMinutes
})), null, 2)}
- Counter matrix:
${JSON.stringify(counterUtilization.map(c => ({
  counter: c.counterNumber,
  staff: c.staffName || 'Unstaffed',
  service: c.assignedService || 'None',
  status: c.utilizationStatus
})), null, 2)}

Provide an operational summary strictly grounded on these metrics.
Format your output as a valid JSON object matching:
{
  "executiveSummary": "1-2 concise sentences summarizing queue load and counter allocation.",
  "actionableAdvice": "1 sentence giving clear recommendation to the Admin in-charge."
}
Return ONLY raw JSON, no code fences.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text ? response.text.trim() : '';
      if (responseText) {
        const parsed = JSON.parse(responseText);
        if (parsed.executiveSummary) {
          executiveSummary = parsed.executiveSummary;
          source = 'gemini';
        }
      }
    } catch (aiErr: any) {
      console.warn('[StaffRecommendation] Gemini synthesis notice, using deterministic fallback:', aiErr?.message);
    }
  }

  const result: SmartStaffRecommendationResult = {
    hasSufficientData: true,
    status,
    overallAssessment: status === 'high_pressure_alert' ? 'High Queue Pressure' : status === 'rebalance_suggested' ? 'Rebalance Suggested' : 'Optimal Capacity',
    executiveSummary,
    source,
    totalStaffOnShift: totalStaffCount,
    activeStaffOnDuty: activeStaffList.length,
    staffOnBreak: breakStaffList.length,
    staffOffline: offlineStaffList.length,
    activeCountersCount,
    totalCountersConfigured: TOTAL_COUNTERS,
    queuePressureByService,
    counterUtilization,
    recommendations,
    disclaimer: 'Advisory recommendation only. Staff assignments and permissions are never altered automatically. Manual Kendra In-Charge authorization required.',
    generatedAt: new Date().toISOString()
  };

  cachedResult = result;
  lastCalculatedTimestamp = now;
  return result;
}
