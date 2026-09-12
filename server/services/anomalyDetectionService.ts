import { TokenModel } from '../models/Token.ts';
import { ProcurementModel } from '../models/Procurement.ts';
import { ProductModel } from '../models/Product.ts';
import { SaleModel } from '../models/Sale.ts';
import { PurchaseModel } from '../models/Purchase.ts';
import { StockMovementModel } from '../models/StockMovement.ts';
import { ComplaintModel } from '../models/Complaint.ts';
import { getGeminiClient } from './aiService.ts';

export interface AnomalyFilterOptions {
  fromDate?: Date;
  toDate?: Date;
  rangeLabel?: string;
  centre?: string;
  staff?: string;
  forceRefresh?: boolean;
}

export type AnomalyCategory = 'QUEUE' | 'PROCUREMENT' | 'INVENTORY' | 'SALES' | 'COMPLAINTS';
export type AnomalySeverity = 'high' | 'medium' | 'low';

export interface OperationalAnomaly {
  id: string;
  category: AnomalyCategory;
  title: string;
  description: string;
  affectedEntity: string;
  observedValue: string;
  baseline: string;
  severity: AnomalySeverity;
  recommendedAction: string;
  detectedAt: string;
}

export interface AnomalyDetectionResult {
  isAiGenerated: boolean;
  source: 'gemini' | 'deterministic_synthesis';
  status: 'success' | 'fallback';
  generatedAt: string;
  overallStatus: 'normal' | 'review_recommended' | 'critical_attention';
  filtersApplied: {
    rangeLabel: string;
    centre: string;
    staff: string;
  };
  totalAnomaliesCount: number;
  severityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  categoryBreakdown: Record<AnomalyCategory, number>;
  anomalies: OperationalAnomaly[];
  executiveBrief: string;
}

// In-memory cache with 3-minute TTL
interface CacheEntry {
  timestamp: number;
  data: AnomalyDetectionResult;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000;

export async function detectOperationalAnomalies(
  options: AnomalyFilterOptions = {}
): Promise<AnomalyDetectionResult> {
  const now = new Date();
  const fromDate = options.fromDate || new Date(now.getTime() - 7 * 86400000);
  const toDate = options.toDate || now;
  const rangeLabel = options.rangeLabel || 'Last 7 Days';
  const centre = options.centre || 'ALL';
  const staff = options.staff || 'ALL';
  const forceRefresh = !!options.forceRefresh;

  const cacheKey = `anom_${fromDate.getTime()}_${toDate.getTime()}_${centre}_${staff}`;
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // Build match filters
  const tokenMatch: any = { issuedAt: { $gte: fromDate, $lte: toDate } };
  if (centre !== 'ALL') tokenMatch.centre = centre;
  if (staff !== 'ALL') tokenMatch.staffName = staff;

  const procMatch: any = { createdAt: { $gte: fromDate, $lte: toDate } };
  if (centre !== 'ALL') procMatch.centre = centre;
  if (staff !== 'ALL') {
    procMatch.$or = [
      { 'arrival.verifiedByStaffName': staff },
      { 'weighment.weighedByStaffName': staff },
      { 'decision.decidedByStaffName': staff }
    ];
  }

  const saleMatch: any = { date: { $gte: fromDate, $lte: toDate } };
  if (staff !== 'ALL') saleMatch.staffName = staff;

  const purchaseMatch: any = { date: { $gte: fromDate, $lte: toDate } };
  const complaintMatch: any = { createdAt: { $gte: fromDate, $lte: toDate } };

  // Concurrently gather operational records from all five domains
  const [
    tokens,
    procurements,
    products,
    stockMovements,
    sales,
    purchases,
    complaints
  ] = await Promise.all([
    TokenModel.find(tokenMatch).lean(),
    ProcurementModel.find(procMatch).lean(),
    ProductModel.find({ isActive: { $ne: false } }).lean(),
    StockMovementModel.find({ date: { $gte: fromDate, $lte: toDate } }).sort({ date: -1 }).lean(),
    SaleModel.find(saleMatch).lean(),
    PurchaseModel.find(purchaseMatch).lean(),
    ComplaintModel.find(complaintMatch).lean()
  ]);

  const anomalies: OperationalAnomaly[] = [];

  // =========================================================================
  // DOMAIN A: QUEUE ANOMALY CHECKS
  // =========================================================================
  if (tokens.length >= 4) {
    const totalTokens = tokens.length;
    const cancelledTokens = tokens.filter((t: any) => t.status === 'cancelled');
    const cancellationRate = (cancelledTokens.length / totalTokens) * 100;

    // 1. Unusually high cancellation rate (if >= 25% with at least 2 cancellations)
    if (cancellationRate >= 25 && cancelledTokens.length >= 2) {
      anomalies.push({
        id: `queue_cancellation_${fromDate.getTime()}`,
        category: 'QUEUE',
        title: 'Unusual Token Cancellation Rate Detected',
        description: `Observed ${cancelledTokens.length} cancellations out of ${totalTokens} tokens issued (${cancellationRate.toFixed(1)}%). Unusual activity detected. Administrative review recommended.`,
        affectedEntity: 'Token Registration & Waiting Hall',
        observedValue: `${cancellationRate.toFixed(1)}% cancellation rate (${cancelledTokens.length} tokens)`,
        baseline: 'Standard tolerance: <= 10.0% cancellation rate',
        severity: cancellationRate >= 40 ? 'high' : 'medium',
        recommendedAction: 'Review waiting time durations and counter dispatch logs during high cancellation hours.',
        detectedAt: new Date().toISOString()
      });
    }

    // 2. Unusually long service duration
    const completedWithDuration = tokens.filter(
      (t: any) => t.status === 'completed' && t.servedAt && t.completedAt
    );
    if (completedWithDuration.length > 0) {
      const durations = completedWithDuration.map((t: any) => ({
        tokenNumber: t.tokenNumber,
        serviceName: t.serviceName,
        counterNumber: t.counterNumber,
        mins: Math.round((new Date(t.completedAt).getTime() - new Date(t.servedAt).getTime()) / 60000)
      }));

      const avgMins = Math.round(
        durations.reduce((acc: number, d: any) => acc + d.mins, 0) / durations.length
      );
      const longServices = durations.filter((d: any) => d.mins > Math.max(avgMins * 2.5, 45));

      if (longServices.length > 0) {
        const topLong = longServices[0];
        anomalies.push({
          id: `queue_duration_${topLong.tokenNumber}`,
          category: 'QUEUE',
          title: 'Extended Desk Service Duration Detected',
          description: `Token ${topLong.tokenNumber} (${topLong.serviceName}) registered an active service duration of ${topLong.mins} minutes. Unusual activity detected. Administrative review recommended.`,
          affectedEntity: topLong.counterNumber ? `Counter ${topLong.counterNumber}` : topLong.serviceName,
          observedValue: `${topLong.mins} minutes service duration`,
          baseline: `Average service time for session: ${avgMins} minutes`,
          severity: topLong.mins >= 60 ? 'high' : 'medium',
          recommendedAction: 'Assess workflow complexity, document verification steps, or software connectivity at the specific desk.',
          detectedAt: new Date().toISOString()
        });
      }
    }

    // 3. Hourly Queue Spike
    const hourlyCounts: Record<number, number> = {};
    for (const t of tokens) {
      if (t.issuedAt) {
        const hour = new Date(t.issuedAt).getHours();
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
      }
    }
    const hoursRecorded = Object.keys(hourlyCounts).length;
    if (hoursRecorded >= 3) {
      const avgPerHour = totalTokens / hoursRecorded;
      for (const [hourStr, count] of Object.entries(hourlyCounts)) {
        if (count >= avgPerHour * 3 && count >= 8) {
          const hr = Number(hourStr);
          anomalies.push({
            id: `queue_spike_h${hr}`,
            category: 'QUEUE',
            title: 'Abnormal Hourly Arrival Surge',
            description: `Sudden influx of ${count} farmer arrivals recorded between ${hr}:00 and ${hr + 1}:00. Unusual activity detected. Administrative review recommended.`,
            affectedEntity: `Time Window ${hr}:00 - ${hr + 1}:00`,
            observedValue: `${count} arrivals in single hour`,
            baseline: `Average arrival volume: ${Math.round(avgPerHour)} tokens/hour`,
            severity: count >= 15 ? 'high' : 'medium',
            recommendedAction: 'Deploy auxiliary counter during surge windows and ensure slot booking limits are calibrated.',
            detectedAt: new Date().toISOString()
          });
          break; // Flag top surge only to avoid noise
        }
      }
    }
  }

  // =========================================================================
  // DOMAIN B: PROCUREMENT ANOMALY CHECKS
  // =========================================================================
  if (procurements.length > 0) {
    let totalAccepted = 0;
    let totalRejected = 0;
    const highMoistureLots: any[] = [];
    const delayedSettlements: any[] = [];

    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);

    for (const p of procurements) {
      const acc = Number(p.decision?.acceptedQuantity || 0);
      const rej = Number(p.decision?.rejectedQuantity || 0);
      totalAccepted += acc;
      totalRejected += rej;

      // Check for elevated moisture (> 18%)
      const moisture = Number(p.quality?.moisturePercentage);
      if (!isNaN(moisture) && moisture > 18) {
        highMoistureLots.push({
          lotNumber: p.procurementNumber,
          cropName: p.produce?.cropName || 'Grain',
          moisture
        });
      }

      // Check for settlement delay (completed procurement pending payment for > 3 days)
      if (
        p.status === 'COMPLETED' &&
        p.payment?.status === 'PENDING' &&
        new Date(p.createdAt) < threeDaysAgo
      ) {
        const daysPending = Math.round((now.getTime() - new Date(p.createdAt).getTime()) / 86400000);
        delayedSettlements.push({
          lotNumber: p.procurementNumber,
          farmerName: p.farmerName,
          amount: p.pricing?.netPayable || 0,
          daysPending
        });
      }
    }

    // 1. High rejection percentage (if rejected > 20% of total produce with at least 1 rejected lot)
    const totalProduce = totalAccepted + totalRejected;
    if (totalProduce > 0 && totalRejected > 0) {
      const rejectionPct = (totalRejected / totalProduce) * 100;
      if (rejectionPct >= 20) {
        anomalies.push({
          id: `proc_rejection_${fromDate.getTime()}`,
          category: 'PROCUREMENT',
          title: 'Unusually Elevated Produce Rejection Rate',
          description: `Cumulative rejection rate across lots in this timeframe reached ${rejectionPct.toFixed(1)}% (${totalRejected} Quintal rejected). Unusual activity detected. Administrative review recommended.`,
          affectedEntity: 'Quality Grading Station',
          observedValue: `${rejectionPct.toFixed(1)}% rejection (${totalRejected} Qtl)`,
          baseline: 'Target allowable rejection threshold: <= 10.0%',
          severity: rejectionPct >= 35 ? 'high' : 'medium',
          recommendedAction: 'Verify sample probe grading logs and examine whether grain moisture or dockage criteria require cross-verification.',
          detectedAt: new Date().toISOString()
        });
      }
    }

    // 2. High Moisture Lot Alert
    if (highMoistureLots.length > 0) {
      const topMoist = highMoistureLots[0];
      anomalies.push({
        id: `proc_moisture_${topMoist.lotNumber}`,
        category: 'PROCUREMENT',
        title: 'Elevated Grain Moisture Content Flagged',
        description: `Procurement lot ${topMoist.lotNumber} (${topMoist.cropName}) recorded moisture of ${topMoist.moisture}%. Unusual activity detected. Administrative review recommended.`,
        affectedEntity: `Lot ${topMoist.lotNumber} (${topMoist.cropName})`,
        observedValue: `${topMoist.moisture}% moisture content`,
        baseline: 'Permissible safe warehousing moisture: <= 14.0%',
        severity: topMoist.moisture >= 20 ? 'high' : 'medium',
        recommendedAction: 'Mandate immediate sun-drying or godown aeration before bag stacking to prevent fungal spoilage.',
        detectedAt: new Date().toISOString()
      });
    }

    // 3. Settlement Delays Alert
    if (delayedSettlements.length > 0) {
      const totalDelayedAmt = delayedSettlements.reduce((sum: number, s: any) => sum + s.amount, 0);
      anomalies.push({
        id: `proc_settlement_delays_${fromDate.getTime()}`,
        category: 'PROCUREMENT',
        title: 'Pending Farmer Settlement Overdue',
        description: `${delayedSettlements.length} completed procurement lot(s) totaling ₹${totalDelayedAmt.toLocaleString('en-IN')} remain in PENDING status past the standard 72-hour window. Unusual activity detected. Administrative review recommended.`,
        affectedEntity: `${delayedSettlements.length} Procurement Lots`,
        observedValue: `${delayedSettlements[0].daysPending} days pending disbursement`,
        baseline: 'Direct Benefit Transfer standard window: <= 72 hours (3 days)',
        severity: 'high',
        recommendedAction: 'Verify bank account credentials and authorize pending payment batches via the accounting module.',
        detectedAt: new Date().toISOString()
      });
    }
  }

  // =========================================================================
  // DOMAIN C: INVENTORY ANOMALY CHECKS
  // =========================================================================
  // 1. Critical Out of Stock for high-demand item
  const outOfStockItems = products.filter((p: any) => Number(p.stock || 0) <= 0);
  if (outOfStockItems.length > 0) {
    const topItem = outOfStockItems[0];
    anomalies.push({
      id: `inv_stockout_${topItem.code}`,
      category: 'INVENTORY',
      title: 'Complete Depletion of Catalog Inventory',
      description: `Product ${topItem.name} (${topItem.code}) currently holds 0 units in stock. Unusual activity detected. Administrative review recommended.`,
      affectedEntity: topItem.name,
      observedValue: `0 ${topItem.unit || 'units'} stock level`,
      baseline: `Minimum designated buffer: ${topItem.minThreshold || 10} ${topItem.unit || 'units'}`,
      severity: 'high',
      recommendedAction: 'Initiate vendor purchase order and update expected arrival ETA for visiting farmers.',
      detectedAt: new Date().toISOString()
    });
  }

  // 2. Large Manual Stock Adjustment
  const manualAdjustments = stockMovements.filter((m: any) => m.type === 'adjustment');
  const largeAdjustment = manualAdjustments.find(
    (m: any) => Math.abs(Number(m.quantity || 0)) >= 25
  );
  if (largeAdjustment) {
    anomalies.push({
      id: `inv_adj_${largeAdjustment._id}`,
      category: 'INVENTORY',
      title: 'Large Manual Stock Register Adjustment',
      description: `Manual adjustment of ${largeAdjustment.quantity} ${largeAdjustment.productName} units recorded by staff member "${largeAdjustment.performedBy}". Unusual activity detected. Administrative review recommended.`,
      affectedEntity: largeAdjustment.productName,
      observedValue: `${largeAdjustment.quantity > 0 ? '+' : ''}${largeAdjustment.quantity} units adjusted manually`,
      baseline: 'Standard physical count correction threshold: <= 5 units',
      severity: 'medium',
      recommendedAction: 'Verify physical stock register count slip and audit notes recorded by the warehouse supervisor.',
      detectedAt: new Date().toISOString()
    });
  }

  // =========================================================================
  // DOMAIN D: SALES ANOMALY CHECKS
  // =========================================================================
  if (sales.length > 0) {
    // 1. Unusual Discount Given (> 15% discount)
    const highDiscountSale = sales.find((s: any) => {
      const subtotal = Number(s.subtotal || 0);
      const discount = Number(s.discount || 0);
      return subtotal > 0 && (discount / subtotal) > 0.15;
    });

    if (highDiscountSale) {
      const pct = Math.round((highDiscountSale.discount / highDiscountSale.subtotal) * 100);
      anomalies.push({
        id: `sale_discount_${highDiscountSale.invoiceNumber}`,
        category: 'SALES',
        title: 'High Promotional Discount on POS Invoice',
        description: `Invoice ${highDiscountSale.invoiceNumber} applied a discount of ₹${highDiscountSale.discount} (${pct}% of subtotal ₹${highDiscountSale.subtotal}). Unusual activity detected. Administrative review recommended.`,
        affectedEntity: `Invoice ${highDiscountSale.invoiceNumber}`,
        observedValue: `₹${highDiscountSale.discount} discount (${pct}%)`,
        baseline: 'Standard counter concession limit: <= 5.0% without admin approval',
        severity: 'medium',
        recommendedAction: 'Review transaction justification and ensure authorized scheme documentation is attached.',
        detectedAt: new Date().toISOString()
      });
    }

    // 2. Abnormally large single sale (> 4x average sale size)
    const totalRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
    const avgSale = Math.round(totalRevenue / sales.length);
    if (sales.length >= 3) {
      const largeSale = sales.find((s: any) => Number(s.total || 0) >= Math.max(avgSale * 4, 15000));
      if (largeSale) {
        anomalies.push({
          id: `sale_surge_${largeSale.invoiceNumber}`,
          category: 'SALES',
          title: 'High-Value Single POS Transaction',
          description: `Invoice ${largeSale.invoiceNumber} recorded a purchase value of ₹${largeSale.total.toLocaleString('en-IN')}. Unusual activity detected. Administrative review recommended.`,
          affectedEntity: `Farmer: ${largeSale.farmerName || 'Counter Buyer'}`,
          observedValue: `₹${largeSale.total.toLocaleString('en-IN')} single receipt`,
          baseline: `Average counter transaction size: ₹${avgSale.toLocaleString('en-IN')}`,
          severity: 'low',
          recommendedAction: 'Verify input quota allocation per landholding to comply with bulk sale subsidy guidelines.',
          detectedAt: new Date().toISOString()
        });
      }
    }
  }

  // =========================================================================
  // DOMAIN E: COMPLAINTS & GRIEVANCE ANOMALIES
  // =========================================================================
  if (complaints.length > 0) {
    const openComplaints = complaints.filter(
      (c: any) => c.status === 'pending' || c.status === 'in_progress'
    );
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const agedComplaints = openComplaints.filter((c: any) => new Date(c.createdAt) < sevenDaysAgo);

    if (agedComplaints.length > 0) {
      anomalies.push({
        id: `complaint_aging_${fromDate.getTime()}`,
        category: 'COMPLAINTS',
        title: 'Unresolved Farmer Grievance Aging Exceeded',
        description: `${agedComplaints.length} complaint(s) remain open for more than 7 days without final resolution. Unusual activity detected. Administrative review recommended.`,
        affectedEntity: `${agedComplaints.length} Pending Grievance(s)`,
        observedValue: `${agedComplaints.length} tickets unresolved past 7 days`,
        baseline: 'Mandated Citizen Charter resolution deadline: <= 5 working days',
        severity: 'high',
        recommendedAction: 'Assign designated center officer to contact complainant farmers and log resolution remarks.',
        detectedAt: new Date().toISOString()
      });
    } else if (openComplaints.length >= 4) {
      anomalies.push({
        id: `complaint_volume_${fromDate.getTime()}`,
        category: 'COMPLAINTS',
        title: 'Grievance Accumulation Alert',
        description: `${openComplaints.length} open complaints currently awaiting action in this period. Unusual activity detected. Administrative review recommended.`,
        affectedEntity: 'Citizen Feedback Desk',
        observedValue: `${openComplaints.length} open complaints`,
        baseline: 'Normal concurrent active complaints: <= 2 tickets',
        severity: 'medium',
        recommendedAction: 'Schedule an administrative review session to resolve pending farmer tickets.',
        detectedAt: new Date().toISOString()
      });
    }
  }

  // Breakdown metrics
  const categoryBreakdown: Record<AnomalyCategory, number> = {
    QUEUE: 0,
    PROCUREMENT: 0,
    INVENTORY: 0,
    SALES: 0,
    COMPLAINTS: 0
  };
  const severityBreakdown = { high: 0, medium: 0, low: 0 };

  for (const anom of anomalies) {
    categoryBreakdown[anom.category] = (categoryBreakdown[anom.category] || 0) + 1;
    severityBreakdown[anom.severity] = (severityBreakdown[anom.severity] || 0) + 1;
  }

  // Overall status
  let overallStatus: 'normal' | 'review_recommended' | 'critical_attention' = 'normal';
  if (severityBreakdown.high > 0) {
    overallStatus = 'critical_attention';
  } else if (anomalies.length > 0) {
    overallStatus = 'review_recommended';
  }

  // Deterministic summary brief
  let fallbackBrief = '';
  if (anomalies.length === 0) {
    fallbackBrief = 'All operational parameters across queue, procurement, inventory, sales, and complaints are operating within standard tolerance thresholds.';
  } else {
    fallbackBrief = `Detected ${anomalies.length} operational variance(s) requiring administrative review across ${Object.entries(categoryBreakdown).filter(([_, count]) => count > 0).map(([cat, count]) => `${cat} (${count})`).join(', ')}. All checks grounded in verified MongoDB records.`;
  }

  const result: AnomalyDetectionResult = {
    isAiGenerated: true,
    source: 'deterministic_synthesis',
    status: 'fallback',
    generatedAt: new Date().toISOString(),
    overallStatus,
    filtersApplied: {
      rangeLabel,
      centre,
      staff
    },
    totalAnomaliesCount: anomalies.length,
    severityBreakdown,
    categoryBreakdown,
    anomalies,
    executiveBrief: fallbackBrief
  };

  // Enhance executive brief with Gemini if anomalies exist
  if (anomalies.length > 0) {
    try {
      const ai = getGeminiClient();
      const prompt = `You are the lead compliance & operations auditor for Krishi Seva Kendra (Kisan Queue Center).
Analyze these factual anomalies detected in MongoDB records:

Filters: ${rangeLabel} | Centre: ${centre} | Staff: ${staff}
Detected Variance Count: ${anomalies.length}
High Severity: ${severityBreakdown.high} | Medium: ${severityBreakdown.medium} | Low: ${severityBreakdown.low}

Specific Variances:
${anomalies.map(a => `- [${a.severity.toUpperCase()}] [${a.category}] ${a.title}: ${a.description} (Observed: ${a.observedValue} vs Baseline: ${a.baseline})`).join('\n')}

Task:
Produce a single, professional, neutral executive summary (2-3 sentences) summarizing these operational variances and guiding the administrator.
Return ONLY valid JSON matching this schema:
{
  "executiveBrief": "Neutral 2-3 sentence overview highlighting areas needing supervisory attention without accusatory language."
}

STRICT CONSTRAINTS:
- Do NOT accuse anyone of fraud, theft, misconduct or wrongdoing. Use neutral, objective compliance terminology.
- Use ONLY the provided details. Never invent other anomalies.
- Return ONLY valid raw JSON. No markdown fences.`;

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
        result.source = 'gemini';
        result.status = 'success';
      }
    } catch (err: any) {
      console.warn('[AnomalyDetection] Gemini synthesis skipped, using deterministic output:', err.message);
    }
  }

  cache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}
