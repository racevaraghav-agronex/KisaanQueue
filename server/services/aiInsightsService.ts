import { TokenModel } from '../models/Token.ts';
import { ProductModel } from '../models/Product.ts';
import { ProcurementModel } from '../models/Procurement.ts';
import { SaleModel } from '../models/Sale.ts';
import { ComplaintModel } from '../models/Complaint.ts';
import { BookingModel } from '../models/Booking.ts';
import { getGeminiClient } from './aiService.ts';
import { getCrowdIntelligence } from './crowdIntelligenceService.ts';

export interface AdminAiInsights {
  isAiGenerated: boolean;
  source: 'gemini' | 'deterministic_synthesis';
  status: 'success' | 'fallback';
  generatedAt: string;
  cacheTtlMinutes: number;
  executiveSummary: string;
  queueInsight: {
    title: string;
    summary: string;
    metricHighlight: string;
    status: 'optimal' | 'moderate' | 'pressure';
  };
  footfallInsight: {
    title: string;
    summary: string;
    metricHighlight: string;
    status: 'normal' | 'surge' | 'slow';
  };
  servicePerformanceInsight: {
    title: string;
    summary: string;
    metricHighlight: string;
    status: 'good' | 'attention_needed';
  };
  procurementInsight: {
    title: string;
    summary: string;
    metricHighlight: string;
    status: 'active' | 'quiet';
  };
  paymentInsight: {
    title: string;
    summary: string;
    metricHighlight: string;
    status: 'healthy' | 'attention_needed';
  };
  salesInsight: {
    title: string;
    summary: string;
    metricHighlight: string;
    status: 'steady' | 'high';
  };
  inventoryInsight: {
    title: string;
    summary: string;
    metricHighlight: string;
    status: 'stocked' | 'low_stock_warning';
  };
  complaintInsight: {
    title: string;
    summary: string;
    metricHighlight: string;
    status: 'clean' | 'pending_review';
  };
  recommendedActions: Array<{
    category: 'Queue' | 'Inventory' | 'Payment' | 'Complaints' | 'Procurement';
    action: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// In-memory cache for 5 minutes to respect Gemini quotas and Atlas Free Tier bandwidth
let cachedInsights: AdminAiInsights | null = null;
let lastInsightsTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function generateAdminAiInsights(forceRefresh = false): Promise<AdminAiInsights> {
  const now = Date.now();
  if (!forceRefresh && cachedInsights && (now - lastInsightsTimestamp < CACHE_TTL_MS)) {
    return cachedInsights;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // 1. Gather Real Data from MongoDB
  const [
    waitingTokensCount,
    servingTokensCount,
    todayCompletedCount,
    todayTokensCount,
    lowStockProducts,
    allProductsCount,
    todaySales,
    recentProcurements,
    openComplaintsCount,
    totalComplaintsCount,
    crowdData
  ] = await Promise.all([
    TokenModel.countDocuments({ status: 'waiting' }).catch(() => 0),
    TokenModel.countDocuments({ status: { $in: ['called', 'serving'] } }).catch(() => 0),
    TokenModel.countDocuments({ status: 'completed', completedAt: { $gte: todayStart } }).catch(() => 0),
    TokenModel.countDocuments({ issuedAt: { $gte: todayStart } }).catch(() => 0),
    ProductModel.find({ stock: { $lte: 10 }, isActive: true }).select('name stock minThreshold unit').lean().catch(() => []),
    ProductModel.countDocuments({ isActive: true }).catch(() => 0),
    SaleModel.find({ date: { $gte: todayStart } }).select('total paymentMethod').lean().catch(() => []),
    ProcurementModel.find({ createdAt: { $gte: thirtyDaysAgo } }).select('status pricing payment produce').lean().catch(() => []),
    ComplaintModel.countDocuments({ status: { $in: ['open', 'in_progress'] } }).catch(() => 0),
    ComplaintModel.countDocuments({}).catch(() => 0),
    getCrowdIntelligence(false).catch(() => null)
  ]);

  // Aggregate Sales
  const todaySalesRevenue = (todaySales || []).reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
  const todaySalesCount = (todaySales || []).length;

  // Aggregate Procurement & Payments
  let procurementTotalValue = 0;
  let pendingPaymentCount = 0;
  let pendingPaymentValue = 0;
  let paidPaymentValue = 0;

  for (const p of (recentProcurements || [])) {
    const netPayable = Number(p.pricing?.netPayable || 0);
    procurementTotalValue += netPayable;
    if (p.payment?.status === 'pending' || p.payment?.status === 'processing') {
      pendingPaymentCount += 1;
      pendingPaymentValue += Number(p.payment?.pendingAmount || netPayable || 0);
    } else if (p.payment?.status === 'paid') {
      paidPaymentValue += Number(p.payment?.paidAmount || netPayable || 0);
    }
  }

  // Top Low Stock Item
  const lowStockCount = (lowStockProducts || []).length;
  const criticalItem = lowStockProducts?.[0];

  // Raw structured metrics bundle for grounding
  const metricsContext = {
    currentWaitingTokens: waitingTokensCount,
    currentServingTokens: servingTokensCount,
    todayTokensIssued: todayTokensCount,
    todayTokensCompleted: todayCompletedCount,
    todaySalesRevenue,
    todaySalesCount,
    procurementRecordsCount: recentProcurements.length,
    procurementTotalValue,
    pendingPaymentCount,
    pendingPaymentValue,
    paidPaymentValue,
    totalCatalogProducts: allProductsCount,
    lowStockProductCount: lowStockCount,
    sampleLowStockItem: criticalItem ? `${criticalItem.name} (${criticalItem.stock} ${criticalItem.unit} remaining)` : 'None',
    openComplaints: openComplaintsCount,
    totalComplaints: totalComplaintsCount,
    crowdPressure: crowdData?.currentQueuePressure || 'Low',
    peakBusyHours: crowdData?.busyHoursText || 'Normal hours',
    topDemandedService: crowdData?.topDemandedService?.name || 'General Services',
    recentFootfallTrend: crowdData?.recentFootfallTrend?.trendDescription || 'Consistent traffic'
  };

  // Rule-based fallback insights (deterministic synthesis grounded purely in real numbers)
  const fallbackInsights: AdminAiInsights = {
    isAiGenerated: true,
    source: 'deterministic_synthesis',
    status: 'fallback',
    generatedAt: new Date().toISOString(),
    cacheTtlMinutes: 5,
    executiveSummary: `Kendra operations are active with ${waitingTokensCount} waiting farmer(s) and ${servingTokensCount} being served. Procurement payment ledger has ${pendingPaymentCount} pending transaction(s), and ${lowStockCount} input product(s) require inventory replenishment.`,
    queueInsight: {
      title: 'Real-time Queue Dynamics',
      summary: waitingTokensCount >= 5
        ? `Queue pressure is elevated with ${waitingTokensCount} farmers waiting. Priority allocation to high-demand counters is advised.`
        : `Queue load is manageable with ${waitingTokensCount} waiting farmer(s) and ${servingTokensCount} active at counters.`,
      metricHighlight: `${waitingTokensCount} Waiting / ${servingTokensCount} Serving`,
      status: waitingTokensCount >= 8 ? 'pressure' : waitingTokensCount >= 4 ? 'moderate' : 'optimal'
    },
    footfallInsight: {
      title: 'Footfall & Arrival Patterns',
      summary: crowdData?.busyHoursText?.includes('Peak')
        ? `Historical peak arrival concentrates around ${crowdData.busyHoursText}. Staff preparedness recommended during this band.`
        : `Arrivals are uniformly distributed. ${crowdData?.recentFootfallTrend?.trendDescription || 'Traffic remains standard.'}`,
      metricHighlight: `${todayTokensCount} Tokens Today`,
      status: crowdData?.currentQueuePressure === 'High' ? 'surge' : 'normal'
    },
    servicePerformanceInsight: {
      title: 'Service Demand Breakdown',
      summary: crowdData?.topDemandedService
        ? `${crowdData.topDemandedService.name} accounts for ${crowdData.topDemandedService.percentage}% of recent farmer requests.`
        : 'Service requests are evenly distributed across available Kendra services.',
      metricHighlight: crowdData?.topDemandedService?.name || 'Standard Distribution',
      status: 'good'
    },
    procurementInsight: {
      title: 'Crop Procurement Overview',
      summary: recentProcurements.length > 0
        ? `${recentProcurements.length} procurement lot(s) processed recently totaling ₹${procurementTotalValue.toLocaleString('en-IN')}.`
        : 'No recent procurement lots submitted. Weighbridge counter is on standby.',
      metricHighlight: `₹${procurementTotalValue.toLocaleString('en-IN')} Total Value`,
      status: recentProcurements.length > 0 ? 'active' : 'quiet'
    },
    paymentInsight: {
      title: 'Farmer Payment Settlement',
      summary: pendingPaymentCount > 0
        ? `${pendingPaymentCount} procurement payment(s) valued at ₹${pendingPaymentValue.toLocaleString('en-IN')} are pending administrative disbursement.`
        : 'All verified procurement payouts have been settled. No backlogs detected.',
      metricHighlight: `₹${pendingPaymentValue.toLocaleString('en-IN')} Pending (${pendingPaymentCount} Records)`,
      status: pendingPaymentCount > 3 ? 'attention_needed' : 'healthy'
    },
    salesInsight: {
      title: 'Retail POS & Input Sales',
      summary: todaySalesCount > 0
        ? `Generated ₹${todaySalesRevenue.toLocaleString('en-IN')} across ${todaySalesCount} retail cash memo(s) today.`
        : 'No retail sales transactions logged yet for today.',
      metricHighlight: `₹${todaySalesRevenue.toLocaleString('en-IN')} (${todaySalesCount} Bills)`,
      status: todaySalesRevenue > 5000 ? 'high' : 'steady'
    },
    inventoryInsight: {
      title: 'Stock Health & Thresholds',
      summary: lowStockCount > 0
        ? `${lowStockCount} product(s) are at or below minimum threshold (${criticalItem ? criticalItem.name : 'Key inputs'}). Consider raising purchase orders.`
        : `All ${allProductsCount} catalog products are currently above minimum safety thresholds.`,
      metricHighlight: `${lowStockCount} Low Stock Alert(s)`,
      status: lowStockCount > 0 ? 'low_stock_warning' : 'stocked'
    },
    complaintInsight: {
      title: 'Farmer Redressal & Helpdesk',
      summary: openComplaintsCount > 0
        ? `${openComplaintsCount} complaint ticket(s) are pending review out of ${totalComplaintsCount} total submissions.`
        : 'All farmer grievances and inquiries have been addressed and resolved.',
      metricHighlight: `${openComplaintsCount} Open Grievances`,
      status: openComplaintsCount > 0 ? 'pending_review' : 'clean'
    },
    recommendedActions: [
      ...(lowStockCount > 0
        ? [{
            category: 'Inventory' as const,
            action: `Initiate purchase replenishment for ${criticalItem?.name || 'low-stock inputs'} (${criticalItem?.stock || 0} left).`,
            priority: 'high' as const
          }]
        : []),
      ...(pendingPaymentCount > 0
        ? [{
            category: 'Payment' as const,
            action: `Review and approve ${pendingPaymentCount} pending procurement payment(s) totaling ₹${pendingPaymentValue.toLocaleString('en-IN')}.`,
            priority: 'high' as const
          }]
        : []),
      ...(waitingTokensCount >= 6
        ? [{
            category: 'Queue' as const,
            action: `Queue volume is elevated (${waitingTokensCount} waiting). Consider deploying an auxiliary counter for ${crowdData?.topDemandedService?.name || 'high demand services'}.`,
            priority: 'medium' as const
          }]
        : []),
      ...(openComplaintsCount > 0
        ? [{
            category: 'Complaints' as const,
            action: `Assign staff to address ${openComplaintsCount} unresolved farmer feedback ticket(s).`,
            priority: 'medium' as const
          }]
        : [])
    ]
  };

  // If no recommended actions were generated by alerts, provide a maintenance recommendation
  if (fallbackInsights.recommendedActions.length === 0) {
    fallbackInsights.recommendedActions.push({
      category: 'Queue',
      action: 'Maintain active counter schedule and verify that weighbridge calibration records remain current.',
      priority: 'low'
    });
  }

  // Attempt to call Gemini for sophisticated executive synthesis if API key is present
  try {
    const ai = getGeminiClient();

    const prompt = `You are the chief operations analyst for Krishi Seva Kendra (Agricultural Public Service & Procurement Center).
Analyze these verified Kendra operational metrics from MongoDB:
${JSON.stringify(metricsContext, null, 2)}

Provide a concise, professional, grounded operational analysis strictly respecting these metrics.
Format your output as a valid JSON object matching this schema:
{
  "executiveSummary": "1-2 sentences summarizing overall center state.",
  "queueSummary": "1 sentence on current queue load and waiting farmers.",
  "footfallSummary": "1 sentence on peak hours and arrival patterns.",
  "servicePerformanceSummary": "1 sentence on service demand.",
  "procurementSummary": "1 sentence on procurement lots and value.",
  "paymentSummary": "1 sentence on pending vs paid settlements.",
  "salesSummary": "1 sentence on retail input sales.",
  "inventorySummary": "1 sentence on inventory and low stock items.",
  "complaintSummary": "1 sentence on grievance resolution status.",
  "recommendations": [
    { "category": "Queue|Inventory|Payment|Complaints|Procurement", "action": "Specific recommendation", "priority": "high|medium|low" }
  ]
}

STRICT DIRECTIVES:
- Only use the provided metrics. Never hallucinate numbers.
- Return ONLY valid raw JSON. No markdown formatting, no code fences.`;

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

      const geminiInsights: AdminAiInsights = {
        ...fallbackInsights,
        isAiGenerated: true,
        source: 'gemini',
        status: 'success',
        executiveSummary: parsed.executiveSummary || fallbackInsights.executiveSummary,
        queueInsight: {
          ...fallbackInsights.queueInsight,
          summary: parsed.queueSummary || fallbackInsights.queueInsight.summary
        },
        footfallInsight: {
          ...fallbackInsights.footfallInsight,
          summary: parsed.footfallSummary || fallbackInsights.footfallInsight.summary
        },
        servicePerformanceInsight: {
          ...fallbackInsights.servicePerformanceInsight,
          summary: parsed.servicePerformanceSummary || fallbackInsights.servicePerformanceInsight.summary
        },
        procurementInsight: {
          ...fallbackInsights.procurementInsight,
          summary: parsed.procurementSummary || fallbackInsights.procurementInsight.summary
        },
        paymentInsight: {
          ...fallbackInsights.paymentInsight,
          summary: parsed.paymentSummary || fallbackInsights.paymentInsight.summary
        },
        salesInsight: {
          ...fallbackInsights.salesInsight,
          summary: parsed.salesSummary || fallbackInsights.salesInsight.summary
        },
        inventoryInsight: {
          ...fallbackInsights.inventoryInsight,
          summary: parsed.inventorySummary || fallbackInsights.inventoryInsight.summary
        },
        complaintInsight: {
          ...fallbackInsights.complaintInsight,
          summary: parsed.complaintSummary || fallbackInsights.complaintInsight.summary
        },
        recommendedActions: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
          ? parsed.recommendations.map((r: any) => ({
              category: r.category || 'Queue',
              action: r.action || '',
              priority: r.priority || 'medium'
            }))
          : fallbackInsights.recommendedActions
      };

      cachedInsights = geminiInsights;
      lastInsightsTimestamp = now;
      return geminiInsights;
    }
  } catch (err: any) {
    console.warn('[AI Insights] Gemini synthesis failed or rate-limited, serving deterministic insights:', err?.message || err);
  }

  cachedInsights = fallbackInsights;
  lastInsightsTimestamp = now;
  return fallbackInsights;
}
