import { TokenModel } from '../models/Token.ts';
import { ServiceModel, DEFAULT_SERVICES } from '../models/Service.ts';
import { UserModel } from '../models/User.ts';

interface EmpiricalServiceStats {
  avgDurationMinutes: number;
  sampleCount: number;
  lastUpdated: number;
}

// In-memory cache with 3-minute TTL to prevent repeated DB aggregations on Atlas Free Tier
const empiricalCache = new Map<string, EmpiricalServiceStats>();
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 3 * 60 * 1000;

/**
 * Load empirical service durations from completed tokens in MongoDB
 */
export async function getEmpiricalServiceDurations(): Promise<Map<string, EmpiricalServiceStats>> {
  const now = Date.now();
  if (now - lastCacheRefresh < CACHE_TTL_MS && empiricalCache.size > 0) {
    return empiricalCache;
  }

  try {
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const results = await TokenModel.aggregate([
      {
        $match: {
          status: 'completed',
          servedAt: { $exists: true, $ne: null },
          completedAt: { $exists: true, $ne: null, $gte: thirtyDaysAgo }
        }
      },
      {
        $project: {
          serviceId: 1,
          serviceName: 1,
          durationMinutes: {
            $divide: [{ $subtract: ['$completedAt', '$servedAt'] }, 60000]
          }
        }
      },
      {
        // Filter out erroneous records (< 1 min or > 90 mins)
        $match: {
          durationMinutes: { $gte: 1, $lte: 90 }
        }
      },
      {
        $group: {
          _id: '$serviceId',
          serviceName: { $first: '$serviceName' },
          avgDurationMinutes: { $avg: '$durationMinutes' },
          sampleCount: { $sum: 1 }
        }
      }
    ]);

    empiricalCache.clear();
    if (results && results.length > 0) {
      for (const item of results) {
        if (item._id) {
          empiricalCache.set(String(item._id).toUpperCase(), {
            avgDurationMinutes: Math.round(item.avgDurationMinutes * 10) / 10,
            sampleCount: item.sampleCount,
            lastUpdated: now
          });
        }
        if (item.serviceName) {
          empiricalCache.set(String(item.serviceName).toLowerCase(), {
            avgDurationMinutes: Math.round(item.avgDurationMinutes * 10) / 10,
            sampleCount: item.sampleCount,
            lastUpdated: now
          });
        }
      }
    }
    lastCacheRefresh = now;
  } catch (err) {
    console.warn('[SmartETA] Notice: Could not compute empirical stats from MongoDB, using fallback:', err);
  }

  return empiricalCache;
}

export interface SmartEtaResult {
  isAiEstimate: boolean;
  confidenceLevel: 'high' | 'moderate' | 'baseline_fallback';
  estimatedWaitMinutes: number;
  estimatedWaitText: string;
  estimatedTurnTime: string;
  peopleAhead: number;
  positionInQueue: number;
  activeCountersCount: number;
  activeStaffOnDuty: number;
  serviceAverageMinutes: number;
  configuredDurationMinutes: number;
  empiricalDurationMinutes: number | null;
  completedSamplesCount: number;
  queueLoad: 'light' | 'moderate' | 'heavy';
  isTurnNear: boolean;
  isServingNow: boolean;
  disclaimer: string;
}

/**
 * Calculates an intelligent, data-grounded Smart ETA for a token in the queue
 */
export async function calculateIntelligentEta(params: {
  tokenNumber: string;
  serviceId?: string;
  serviceName?: string;
  tokenStatus: string;
  waitingTokens: any[];
  targetIndex: number;
  servingTokens: any[];
  centre?: string;
}): Promise<SmartEtaResult> {
  const {
    tokenNumber,
    serviceId,
    serviceName,
    tokenStatus,
    waitingTokens,
    targetIndex,
    servingTokens,
    centre
  } = params;

  // Active counters from currently serving tokens
  const activeCounters = [...new Set(servingTokens.map((t: any) => t.counterNumber).filter(Boolean))] as number[];

  // Active staff on shift
  let activeStaffOnDuty = 1;
  try {
    const staffQuery: any = { role: { $in: ['staff', 'admin'] }, shiftStatus: 'active' };
    if (centre && centre !== 'ALL') {
      staffQuery.$or = [{ centre }, { centre: { $exists: false } }, { centre: null }];
    }
    activeStaffOnDuty = Math.max(1, await UserModel.countDocuments(staffQuery).catch(() => 1));
  } catch {
    activeStaffOnDuty = 1;
  }

  const effectiveCountersCount = Math.max(activeCounters.length, 1);

  // Status check: serving now
  if (tokenStatus === 'serving') {
    return {
      isAiEstimate: true,
      confidenceLevel: 'high',
      estimatedWaitMinutes: 0,
      estimatedWaitText: '0 min (Being served now)',
      estimatedTurnTime: 'Now at Counter',
      peopleAhead: 0,
      positionInQueue: 0,
      activeCountersCount: effectiveCountersCount,
      activeStaffOnDuty,
      serviceAverageMinutes: 0,
      configuredDurationMinutes: 10,
      empiricalDurationMinutes: null,
      completedSamplesCount: 0,
      queueLoad: 'light',
      isTurnNear: true,
      isServingNow: true,
      disclaimer: 'Token is currently being attended by Kendra staff.'
    };
  }

  // Status check: inactive / completed
  if (targetIndex < 0 || tokenStatus !== 'waiting') {
    return {
      isAiEstimate: false,
      confidenceLevel: 'baseline_fallback',
      estimatedWaitMinutes: 0,
      estimatedWaitText: 'Completed / Inactive',
      estimatedTurnTime: '—',
      peopleAhead: 0,
      positionInQueue: 0,
      activeCountersCount: effectiveCountersCount,
      activeStaffOnDuty,
      serviceAverageMinutes: 0,
      configuredDurationMinutes: 10,
      empiricalDurationMinutes: null,
      completedSamplesCount: 0,
      queueLoad: 'light',
      isTurnNear: false,
      isServingNow: false,
      disclaimer: 'Token is no longer active in the waiting queue.'
    };
  }

  const peopleAhead = Math.max(0, targetIndex);
  const positionInQueue = targetIndex + 1;

  // Fetch empirical statistics
  const empiricalStatsMap = await getEmpiricalServiceDurations();

  // Find empirical stat for this service
  let matchedEmpirical: EmpiricalServiceStats | undefined;
  if (serviceId && empiricalStatsMap.has(serviceId.toUpperCase())) {
    matchedEmpirical = empiricalStatsMap.get(serviceId.toUpperCase());
  } else if (serviceName && empiricalStatsMap.has(serviceName.toLowerCase())) {
    matchedEmpirical = empiricalStatsMap.get(serviceName.toLowerCase());
  }

  // Find baseline configured duration
  const fallbackService = DEFAULT_SERVICES.find(s =>
    (serviceId && (s.code.toUpperCase() === serviceId.toUpperCase() || s.id === serviceId)) ||
    (serviceName && s.name.toLowerCase() === serviceName.toLowerCase())
  );
  const configuredDurationMinutes = fallbackService?.averageMinutes || 10;

  // Determine whether we have enough historical samples
  let serviceAverageMinutes = configuredDurationMinutes;
  let confidenceLevel: 'high' | 'moderate' | 'baseline_fallback' = 'baseline_fallback';
  let empiricalDurationMinutes: number | null = null;
  let completedSamplesCount = 0;

  if (matchedEmpirical && matchedEmpirical.sampleCount >= 3) {
    empiricalDurationMinutes = matchedEmpirical.avgDurationMinutes;
    completedSamplesCount = matchedEmpirical.sampleCount;
    // Weighted blend between empirical and configured duration
    if (matchedEmpirical.sampleCount >= 10) {
      confidenceLevel = 'high';
      serviceAverageMinutes = Math.round(matchedEmpirical.avgDurationMinutes);
    } else {
      confidenceLevel = 'moderate';
      serviceAverageMinutes = Math.round((matchedEmpirical.avgDurationMinutes * 0.7) + (configuredDurationMinutes * 0.3));
    }
  } else {
    confidenceLevel = 'baseline_fallback';
    serviceAverageMinutes = configuredDurationMinutes;
  }

  // Calculate preceding duration from all tokens ahead in line
  const preceding = waitingTokens.slice(0, targetIndex);
  let precedingMinutes = 0;

  for (const t of preceding) {
    const sId = t.serviceId ? String(t.serviceId).toUpperCase() : '';
    const sName = t.serviceName ? String(t.serviceName).toLowerCase() : '';
    const emp = empiricalStatsMap.get(sId) || empiricalStatsMap.get(sName);
    if (emp && emp.sampleCount >= 3) {
      precedingMinutes += Math.round(emp.avgDurationMinutes);
    } else {
      const fb = DEFAULT_SERVICES.find(s => (sId && s.code.toUpperCase() === sId) || (sName && s.name.toLowerCase() === sName));
      precedingMinutes += fb?.averageMinutes || 10;
    }
  }

  // Allowance for tokens currently serving
  let servingRemaining = 0;
  if (servingTokens.length > 0) {
    servingRemaining = Math.max(2, Math.round(serviceAverageMinutes * 0.5));
  } else {
    servingRemaining = 1;
  }

  // Queue load category
  let queueLoad: 'light' | 'moderate' | 'heavy' = 'light';
  if (peopleAhead >= 8) queueLoad = 'heavy';
  else if (peopleAhead >= 3) queueLoad = 'moderate';

  // Final estimated wait calculation
  const rawWait = (servingRemaining + precedingMinutes) / effectiveCountersCount;
  const estimatedWaitMinutes = Math.max(1, Math.round(rawWait));
  const estimatedWaitText = `~${estimatedWaitMinutes} min (AI Estimate)`;

  const turnTime = new Date(Date.now() + estimatedWaitMinutes * 60000);
  const estimatedTurnTime = `Around ${turnTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  const isTurnNear = peopleAhead <= 2;

  const disclaimer = confidenceLevel === 'baseline_fallback'
    ? 'Estimate based on Kendra baseline service times. Processing speed may vary with counter availability.'
    : `AI estimate based on ${completedSamplesCount} real completed Kendra services and ${effectiveCountersCount} active counter(s).`;

  return {
    isAiEstimate: true,
    confidenceLevel,
    estimatedWaitMinutes,
    estimatedWaitText,
    estimatedTurnTime,
    peopleAhead,
    positionInQueue,
    activeCountersCount: effectiveCountersCount,
    activeStaffOnDuty,
    serviceAverageMinutes,
    configuredDurationMinutes,
    empiricalDurationMinutes,
    completedSamplesCount,
    queueLoad,
    isTurnNear,
    isServingNow: false,
    disclaimer
  };
}
