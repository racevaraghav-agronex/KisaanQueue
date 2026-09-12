import { ProductModel } from '../models/Product.ts';
import { SaleModel } from '../models/Sale.ts';
import { PurchaseModel } from '../models/Purchase.ts';
import { StockMovementModel } from '../models/StockMovement.ts';
import { getGeminiClient } from './aiService.ts';

export interface InventoryFilterOptions {
  fromDate?: Date;
  toDate?: Date;
  rangeLabel?: string;
  staff?: string;
  forceRefresh?: boolean;
}

export interface ProductMovementVelocity {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  unit: string;
  salesQuantity: number;
  salesRevenue: number;
  salesVelocityPerDay: number;
  purchasedQuantity: number;
  purchasedCost: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  movementClassification: 'fast_moving' | 'normal' | 'slow_moving' | 'zero_movement';
  isReorderUrgent: boolean;
  isApproachingReorder: boolean;
}

export interface InventoryIntelligenceResult {
  isAiGenerated: boolean;
  source: 'gemini' | 'deterministic_synthesis';
  status: 'success' | 'fallback';
  generatedAt: string;
  filtersApplied: {
    rangeLabel: string;
    staff: string;
  };
  metrics: {
    totalCatalogItems: number;
    totalStockUnits: number;
    stockOutCount: number;
    lowStockCount: number;
    approachingReorderCount: number;
    totalSalesUnits: number;
    totalSalesRevenue: number;
    totalPurchasedUnits: number;
    totalPurchaseCost: number;
    netStockMovementUnits: number; // purchased - sold
    manualAdjustmentsCount: number;
    manualAdjustmentsNetUnits: number;
  };
  fastMovingProducts: ProductMovementVelocity[];
  slowMovingProducts: ProductMovementVelocity[];
  stockRiskAlerts: Array<{
    code: string;
    name: string;
    category: string;
    currentStock: number;
    minThreshold: number;
    unit: string;
    urgency: 'critical_out_of_stock' | 'below_threshold' | 'approaching_reorder';
    recommendedReorderTarget: number;
  }>;
  categoryMovement: Array<{
    category: string;
    totalItems: number;
    currentStockUnits: number;
    soldUnits: number;
    soldRevenue: number;
    purchasedUnits: number;
  }>;
  recentManualAdjustments: Array<{
    productName: string;
    type: string;
    quantity: number;
    resultingStock: number;
    performedBy: string;
    notes: string;
    date: string;
  }>;
  executiveBrief: string;
  advisoryRecommendations: Array<{
    category: 'Reorder' | 'Procurement' | 'Slow Inventory' | 'Stock Audit';
    productOrGroup: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// In-memory cache with 3-minute TTL
interface CacheEntry {
  timestamp: number;
  data: InventoryIntelligenceResult;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000;

export async function getInventoryIntelligence(
  options: InventoryFilterOptions = {}
): Promise<InventoryIntelligenceResult> {
  const now = new Date();
  const fromDate = options.fromDate || new Date(now.getTime() - 7 * 86400000);
  const toDate = options.toDate || now;
  const rangeLabel = options.rangeLabel || 'Last 7 Days';
  const staff = options.staff || 'ALL';
  const forceRefresh = !!options.forceRefresh;

  const cacheKey = `inv_${fromDate.getTime()}_${toDate.getTime()}_${staff}`;
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // Days in range for velocity calculation (minimum 1 day to avoid divide by zero)
  const rangeDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000));

  // Build match filters
  const saleMatch: any = { date: { $gte: fromDate, $lte: toDate } };
  if (staff !== 'ALL') {
    saleMatch.staffName = staff;
  }
  const purchaseMatch: any = { date: { $gte: fromDate, $lte: toDate } };
  const adjustmentMatch: any = {
    date: { $gte: fromDate, $lte: toDate },
    type: 'adjustment'
  };

  // Run database queries concurrently
  const [
    allProducts,
    salesByItemAgg,
    purchasesByItemAgg,
    categorySalesAgg,
    manualAdjustments
  ] = await Promise.all([
    ProductModel.find({ isActive: { $ne: false } }).lean(),
    SaleModel.aggregate([
      { $match: saleMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $ifNull: ['$items.productId', '$items.productCode'] },
          productCode: { $first: '$items.productCode' },
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.amount' },
          transactionsCount: { $sum: 1 }
        }
      }
    ]),
    PurchaseModel.aggregate([
      { $match: purchaseMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $ifNull: ['$items.productId', '$items.productCode'] },
          productCode: { $first: '$items.productCode' },
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalCost: { $sum: '$items.amount' }
        }
      }
    ]),
    SaleModel.aggregate([
      { $match: saleMatch },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productCode',
          foreignField: 'code',
          as: 'productDoc'
        }
      },
      {
        $project: {
          category: {
            $ifNull: [{ $arrayElemAt: ['$productDoc.category', 0] }, 'Fertilizer']
          },
          quantity: '$items.quantity',
          amount: '$items.amount'
        }
      },
      {
        $group: {
          _id: '$category',
          soldUnits: { $sum: '$quantity' },
          soldRevenue: { $sum: '$amount' }
        }
      }
    ]),
    StockMovementModel.find(adjustmentMatch).sort({ date: -1 }).limit(10).lean()
  ]);

  // Index sales and purchases by product ID and product Code
  const salesMap = new Map<string, { qty: number; rev: number; count: number }>();
  for (const s of salesByItemAgg) {
    if (s._id) salesMap.set(String(s._id), { qty: s.totalQuantity, rev: s.totalRevenue, count: s.transactionsCount });
    if (s.productCode) salesMap.set(String(s.productCode).toUpperCase(), { qty: s.totalQuantity, rev: s.totalRevenue, count: s.transactionsCount });
  }

  const purchaseMap = new Map<string, { qty: number; cost: number }>();
  for (const p of purchasesByItemAgg) {
    if (p._id) purchaseMap.set(String(p._id), { qty: p.totalQuantity, cost: p.totalCost });
    if (p.productCode) purchaseMap.set(String(p.productCode).toUpperCase(), { qty: p.totalQuantity, cost: p.totalCost });
  }

  // Aggregate Category Metrics
  const categorySummaryMap = new Map<string, { totalItems: number; stockUnits: number; soldUnits: number; soldRev: number; purchasedUnits: number }>();

  let totalStockUnits = 0;
  let stockOutCount = 0;
  let lowStockCount = 0;
  let approachingReorderCount = 0;
  let totalSalesUnits = 0;
  let totalSalesRevenue = 0;
  let totalPurchasedUnits = 0;
  let totalPurchaseCost = 0;

  const productVelocities: ProductMovementVelocity[] = [];
  const stockRiskAlerts: InventoryIntelligenceResult['stockRiskAlerts'] = [];

  for (const prod of (allProducts || [])) {
    const pId = String(prod._id);
    const pCode = String(prod.code || '').toUpperCase();
    const stock = Number(prod.stock || 0);
    const minThreshold = Number(prod.minThreshold || 10);
    const category = prod.category || 'General';

    totalStockUnits += stock;

    // Track category totals
    if (!categorySummaryMap.has(category)) {
      categorySummaryMap.set(category, { totalItems: 0, stockUnits: 0, soldUnits: 0, soldRev: 0, purchasedUnits: 0 });
    }
    const catEntry = categorySummaryMap.get(category)!;
    catEntry.totalItems += 1;
    catEntry.stockUnits += stock;

    // Find sales in period
    const saleInfo = salesMap.get(pId) || salesMap.get(pCode) || { qty: 0, rev: 0, count: 0 };
    totalSalesUnits += saleInfo.qty;
    totalSalesRevenue += saleInfo.rev;
    catEntry.soldUnits += saleInfo.qty;
    catEntry.soldRev += saleInfo.rev;

    // Find purchases in period
    const purchaseInfo = purchaseMap.get(pId) || purchaseMap.get(pCode) || { qty: 0, cost: 0 };
    totalPurchasedUnits += purchaseInfo.qty;
    totalPurchaseCost += purchaseInfo.cost;
    catEntry.purchasedUnits += purchaseInfo.qty;

    const velocityPerDay = Number((saleInfo.qty / rangeDays).toFixed(2));

    // Stock out & threshold checks
    let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    let isReorderUrgent = false;
    let isApproachingReorder = false;

    if (stock <= 0) {
      status = 'out_of_stock';
      stockOutCount++;
      isReorderUrgent = true;
      stockRiskAlerts.push({
        code: prod.code,
        name: prod.name,
        category,
        currentStock: stock,
        minThreshold,
        unit: prod.unit || 'Bag',
        urgency: 'critical_out_of_stock',
        recommendedReorderTarget: Math.max(minThreshold * 2, 20)
      });
    } else if (stock <= minThreshold) {
      status = 'low_stock';
      lowStockCount++;
      isReorderUrgent = true;
      stockRiskAlerts.push({
        code: prod.code,
        name: prod.name,
        category,
        currentStock: stock,
        minThreshold,
        unit: prod.unit || 'Bag',
        urgency: 'below_threshold',
        recommendedReorderTarget: Math.max(minThreshold * 2, minThreshold + 10)
      });
    } else if (stock <= minThreshold * 1.5) {
      isApproachingReorder = true;
      approachingReorderCount++;
      stockRiskAlerts.push({
        code: prod.code,
        name: prod.name,
        category,
        currentStock: stock,
        minThreshold,
        unit: prod.unit || 'Bag',
        urgency: 'approaching_reorder',
        recommendedReorderTarget: Math.max(minThreshold * 2, minThreshold + 5)
      });
    }

    // Classify movement
    let movementClassification: 'fast_moving' | 'normal' | 'slow_moving' | 'zero_movement' = 'normal';
    if (saleInfo.qty === 0) {
      movementClassification = 'zero_movement';
    } else if (velocityPerDay >= 1.0 || saleInfo.qty >= 15) {
      movementClassification = 'fast_moving';
    } else if (velocityPerDay <= 0.1) {
      movementClassification = 'slow_moving';
    }

    productVelocities.push({
      productId: pId,
      productCode: prod.code,
      productName: prod.name,
      category,
      currentStock: stock,
      minThreshold,
      unit: prod.unit || 'Bag',
      salesQuantity: saleInfo.qty,
      salesRevenue: saleInfo.rev,
      salesVelocityPerDay: velocityPerDay,
      purchasedQuantity: purchaseInfo.qty,
      purchasedCost: purchaseInfo.cost,
      status,
      movementClassification,
      isReorderUrgent,
      isApproachingReorder
    });
  }

  // Sort fast-moving (highest sales velocity)
  const fastMovingProducts = [...productVelocities]
    .filter(p => p.salesQuantity > 0)
    .sort((a, b) => b.salesQuantity - a.salesQuantity)
    .slice(0, 6);

  // Slow-moving or zero movement (catalog items with zero or negligible sales in range)
  const slowMovingProducts = [...productVelocities]
    .filter(p => p.salesQuantity === 0 || p.movementClassification === 'slow_moving')
    .sort((a, b) => a.salesQuantity - b.salesQuantity)
    .slice(0, 6);

  // Category movement list
  const categoryMovement = Array.from(categorySummaryMap.entries()).map(([category, stats]) => ({
    category,
    totalItems: stats.totalItems,
    currentStockUnits: stats.stockUnits,
    soldUnits: stats.soldUnits,
    soldRevenue: stats.soldRev,
    purchasedUnits: stats.purchasedUnits
  })).sort((a, b) => b.soldUnits - a.soldUnits);

  // Manual Adjustments summary
  let manualAdjustmentsNetUnits = 0;
  for (const adj of manualAdjustments) {
    manualAdjustmentsNetUnits += Number(adj.quantity || 0);
  }

  // Deterministic Fallback Synthesis
  const netMovement = totalPurchasedUnits - totalSalesUnits;
  let fallbackBrief = '';
  if (allProducts.length === 0) {
    fallbackBrief = 'Inventory catalog is empty. Add fertilizers, seeds, and agro-inputs to activate inventory intelligence.';
  } else {
    const stockOutText = stockOutCount > 0
      ? `${stockOutCount} products are completely out of stock.`
      : 'All products currently have available stock.';
    const lowStockText = lowStockCount > 0
      ? `${lowStockCount} items have fallen below their minimum threshold.`
      : 'No items below minimum threshold.';
    const salesText = totalSalesUnits > 0
      ? `${totalSalesUnits} units sold generating ₹${totalSalesRevenue.toLocaleString('en-IN')}.`
      : 'No retail sales logged during this period.';
    const fastItem = fastMovingProducts[0];
    const fastText = fastItem
      ? `Fastest turnover: ${fastItem.productName} (${fastItem.salesQuantity} ${fastItem.unit} sold).`
      : '';

    fallbackBrief = `Managing ${allProducts.length} catalog products (${totalStockUnits} units in stock). ${salesText} ${stockOutText} ${lowStockText} ${fastText}`;
  }

  const advisoryRecommendations: InventoryIntelligenceResult['advisoryRecommendations'] = [];

  // Critical stock-out / threshold alerts
  for (const alert of stockRiskAlerts.slice(0, 3)) {
    if (alert.urgency === 'critical_out_of_stock') {
      advisoryRecommendations.push({
        category: 'Reorder',
        productOrGroup: alert.name,
        recommendation: `${alert.name} is completely out of stock (0 ${alert.unit}). Recommended reorder target: ${alert.recommendedReorderTarget} ${alert.unit}. Review supplier availability.`,
        priority: 'high'
      });
    } else if (alert.urgency === 'below_threshold') {
      advisoryRecommendations.push({
        category: 'Reorder',
        productOrGroup: alert.name,
        recommendation: `${alert.name} stock (${alert.currentStock} ${alert.unit}) is below minimum threshold (${alert.minThreshold} ${alert.unit}). Plan restocking order.`,
        priority: 'high'
      });
    }
  }

  // Fast-moving reorder recommendations
  if (fastMovingProducts.length > 0) {
    const topFast = fastMovingProducts[0];
    if (topFast.currentStock < topFast.salesQuantity * 2) {
      advisoryRecommendations.push({
        category: 'Procurement',
        productOrGroup: topFast.productName,
        recommendation: `${topFast.productName} is moving rapidly (${topFast.salesVelocityPerDay} ${topFast.unit}/day). Current stock (${topFast.currentStock} ${topFast.unit}) may be depleted within ${Math.max(1, Math.round(topFast.currentStock / (topFast.salesVelocityPerDay || 1)))} days. Review reorder schedule.`,
        priority: 'medium'
      });
    }
  }

  // Slow-moving recommendations
  if (slowMovingProducts.length > 0 && totalSalesUnits > 0) {
    const topSlow = slowMovingProducts[0];
    if (topSlow.currentStock > topSlow.minThreshold * 2) {
      advisoryRecommendations.push({
        category: 'Slow Inventory',
        productOrGroup: topSlow.productName,
        recommendation: `${topSlow.productName} has zero sales in ${rangeLabel} while holding ${topSlow.currentStock} ${topSlow.unit} in stock. Review purchasing frequency and godown shelf space.`,
        priority: 'low'
      });
    }
  }

  // Manual stock adjustment audit recommendation
  if (manualAdjustments.length > 0) {
    advisoryRecommendations.push({
      category: 'Stock Audit',
      productOrGroup: 'Stock Register',
      recommendation: `Detected ${manualAdjustments.length} manual stock adjustments in ${rangeLabel}. Conduct periodic physical stock verification to reconcile register counts.`,
      priority: 'low'
    });
  }

  if (advisoryRecommendations.length === 0) {
    advisoryRecommendations.push({
      category: 'Procurement',
      productOrGroup: 'All Inventory',
      recommendation: 'Stock levels, sales velocity, and reorder margins are currently within standard operational parameters.',
      priority: 'low'
    });
  }

  const result: InventoryIntelligenceResult = {
    isAiGenerated: true,
    source: 'deterministic_synthesis',
    status: 'fallback',
    generatedAt: new Date().toISOString(),
    filtersApplied: {
      rangeLabel,
      staff
    },
    metrics: {
      totalCatalogItems: allProducts.length,
      totalStockUnits,
      stockOutCount,
      lowStockCount,
      approachingReorderCount,
      totalSalesUnits,
      totalSalesRevenue,
      totalPurchasedUnits,
      totalPurchaseCost,
      netStockMovementUnits: netMovement,
      manualAdjustmentsCount: manualAdjustments.length,
      manualAdjustmentsNetUnits
    },
    fastMovingProducts,
    slowMovingProducts,
    stockRiskAlerts,
    categoryMovement,
    recentManualAdjustments: manualAdjustments.map((a: any) => ({
      productName: a.productName,
      type: a.type,
      quantity: a.quantity,
      resultingStock: a.resultingStock,
      performedBy: a.performedBy,
      notes: a.notes || '',
      date: new Date(a.date).toLocaleDateString('en-IN')
    })),
    executiveBrief: fallbackBrief,
    advisoryRecommendations
  };

  // Call Gemini if products exist to synthesize professional advice
  if (allProducts.length > 0) {
    try {
      const ai = getGeminiClient();
      const prompt = `You are the chief agricultural inventory and supply chain specialist for Krishi Seva Kendra.
Analyze these REAL inventory records retrieved directly from MongoDB:

Filters: ${rangeLabel} | Staff: ${staff}
Inventory Stats:
- Catalog Products: ${allProducts.length}
- Total Stock Units: ${totalStockUnits}
- Out of Stock Items: ${stockOutCount}
- Below Min Threshold Items: ${lowStockCount}
- Approaching Reorder Items: ${approachingReorderCount}
- Sales in Range: ${totalSalesUnits} units (Revenue: Rs. ${totalSalesRevenue})
- Purchases in Range: ${totalPurchasedUnits} units (Cost: Rs. ${totalPurchaseCost})
- Net Stock Delta: ${netMovement} units
- Manual Adjustments: ${manualAdjustments.length} logged

Critical Items at Risk:
${stockRiskAlerts.slice(0, 4).map(a => `- ${a.name} (${a.category}): Current stock ${a.currentStock} ${a.unit} (Min Threshold: ${a.minThreshold}) -> Status: ${a.urgency}`).join('\n') || 'None'}

Fast Moving Items:
${fastMovingProducts.slice(0, 3).map(p => `- ${p.productName}: Sold ${p.salesQuantity} ${p.unit} (${p.salesVelocityPerDay}/day), Stock: ${p.currentStock}`).join('\n') || 'None'}

Slow Moving Items:
${slowMovingProducts.slice(0, 3).map(p => `- ${p.productName}: Sold ${p.salesQuantity} ${p.unit}, Stock: ${p.currentStock}`).join('\n') || 'None'}

Task:
Produce a concise, professional inventory executive brief and 2-4 advisory recommendations.
Return ONLY valid JSON matching this schema:
{
  "executiveBrief": "2-3 sentences summarizing stock health, sales turnover, critical shortages, and movement trends strictly using these figures.",
  "recommendations": [
    { "category": "Reorder|Procurement|Slow Inventory|Stock Audit", "productOrGroup": "Product name or group", "recommendation": "Actionable administrative recommendation", "priority": "high|medium|low" }
  ]
}

STRICT CONSTRAINTS:
- Use ONLY the provided numbers. Never hallucinate stock or sales counts.
- AI provides recommendations only. All purchase orders, price adjustments, and stock updates require authorized staff actions.
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
        if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
          result.advisoryRecommendations = parsed.recommendations;
        }
        result.source = 'gemini';
        result.status = 'success';
      }
    } catch (err: any) {
      console.warn('[InventoryIntelligence] Gemini synthesis skipped, using deterministic output:', err.message);
    }
  }

  cache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}
