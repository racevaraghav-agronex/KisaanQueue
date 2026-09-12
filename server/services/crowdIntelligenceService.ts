import { TokenModel } from '../models/Token.ts';
import { BookingModel } from '../models/Booking.ts';

export interface CrowdIntelligenceData {
  hasSufficientData: boolean;
  currentQueuePressure: 'Low' | 'Moderate' | 'High';
  currentWaitingCount: number;
  busyHoursText: string;
  lowTrafficHoursText: string;
  peakHourSlots: Array<{ hour: number; label: string; tokenCount: number }>;
  topDemandedService: { name: string; percentage: number; count: number } | null;
  serviceDemandBreakdown: Array<{ serviceName: string; count: number; percentage: number }>;
  recentFootfallTrend: {
    direction: 'rising' | 'stable' | 'declining';
    todayVolume: number;
    sevenDayAverage: number;
    trendDescription: string;
  };
  upcomingRushForecast: string;
  executiveSummary: string;
  dataPointsAnalyzed: number;
  lastCalculatedAt: string;
}

// In-memory cache with 3-minute TTL
let cachedCrowdData: CrowdIntelligenceData | null = null;
let lastCalculatedTimestamp = 0;
const CACHE_TTL_MS = 3 * 60 * 1000;

function formatHour(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const padded = h12 < 10 ? `0${h12}` : `${h12}`;
  return `${padded}:00 ${ampm}`;
}

export async function getCrowdIntelligence(forceRefresh = false): Promise<CrowdIntelligenceData> {
  const now = Date.now();
  if (!forceRefresh && cachedCrowdData && (now - lastCalculatedTimestamp < CACHE_TTL_MS)) {
    return cachedCrowdData;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // 1. Check current queue load
  const waitingTokensCount = await TokenModel.countDocuments({ status: 'waiting' }).catch(() => 0);

  let currentQueuePressure: 'Low' | 'Moderate' | 'High' = 'Low';
  if (waitingTokensCount >= 8) currentQueuePressure = 'High';
  else if (waitingTokensCount >= 3) currentQueuePressure = 'Moderate';

  // 2. Count total historical tokens in last 30 days
  const totalTokens = await TokenModel.countDocuments({ issuedAt: { $gte: thirtyDaysAgo } }).catch(() => 0);

  // If fewer than 3 tokens exist in history, gracefully indicate insufficient data
  if (totalTokens < 3) {
    const insufficientResult: CrowdIntelligenceData = {
      hasSufficientData: false,
      currentQueuePressure,
      currentWaitingCount: waitingTokensCount,
      busyHoursText: 'Insufficient historical data for reliable prediction.',
      lowTrafficHoursText: 'Insufficient historical data for reliable prediction.',
      peakHourSlots: [],
      topDemandedService: null,
      serviceDemandBreakdown: [],
      recentFootfallTrend: {
        direction: 'stable',
        todayVolume: waitingTokensCount,
        sevenDayAverage: 0,
        trendDescription: 'Insufficient historical data for reliable prediction.'
      },
      upcomingRushForecast: 'Insufficient booking records to forecast upcoming rush.',
      executiveSummary: `Current waiting queue: ${waitingTokensCount} farmer(s). Insufficient historical records for footfall prediction. Predictions will activate automatically as token records accumulate.`,
      dataPointsAnalyzed: totalTokens,
      lastCalculatedAt: new Date().toISOString()
    };
    cachedCrowdData = insufficientResult;
    lastCalculatedTimestamp = now;
    return insufficientResult;
  }

  // 3. Hourly aggregation for busy / low-traffic hours
  const hourlyAgg = await TokenModel.aggregate([
    {
      $match: {
        issuedAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $project: {
        hour: { $hour: { date: '$issuedAt', timezone: 'Asia/Kolkata' } }
      }
    },
    {
      $group: {
        _id: '$hour',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]).catch(() => []);

  const peakHourSlots: Array<{ hour: number; label: string; tokenCount: number }> = [];
  let busyHoursText = 'Insufficient historical data for reliable prediction.';
  let lowTrafficHoursText = 'Morning hours before 09:30 AM typically experience lighter crowds.';

  if (hourlyAgg && hourlyAgg.length > 0) {
    // Fill peakHourSlots
    for (const item of hourlyAgg.slice(0, 5)) {
      peakHourSlots.push({
        hour: item._id,
        label: `${formatHour(item._id)} - ${formatHour((item._id + 1) % 24)}`,
        tokenCount: item.count
      });
    }

    const topHour = hourlyAgg[0];
    const secondHour = hourlyAgg[1];
    if (topHour) {
      if (secondHour && Math.abs(topHour._id - secondHour._id) <= 2) {
        const startH = Math.min(topHour._id, secondHour._id);
        const endH = Math.max(topHour._id, secondHour._id) + 1;
        busyHoursText = `${formatHour(startH)} to ${formatHour(endH)} (Peak activity period)`;
      } else {
        busyHoursText = `${formatHour(topHour._id)} to ${formatHour((topHour._id + 1) % 24)} (Highest token volume)`;
      }
    }

    // Find hours with lowest non-zero activity during working hours (8am - 6pm)
    const workingHours = hourlyAgg.filter(h => h._id >= 8 && h._id <= 17);
    if (workingHours.length > 1) {
      const lowest = workingHours[workingHours.length - 1];
      lowTrafficHoursText = `${formatHour(lowest._id)} to ${formatHour((lowest._id + 1) % 24)} (Lightest queue load)`;
    }
  }

  // 4. Service demand breakdown
  const serviceAgg = await TokenModel.aggregate([
    {
      $match: {
        issuedAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: '$serviceName',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]).catch(() => []);

  const serviceDemandBreakdown: Array<{ serviceName: string; count: number; percentage: number }> = [];
  let topDemandedService: { name: string; percentage: number; count: number } | null = null;

  if (serviceAgg && serviceAgg.length > 0) {
    const sumCount = serviceAgg.reduce((acc, curr) => acc + curr.count, 0);
    for (const s of serviceAgg) {
      const pct = Math.round((s.count / Math.max(sumCount, 1)) * 100);
      serviceDemandBreakdown.push({
        serviceName: s._id || 'General Service',
        count: s.count,
        percentage: pct
      });
    }
    if (serviceDemandBreakdown[0]) {
      topDemandedService = {
        name: serviceDemandBreakdown[0].serviceName,
        percentage: serviceDemandBreakdown[0].percentage,
        count: serviceDemandBreakdown[0].count
      };
    }
  }

  // 5. Recent footfall trend (past 7 days vs today)
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const sevenDayCount = await TokenModel.countDocuments({ issuedAt: { $gte: sevenDaysAgo } }).catch(() => 0);
  const todayVolume = await TokenModel.countDocuments({ issuedAt: { $gte: todayStart } }).catch(() => 0);
  const sevenDayAverage = Math.round((sevenDayCount / 7) * 10) / 10;

  let direction: 'rising' | 'stable' | 'declining' = 'stable';
  let trendDescription = `Today's volume (${todayVolume} tokens) aligns with the 7-day average of ${sevenDayAverage} tokens/day.`;

  if (todayVolume > sevenDayAverage * 1.25 && sevenDayAverage > 0) {
    direction = 'rising';
    trendDescription = `Footfall is elevated today (${todayVolume} tokens vs. 7-day daily average of ${sevenDayAverage}).`;
  } else if (todayVolume < sevenDayAverage * 0.75 && sevenDayAverage > 3) {
    direction = 'declining';
    trendDescription = `Current footfall is lighter than the 7-day daily average (${todayVolume} tokens today vs ${sevenDayAverage} avg).`;
  }

  // 6. Upcoming rush forecast based on confirmed bookings for today and tomorrow
  const tomorrowEnd = new Date(now + 2 * 24 * 60 * 60 * 1000);
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingBookings = await BookingModel.find({
    date: { $gte: todayStr },
    status: { $in: ['CONFIRMED', 'BOOKED'] }
  }).sort({ date: 1, startTime: 1 }).limit(10).lean().catch(() => []);

  let upcomingRushForecast = 'No heavy pre-booked arrival spikes detected in upcoming appointment slots.';
  if (upcomingBookings && upcomingBookings.length > 0) {
    const todayAppointments = upcomingBookings.filter((b: any) => b.date === todayStr);
    if (todayAppointments.length >= 3) {
      upcomingRushForecast = `${todayAppointments.length} appointment(s) confirmed for today. Moderate arrival influx expected around scheduled slot times.`;
    } else {
      upcomingRushForecast = `${upcomingBookings.length} upcoming slot booking(s) scheduled. Queue pace is expected to remain manageable.`;
    }
  }

  // Executive summary
  const executiveSummary = `Queue pressure is currently ${currentQueuePressure.toLowerCase()} with ${waitingTokensCount} waiting farmer(s). ${
    topDemandedService ? `Highest demand is in ${topDemandedService.name} (${topDemandedService.percentage}% of recent requests).` : ''
  } ${busyHoursText.includes('Peak') ? `Historical peak traffic concentrates around ${busyHoursText}.` : ''}`;

  const result: CrowdIntelligenceData = {
    hasSufficientData: true,
    currentQueuePressure,
    currentWaitingCount: waitingTokensCount,
    busyHoursText,
    lowTrafficHoursText,
    peakHourSlots,
    topDemandedService,
    serviceDemandBreakdown,
    recentFootfallTrend: {
      direction,
      todayVolume,
      sevenDayAverage,
      trendDescription
    },
    upcomingRushForecast,
    executiveSummary,
    dataPointsAnalyzed: totalTokens,
    lastCalculatedAt: new Date().toISOString()
  };

  cachedCrowdData = result;
  lastCalculatedTimestamp = now;
  return result;
}
