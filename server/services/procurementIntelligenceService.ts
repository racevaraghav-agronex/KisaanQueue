import { ProcurementModel } from '../models/Procurement.ts';
import { getGeminiClient } from './aiService.ts';

export interface ProcurementFilterOptions {
  fromDate?: Date;
  toDate?: Date;
  rangeLabel?: string;
  centre?: string;
  staff?: string;
  forceRefresh?: boolean;
}

export interface ProcurementCropStat {
  cropName: string;
  volume: number;
  value: number;
  unit: string;
  percentageShare: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionRatePercentage: number;
  averageRate: number;
  avgMoisture: number | null;
  lotCount: number;
}

export interface ProcurementIntelligenceResult {
  isAiGenerated: boolean;
  source: 'gemini' | 'deterministic_synthesis';
  status: 'success' | 'fallback';
  generatedAt: string;
  hasSufficientData: boolean;
  filtersApplied: {
    rangeLabel: string;
    centre: string;
    staff: string;
  };
  summaryMetrics: {
    totalLots: number;
    declaredQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    rejectionRatePercentage: number;
    totalProcurementValue: number;
    paidAmount: number;
    paidLotsCount: number;
    pendingAmount: number;
    pendingLotsCount: number;
    overallAvgMoisture: number | null;
    unit: string;
  };
  cropBreakdown: ProcurementCropStat[];
  gradeDistribution: Array<{
    grade: string;
    lotsCount: number;
    acceptedQuantity: number;
  }>;
  centreActivity: Array<{
    centre: string;
    lotsCount: number;
    acceptedQuantity: number;
    totalValue: number;
  }>;
  trendAnalysis: {
    hasHistoricalComparison: boolean;
    trendDescription: string;
    volumeChangePercentage?: number | null;
    direction: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  };
  executiveBrief: string;
  actionableRecommendations: Array<{
    category: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// In-memory cache keyed by filter signature with 3-minute TTL
interface CacheEntry {
  timestamp: number;
  data: ProcurementIntelligenceResult;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000;

export async function getProcurementIntelligence(
  options: ProcurementFilterOptions = {}
): Promise<ProcurementIntelligenceResult> {
  const now = new Date();
  const fromDate = options.fromDate || new Date(now.getTime() - 7 * 86400000);
  const toDate = options.toDate || now;
  const rangeLabel = options.rangeLabel || 'Last 7 Days';
  const centre = options.centre || 'ALL';
  const staff = options.staff || 'ALL';
  const forceRefresh = !!options.forceRefresh;

  const cacheKey = `proc_${fromDate.getTime()}_${toDate.getTime()}_${centre}_${staff}`;
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // Build MongoDB match criteria strictly matching filters
  const matchCriteria: any = {
    createdAt: { $gte: fromDate, $lte: toDate }
  };
  if (centre !== 'ALL') {
    matchCriteria.centre = centre;
  }
  if (staff !== 'ALL') {
    matchCriteria.$or = [
      { 'arrival.verifiedByStaffName': staff },
      { 'weighment.weighedByStaffName': staff },
      { 'decision.decidedByStaffName': staff }
    ];
  }

  // Compute previous time window of same length for genuine trend comparison
  const windowDurationMs = toDate.getTime() - fromDate.getTime();
  const prevFromDate = new Date(fromDate.getTime() - windowDurationMs);
  const prevToDate = new Date(fromDate.getTime() - 1);
  const prevMatchCriteria: any = {
    ...matchCriteria,
    createdAt: { $gte: prevFromDate, $lte: prevToDate }
  };

  // Run real MongoDB aggregations
  const [
    summaryAgg,
    cropsAgg,
    gradesAgg,
    centresAgg,
    prevSummaryAgg,
    totalRecordsAllTime
  ] = await Promise.all([
    ProcurementModel.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: null,
          totalLots: { $sum: 1 },
          declaredQuantity: { $sum: '$produce.declaredQuantity' },
          acceptedQuantity: { $sum: '$decision.acceptedQuantity' },
          rejectedQuantity: { $sum: '$decision.rejectedQuantity' },
          totalValue: { $sum: '$pricing.netPayable' },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'PAID'] }, '$payment.paidAmount', 0] }
          },
          paidLotsCount: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'PAID'] }, 1, 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'PENDING'] }, '$pricing.netPayable', 0] }
          },
          pendingLotsCount: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'PENDING'] }, 1, 0] }
          },
          avgMoisture: { $avg: '$quality.moisturePercentage' }
        }
      }
    ]),
    ProcurementModel.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$produce.cropName',
          lotCount: { $sum: 1 },
          declaredQuantity: { $sum: '$produce.declaredQuantity' },
          acceptedQuantity: { $sum: '$decision.acceptedQuantity' },
          rejectedQuantity: { $sum: '$decision.rejectedQuantity' },
          totalValue: { $sum: '$pricing.netPayable' },
          unit: { $first: '$produce.unit' },
          avgMoisture: { $avg: '$quality.moisturePercentage' }
        }
      },
      { $sort: { totalValue: -1 } }
    ]),
    ProcurementModel.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: { $ifNull: ['$quality.grade', 'Unassigned'] },
          lotsCount: { $sum: 1 },
          acceptedQuantity: { $sum: '$decision.acceptedQuantity' }
        }
      },
      { $sort: { lotsCount: -1 } }
    ]),
    ProcurementModel.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: { $ifNull: ['$centre', 'Main Kendra'] },
          lotsCount: { $sum: 1 },
          acceptedQuantity: { $sum: '$decision.acceptedQuantity' },
          totalValue: { $sum: '$pricing.netPayable' }
        }
      },
      { $sort: { totalValue: -1 } }
    ]),
    ProcurementModel.aggregate([
      { $match: prevMatchCriteria },
      {
        $group: {
          _id: null,
          totalLots: { $sum: 1 },
          acceptedQuantity: { $sum: '$decision.acceptedQuantity' },
          totalValue: { $sum: '$pricing.netPayable' }
        }
      }
    ]),
    ProcurementModel.countDocuments()
  ]);

  const summary = summaryAgg[0] || {
    totalLots: 0,
    declaredQuantity: 0,
    acceptedQuantity: 0,
    rejectedQuantity: 0,
    totalValue: 0,
    paidAmount: 0,
    paidLotsCount: 0,
    pendingAmount: 0,
    pendingLotsCount: 0,
    avgMoisture: null
  };

  const totalAcceptedPlusRejected = summary.acceptedQuantity + summary.rejectedQuantity;
  const rejectionRatePercentage = totalAcceptedPlusRejected > 0
    ? Number(((summary.rejectedQuantity / totalAcceptedPlusRejected) * 100).toFixed(1))
    : 0;

  // Process Crop Breakdown with genuine proportions and calculated actual average rates
  const totalVolume = summary.acceptedQuantity > 0 ? summary.acceptedQuantity : (summary.declaredQuantity || 1);
  const cropBreakdown: ProcurementCropStat[] = cropsAgg.map((c: any) => {
    const cropVolume = Number(c.acceptedQuantity || c.declaredQuantity || 0);
    const cropValue = Number(c.totalValue || 0);
    const cropAccepted = Number(c.acceptedQuantity || 0);
    const cropRejected = Number(c.rejectedQuantity || 0);
    const cropTotal = cropAccepted + cropRejected;
    const cropRejectionRate = cropTotal > 0 ? Number(((cropRejected / cropTotal) * 100).toFixed(1)) : 0;
    const avgRate = cropAccepted > 0 ? Math.round(cropValue / cropAccepted) : 0;

    return {
      cropName: c._id || 'Standard Produce',
      volume: cropVolume,
      value: cropValue,
      unit: c.unit || 'Quintal',
      percentageShare: Number(((cropVolume / totalVolume) * 100).toFixed(1)),
      acceptedQty: cropAccepted,
      rejectedQty: cropRejected,
      rejectionRatePercentage: cropRejectionRate,
      averageRate: avgRate,
      avgMoisture: c.avgMoisture !== null && c.avgMoisture !== undefined ? Number(c.avgMoisture.toFixed(1)) : null,
      lotCount: c.lotCount
    };
  });

  const gradeDistribution = gradesAgg.map((g: any) => ({
    grade: g._id || 'Unassigned',
    lotsCount: g.lotsCount,
    acceptedQuantity: g.acceptedQuantity || 0
  }));

  const centreActivity = centresAgg.map((ct: any) => ({
    centre: ct._id || 'Main Kendra',
    lotsCount: ct.lotsCount,
    acceptedQuantity: ct.acceptedQuantity || 0,
    totalValue: ct.totalValue || 0
  }));

  // Trend analysis calculation
  const prevSummary = prevSummaryAgg[0] || null;
  const hasSufficientData = totalRecordsAllTime >= 3 && summary.totalLots > 0;
  let trendDescription = 'Insufficient historical data for reliable procurement trend analysis.';
  let volumeChangePercentage: number | null = null;
  let direction: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' = 'insufficient_data';

  if (summary.totalLots === 0) {
    trendDescription = 'No procurement records recorded in the selected filter timeframe.';
    direction = 'insufficient_data';
  } else if (!prevSummary || prevSummary.totalLots === 0) {
    trendDescription = `Current window records ${summary.totalLots} procurement lots (${summary.acceptedQuantity} Quintal). Insufficient prior window records for comparative trend calculation.`;
    direction = 'stable';
  } else {
    const prevVol = prevSummary.acceptedQuantity || 0;
    const currVol = summary.acceptedQuantity || 0;
    if (prevVol > 0) {
      const change = ((currVol - prevVol) / prevVol) * 100;
      volumeChangePercentage = Number(change.toFixed(1));
      if (change > 5) {
        direction = 'increasing';
        trendDescription = `Procurement volume has increased by ${volumeChangePercentage}% compared with the preceding equivalent timeframe (${currVol} vs ${prevVol} Qtl).`;
      } else if (change < -5) {
        direction = 'decreasing';
        trendDescription = `Procurement volume has decreased by ${Math.abs(volumeChangePercentage)}% compared with the preceding equivalent timeframe (${currVol} vs ${prevVol} Qtl).`;
      } else {
        direction = 'stable';
        trendDescription = `Procurement volume remains steady at ${currVol} Quintal, reflecting consistent farmer intake.`;
      }
    } else {
      direction = 'increasing';
      trendDescription = `Procurement volume expanded from 0 Quintal in the prior window to ${currVol} Quintal in this period.`;
    }
  }

  // Deterministic Fallback Synthesis
  const dominantCrop = cropBreakdown[0];
  let fallbackBrief = '';
  if (summary.totalLots === 0) {
    fallbackBrief = `No procurement activity recorded during ${rangeLabel}. System is ready to log new crop arrivals and quality inspections.`;
  } else {
    const dominantText = dominantCrop
      ? `${dominantCrop.cropName} represents the primary intake (${dominantCrop.percentageShare}% share, ${dominantCrop.volume} ${dominantCrop.unit}).`
      : '';
    const paymentText = summary.pendingLotsCount > 0
      ? `${summary.pendingLotsCount} settlements totaling ₹${summary.pendingAmount.toLocaleString('en-IN')} are awaiting staff authorization.`
      : 'All procurement lots in this period are settled in full.';
    const rejectionText = summary.rejectedQuantity > 0
      ? `Rejection rate stands at ${rejectionRatePercentage}%.`
      : 'Zero produce lots rejected.';

    fallbackBrief = `Recorded ${summary.totalLots} procurement lots totaling ₹${summary.totalValue.toLocaleString('en-IN')}. ${dominantText} ${rejectionText} ${paymentText}`;
  }

  const recommendations: Array<{ category: string; recommendation: string; priority: 'high' | 'medium' | 'low' }> = [];
  if (summary.pendingLotsCount > 0) {
    recommendations.push({
      category: 'Settlements',
      recommendation: `Expedite authorization for ${summary.pendingLotsCount} pending procurement disbursements (₹${summary.pendingAmount.toLocaleString('en-IN')}) to maintain farmer trust.`,
      priority: summary.pendingLotsCount > 3 ? 'high' : 'medium'
    });
  }
  if (rejectionRatePercentage > 15) {
    recommendations.push({
      category: 'Quality Control',
      recommendation: `Rejection rate (${rejectionRatePercentage}%) exceeds customary benchmark (10%). Verify moisture sensor calibration and inspect grain cleaning protocols.`,
      priority: 'high'
    });
  }
  if (summary.overallAvgMoisture && summary.overallAvgMoisture > 16) {
    recommendations.push({
      category: 'Storage & Drying',
      recommendation: `Average moisture level (${summary.overallAvgMoisture.toFixed(1)}%) is elevated. Ensure godown aerators and drying yards are operational before bagging.`,
      priority: 'medium'
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      category: 'Operational Routine',
      recommendation: 'Procurement acceptance, moisture readings, and payment timelines remain within optimal operational tolerances.',
      priority: 'low'
    });
  }

  const result: ProcurementIntelligenceResult = {
    isAiGenerated: true,
    source: 'deterministic_synthesis',
    status: 'fallback',
    generatedAt: new Date().toISOString(),
    hasSufficientData,
    filtersApplied: {
      rangeLabel,
      centre,
      staff
    },
    summaryMetrics: {
      totalLots: summary.totalLots,
      declaredQuantity: summary.declaredQuantity,
      acceptedQuantity: summary.acceptedQuantity,
      rejectedQuantity: summary.rejectedQuantity,
      rejectionRatePercentage,
      totalProcurementValue: summary.totalValue,
      paidAmount: summary.paidAmount,
      paidLotsCount: summary.paidLotsCount,
      pendingAmount: summary.pendingAmount,
      pendingLotsCount: summary.pendingLotsCount,
      overallAvgMoisture: summary.avgMoisture !== null && summary.avgMoisture !== undefined ? Number(summary.avgMoisture.toFixed(1)) : null,
      unit: 'Quintal'
    },
    cropBreakdown,
    gradeDistribution,
    centreActivity,
    trendAnalysis: {
      hasHistoricalComparison: hasSufficientData && prevSummary !== null,
      trendDescription,
      volumeChangePercentage,
      direction
    },
    executiveBrief: fallbackBrief,
    actionableRecommendations: recommendations
  };

  // If there are real records and Gemini is configured, enhance executiveBrief and recommendations with AI
  if (summary.totalLots > 0) {
    try {
      const ai = getGeminiClient();
      const prompt = `You are an expert Agricultural Procurement & Supply Chain Analyst at Krishi Seva Kendra.
Analyze these REAL procurement records retrieved directly from MongoDB:

Filters: ${rangeLabel} | Centre: ${centre} | Staff: ${staff}
Summary:
- Total Lots: ${summary.totalLots}
- Accepted Quantity: ${summary.acceptedQuantity} Quintal
- Rejected Quantity: ${summary.rejectedQuantity} Quintal (${rejectionRatePercentage}% rejection rate)
- Total Valuation: Rs. ${summary.totalValue}
- Paid Lots: ${summary.paidLotsCount} (Rs. ${summary.paidAmount})
- Pending Settlement Lots: ${summary.pendingLotsCount} (Rs. ${summary.pendingAmount})
- Average Moisture: ${result.summaryMetrics.overallAvgMoisture ?? 'Not recorded'}%

Crop Breakdown:
${cropBreakdown.map(c => `- ${c.cropName}: ${c.volume} ${c.unit} (${c.percentageShare}% volume, Rs. ${c.value}, avg rate: Rs. ${c.averageRate}/${c.unit}, avg moisture: ${c.avgMoisture ?? 'N/A'}%)`).join('\n')}

Quality Grades:
${gradeDistribution.map(g => `- ${g.grade}: ${g.lotsCount} lots (${g.acceptedQuantity} Qtl)`).join('\n')}

Trend Note: ${trendDescription}

Task:
Produce a concise, professional, grounded procurement intelligence brief and 2-3 advisory recommendations.
Return ONLY valid JSON matching this schema:
{
  "executiveBrief": "2-3 sentences summarizing volume, top crops, quality/rejections, and settlement dues strictly using these figures.",
  "recommendations": [
    { "category": "Settlements|Quality Control|Storage|Logistics", "recommendation": "Specific actionable recommendation", "priority": "high|medium|low" }
  ]
}

STRICT CONSTRAINTS:
- Use ONLY the provided numbers. Never hallucinate crop quantities, rates, or farmers.
- Never declare or guess official government MSP.
- Return ONLY valid raw JSON. No markdown backticks.`;

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
        if (parsed.executiveBrief) {
          result.executiveBrief = parsed.executiveBrief;
        }
        if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
          result.actionableRecommendations = parsed.recommendations;
        }
        result.source = 'gemini';
        result.status = 'success';
      }
    } catch (err: any) {
      console.warn('[ProcurementIntelligence] Gemini synthesis skipped, using deterministic output:', err.message);
      // Fallback remains completely populated and accurate
    }
  }

  cache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}
