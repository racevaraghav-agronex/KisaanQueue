import { Router, Response } from 'express';
import { TokenModel } from '../models/Token.ts';
import { UserModel } from '../models/User.ts';
import { ServiceModel } from '../models/Service.ts';
import { ProductModel } from '../models/Product.ts';
import { SaleModel } from '../models/Sale.ts';
import { PurchaseModel } from '../models/Purchase.ts';
import { ProcurementModel } from '../models/Procurement.ts';
import { StockMovementModel } from '../models/StockMovement.ts';
import { ComplaintModel } from '../models/Complaint.ts';
import { dbStatus } from '../db.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Middleware to ensure DB connection
const ensureDb = (_req: any, res: Response, next: () => void) => {
  res.setHeader('Content-Type', 'application/json');
  if (!dbStatus.connected) {
    res.status(503).json({ error: 'Database connection unavailable' });
    return;
  }
  next();
};

// Admin only access
router.use(authenticate, requireRole(['admin']), ensureDb);

/**
 * Parses date range query parameters into start and end Dates
 */
function parseDateRange(query: any): { fromDate: Date; toDate: Date; rangeLabel: string } {
  const range = (query.range || 'last7days').toString().toLowerCase();
  const now = new Date();
  let fromDate: Date;
  let toDate: Date = new Date();
  let rangeLabel = 'Last 7 Days';

  switch (range) {
    case 'today': {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      rangeLabel = 'Today';
      break;
    }
    case 'yesterday': {
      const y = new Date(now.getTime() - 86400000);
      fromDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      toDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      rangeLabel = 'Yesterday';
      break;
    }
    case 'last7days': {
      const d = new Date(now.getTime() - 7 * 86400000);
      fromDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      rangeLabel = 'Last 7 Days';
      break;
    }
    case 'last30days': {
      const d = new Date(now.getTime() - 30 * 86400000);
      fromDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      rangeLabel = 'Last 30 Days';
      break;
    }
    case 'custom': {
      if (query.startDate) {
        fromDate = new Date(query.startDate);
        fromDate.setHours(0, 0, 0, 0);
      } else {
        fromDate = new Date(now.getTime() - 30 * 86400000);
      }
      if (query.endDate) {
        toDate = new Date(query.endDate);
        toDate.setHours(23, 59, 59, 999);
      } else {
        toDate = new Date(now);
      }
      rangeLabel = `Custom (${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)})`;
      break;
    }
    default: {
      const d = new Date(now.getTime() - 7 * 86400000);
      fromDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      rangeLabel = 'Last 7 Days';
    }
  }

  return { fromDate, toDate, rangeLabel };
}

// =========================================================================
// 1. COMPREHENSIVE ADMIN ANALYTICS OVERVIEW (REAL MONGODB DATA)
// =========================================================================
router.get(['/overview', '/analytics/overview'], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate, rangeLabel } = parseDateRange(req.query);
    const serviceFilter = req.query.service ? req.query.service.toString().trim() : 'ALL';
    const staffFilter = req.query.staff ? req.query.staff.toString().trim() : 'ALL';
    const centreFilter = req.query.centre ? req.query.centre.toString().trim() : 'ALL';

    // Base Token Match Criteria
    const tokenMatch: any = {
      issuedAt: { $gte: fromDate, $lte: toDate }
    };
    if (serviceFilter !== 'ALL') {
      tokenMatch.$or = [{ serviceId: serviceFilter }, { serviceName: serviceFilter }];
    }
    if (staffFilter !== 'ALL') {
      tokenMatch.staffName = staffFilter;
    }
    if (centreFilter !== 'ALL') {
      tokenMatch.centre = centreFilter;
    }

    // Procurement Match Criteria
    const procMatch: any = {
      createdAt: { $gte: fromDate, $lte: toDate }
    };
    if (centreFilter !== 'ALL') {
      procMatch.centre = centreFilter;
    }
    if (staffFilter !== 'ALL') {
      procMatch.$or = [
        { 'arrival.verifiedByStaffName': staffFilter },
        { 'weighment.weighedByStaffName': staffFilter },
        { 'decision.decidedByStaffName': staffFilter }
      ];
    }

    // Sale Match Criteria
    const saleMatch: any = {
      date: { $gte: fromDate, $lte: toDate }
    };
    if (staffFilter !== 'ALL') {
      saleMatch.staffName = staffFilter;
    }

    // Purchase Match Criteria
    const purchaseMatch: any = {
      date: { $gte: fromDate, $lte: toDate }
    };

    // Complaint Match Criteria
    const complaintMatch: any = {
      createdAt: { $gte: fromDate, $lte: toDate }
    };
    if (staffFilter !== 'ALL') {
      complaintMatch.assignedStaffName = staffFilter;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Parallel Aggregation Execution
    const [
      totalFarmers,
      todayTokensCount,
      tokenStatusAgg,
      waitingTokensActive,
      timingAgg,
      hourlyAgg,
      dailyTokensAgg,
      serviceDemandAgg,
      procAgg,
      procProduceAgg,
      procGradesAgg,
      salesAgg,
      salesDailyAgg,
      topItemsAgg,
      purchasesAgg,
      stockSummaryAgg,
      lowStockCount,
      totalProductsCount,
      complaintStatusAgg,
      complaintCategoryAgg,
      complaintPriorityAgg,
      complaintRatingAgg,
      availableServices,
      availableStaff
    ] = await Promise.all([
      // Total registered farmers
      UserModel.countDocuments({ role: 'farmer' }),

      // Today's Tokens count
      TokenModel.countDocuments({ issuedAt: { $gte: startOfToday } }),

      // Filtered Token Status Distribution
      TokenModel.aggregate([
        { $match: tokenMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Active waiting tokens
      TokenModel.countDocuments({ status: 'waiting' }),

      // Waiting and Service Time Aggregation (minutes)
      TokenModel.aggregate([
        { $match: tokenMatch },
        {
          $project: {
            status: 1,
            waitingMinutes: {
              $cond: [
                { $and: ['$servedAt', '$issuedAt'] },
                { $divide: [{ $subtract: ['$servedAt', '$issuedAt'] }, 60000] },
                null
              ]
            },
            serviceMinutes: {
              $cond: [
                { $and: ['$completedAt', '$servedAt'] },
                { $divide: [{ $subtract: ['$completedAt', '$servedAt'] }, 60000] },
                null
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgWaiting: { $avg: '$waitingMinutes' },
            avgService: { $avg: '$serviceMinutes' }
          }
        }
      ]),

      // Hourly Token Distribution (Peak Hours)
      TokenModel.aggregate([
        { $match: tokenMatch },
        {
          $project: {
            hour: { $hour: { date: '$issuedAt', timezone: '+05:30' } }
          }
        },
        {
          $group: {
            _id: '$hour',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Daily Token Volume
      TokenModel.aggregate([
        { $match: tokenMatch },
        {
          $project: {
            dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$issuedAt', timezone: '+05:30' } },
            status: 1
          }
        },
        {
          $group: {
            _id: '$dateStr',
            count: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'skipped']] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Service Demand
      TokenModel.aggregate([
        { $match: tokenMatch },
        {
          $group: {
            _id: '$serviceName',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Procurement Summary Metrics
      ProcurementModel.aggregate([
        { $match: procMatch },
        {
          $group: {
            _id: null,
            totalLots: { $sum: 1 },
            declaredQty: { $sum: '$produce.declaredQuantity' },
            netWeight: { $sum: '$weighment.netWeight' },
            acceptedQty: { $sum: '$decision.acceptedQuantity' },
            rejectedQty: { $sum: '$decision.rejectedQuantity' },
            totalValue: { $sum: '$pricing.netPayable' },
            paidAmount: {
              $sum: { $cond: [{ $eq: ['$payment.status', 'PAID'] }, '$payment.paidAmount', 0] }
            },
            paidCount: {
              $sum: { $cond: [{ $eq: ['$payment.status', 'PAID'] }, 1, 0] }
            },
            pendingAmount: {
              $sum: { $cond: [{ $eq: ['$payment.status', 'PENDING'] }, '$pricing.netPayable', 0] }
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$payment.status', 'PENDING'] }, 1, 0] }
            },
            avgMoisture: { $avg: '$quality.moisturePercentage' }
          }
        }
      ]),

      // Procurement Produce-wise Quantity
      ProcurementModel.aggregate([
        { $match: procMatch },
        {
          $group: {
            _id: '$produce.cropName',
            count: { $sum: 1 },
            declaredQty: { $sum: '$produce.declaredQuantity' },
            netWeight: { $sum: '$weighment.netWeight' },
            acceptedQty: { $sum: '$decision.acceptedQuantity' },
            rejectedQty: { $sum: '$decision.rejectedQuantity' },
            totalValue: { $sum: '$pricing.netPayable' },
            unit: { $first: '$produce.unit' }
          }
        },
        { $sort: { totalValue: -1 } }
      ]),

      // Procurement Quality Grades
      ProcurementModel.aggregate([
        { $match: procMatch },
        {
          $group: {
            _id: { $ifNull: ['$quality.grade', 'Unassigned'] },
            count: { $sum: 1 },
            acceptedQty: { $sum: '$decision.acceptedQuantity' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Sales Summary
      SaleModel.aggregate([
        { $match: saleMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            count: { $sum: 1 },
            cashRevenue: {
              $sum: { $cond: [{ $eq: ['$paymentMethod', 'Cash'] }, '$total', 0] }
            },
            upiRevenue: {
              $sum: { $cond: [{ $eq: ['$paymentMethod', 'UPI'] }, '$total', 0] }
            }
          }
        }
      ]),

      // Daily Sales Trend
      SaleModel.aggregate([
        { $match: saleMatch },
        {
          $project: {
            dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: '+05:30' } },
            total: 1
          }
        },
        {
          $group: {
            _id: '$dateStr',
            revenue: { $sum: '$total' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Top Selling Products in Range
      SaleModel.aggregate([
        { $match: saleMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $ifNull: ['$items.productCode', '$items.productName'] },
            name: { $first: '$items.productName' },
            code: { $first: '$items.productCode' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.amount' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 6 }
      ]),

      // Purchases Summary in Range
      PurchaseModel.aggregate([
        { $match: purchaseMatch },
        {
          $group: {
            _id: null,
            totalPurchase: { $sum: '$total' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Stock Register Summary
      ProductModel.aggregate([
        {
          $group: {
            _id: null,
            totalUnits: { $sum: '$stock' }
          }
        }
      ]),

      // Low Stock Product Count
      ProductModel.countDocuments({
        $or: [
          { status: { $in: ['low_stock', 'out_of_stock'] } },
          { $expr: { $lte: ['$stock', '$minThreshold'] } }
        ]
      }),

      // Total catalog products
      ProductModel.countDocuments(),

      // Complaints Status Breakdown
      ComplaintModel.aggregate([
        { $match: complaintMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Complaints Category Breakdown
      ComplaintModel.aggregate([
        { $match: complaintMatch },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Complaints Priority Breakdown
      ComplaintModel.aggregate([
        { $match: complaintMatch },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),

      // Complaints Average Rating
      ComplaintModel.aggregate([
        { $match: { ...complaintMatch, rating: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            ratedCount: { $sum: 1 }
          }
        }
      ]),

      // Filter Options: Services
      ServiceModel.find({}, 'code name').sort({ name: 1 }),

      // Filter Options: Staff
      UserModel.find({ role: 'staff' }, 'name').sort({ name: 1 })
    ]);

    // Process Token Status Map
    const statusMap: Record<string, number> = {};
    let filteredTokensCount = 0;
    for (const item of tokenStatusAgg) {
      statusMap[item._id] = item.count;
      filteredTokensCount += item.count;
    }
    const completedTokens = statusMap['completed'] || 0;
    const waitingTokens = statusMap['waiting'] || 0;
    const cancelledTokens = (statusMap['cancelled'] || 0) + (statusMap['skipped'] || 0);
    const servingTokens = (statusMap['serving'] || 0) + (statusMap['called'] || 0);

    // Waiting and Service Time
    const avgWaitingTime = Math.round((timingAgg[0]?.avgWaiting || 0) * 10) / 10;
    const avgServiceTime = Math.round((timingAgg[0]?.avgService || 0) * 10) / 10;

    // Peak Hour Format
    const peakHourItem = hourlyAgg[0];
    let peakHoursLabel = 'N/A (No tokens)';
    if (peakHourItem) {
      const h = peakHourItem._id;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const dispHour = h % 12 === 0 ? 12 : h % 12;
      const nextDispHour = (h + 1) % 12 === 0 ? 12 : (h + 1) % 12;
      const nextAmpm = (h + 1) >= 12 ? 'PM' : 'AM';
      peakHoursLabel = `${dispHour}:00 ${ampm} – ${nextDispHour}:00 ${nextAmpm} (${peakHourItem.count} tokens)`;
    }

    // Peak Hours full spectrum (8 AM to 6 PM)
    const peakHoursSpectrum = [];
    for (let hour = 8; hour <= 18; hour++) {
      const found = hourlyAgg.find(h => h._id === hour);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const dispHour = hour % 12 === 0 ? 12 : hour % 12;
      peakHoursSpectrum.push({
        hour,
        label: `${dispHour} ${ampm}`,
        count: found ? found.count : 0
      });
    }

    // Service Demand with percentage
    const serviceDemand = serviceDemandAgg.map(s => ({
      serviceName: s._id || 'General Support',
      count: s.count,
      percentage: filteredTokensCount > 0 ? Math.round((s.count / filteredTokensCount) * 100) : 0
    }));

    // Daily Token Volume
    const dailyTokenVolume = dailyTokensAgg.map(d => ({
      date: d._id,
      label: new Date(d._id).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      count: d.count,
      completed: d.completed,
      cancelled: d.cancelled
    }));

    // Procurement Metrics
    const procSummary = procAgg[0] || {
      totalLots: 0,
      declaredQty: 0,
      netWeight: 0,
      acceptedQty: 0,
      rejectedQty: 0,
      totalValue: 0,
      paidAmount: 0,
      paidCount: 0,
      pendingAmount: 0,
      pendingCount: 0,
      avgMoisture: 0
    };

    // Sales Metrics
    const salesSummary = salesAgg[0] || {
      totalRevenue: 0,
      count: 0,
      cashRevenue: 0,
      upiRevenue: 0
    };

    // Purchases Metrics
    const purchasesSummary = purchasesAgg[0] || {
      totalPurchase: 0,
      count: 0
    };

    // Complaints Metrics
    const complaintMap: Record<string, number> = {};
    let totalComplaints = 0;
    for (const c of complaintStatusAgg) {
      complaintMap[c._id] = c.count;
      totalComplaints += c.count;
    }
    const openComplaints = (complaintMap['open'] || 0) + (complaintMap['in_progress'] || 0);
    const resolvedComplaints = (complaintMap['resolved'] || 0) + (complaintMap['closed'] || 0);

    // Stock Movement summary in Range
    const movementCounts = await StockMovementModel.aggregate([
      { $match: { date: { $gte: fromDate, $lte: toDate } } },
      { $group: { _id: '$type', count: { $sum: 1 }, totalQty: { $sum: '$quantity' } } }
    ]);
    const moveMap: Record<string, { count: number; qty: number }> = {};
    for (const m of movementCounts) {
      moveMap[m._id] = { count: m.count, qty: m.totalQty };
    }

    // Low stock items sample list
    const lowStockItemsList = await ProductModel.find({
      $or: [
        { status: { $in: ['low_stock', 'out_of_stock'] } },
        { $expr: { $lte: ['$stock', '$minThreshold'] } }
      ]
    }, 'code name stock minThreshold unit category').limit(8);

    // Rates calculation
    const completionRate = filteredTokensCount > 0 ? Math.round((completedTokens / filteredTokensCount) * 100) : 0;
    const cancellationRate = filteredTokensCount > 0 ? Math.round((cancelledTokens / filteredTokensCount) * 100) : 0;

    res.json({
      filtersApplied: {
        range: req.query.range || 'last7days',
        rangeLabel,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        service: serviceFilter,
        staff: staffFilter,
        centre: centreFilter
      },
      summary: {
        totalFarmers,
        todayTokens: todayTokensCount,
        totalTokens: filteredTokensCount,
        completedTokens,
        waitingTokens: waitingTokensActive,
        filteredWaitingTokens: waitingTokens,
        cancelledTokens,
        servingTokens,
        avgWaitingTime,
        avgServiceTime,
        peakHours: peakHoursLabel,
        procurementQuantity: Math.round(procSummary.acceptedQty * 100) / 100,
        procurementNetWeight: Math.round(procSummary.netWeight * 100) / 100,
        procurementValue: Math.round(procSummary.totalValue),
        pendingPaymentsCount: procSummary.pendingCount,
        pendingPaymentsValue: Math.round(procSummary.pendingAmount),
        paidPaymentsCount: procSummary.paidCount,
        paidPaymentsValue: Math.round(procSummary.paidAmount),
        salesRevenue: Math.round(salesSummary.totalRevenue),
        salesCount: salesSummary.count,
        cashRevenue: Math.round(salesSummary.cashRevenue),
        upiRevenue: Math.round(salesSummary.upiRevenue),
        purchaseValue: Math.round(purchasesSummary.totalPurchase),
        purchasesCount: purchasesSummary.count,
        currentStockTotal: stockSummaryAgg[0]?.totalUnits || 0,
        lowStockCount,
        totalProducts: totalProductsCount,
        openComplaints,
        resolvedComplaints,
        totalComplaints
      },
      queueAnalytics: {
        dailyTokenVolume,
        serviceDemand,
        peakHours: peakHoursSpectrum,
        avgWaitingTimeMinutes: avgWaitingTime,
        avgServiceTimeMinutes: avgServiceTime,
        completionRate,
        cancellationRate
      },
      procurementAnalytics: {
        produceWise: procProduceAgg.map(p => ({
          cropName: p._id,
          declaredQuantity: p.declaredQty,
          netWeight: p.netWeight,
          acceptedQuantity: p.acceptedQty,
          rejectedQuantity: p.rejectedQty,
          totalValue: p.totalValue,
          unit: p.unit || 'Quintal',
          count: p.count
        })),
        procurementValue: procSummary.totalValue,
        acceptedQuantity: procSummary.acceptedQty,
        rejectedQuantity: procSummary.rejectedQty,
        qualityGrades: procGradesAgg.map(g => ({
          grade: g._id,
          count: g.count,
          quantity: g.acceptedQty
        })),
        avgMoisture: Math.round((procSummary.avgMoisture || 0) * 10) / 10,
        paymentStatus: {
          pendingCount: procSummary.pendingCount,
          pendingAmount: procSummary.pendingAmount,
          paidCount: procSummary.paidCount,
          paidAmount: procSummary.paidAmount
        }
      },
      salesAndInventory: {
        salesTrend: salesDailyAgg.map(s => ({
          date: s._id,
          label: new Date(s._id).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          revenue: s.revenue,
          count: s.count
        })),
        topSellingProducts: topItemsAgg.map(item => ({
          name: item.name || 'Agri Item',
          code: item.code || 'CODE',
          quantity: item.quantity,
          revenue: item.revenue
        })),
        lowStockProducts: lowStockItemsList.map(p => ({
          name: p.name,
          code: p.code,
          stock: p.stock,
          minThreshold: p.minThreshold,
          unit: p.unit,
          category: p.category
        })),
        purchaseVsSales: {
          purchaseTotal: purchasesSummary.totalPurchase,
          salesTotal: salesSummary.totalRevenue,
          purchaseCount: purchasesSummary.count,
          salesCount: salesSummary.count,
          netMargin: salesSummary.totalRevenue - purchasesSummary.totalPurchase
        },
        stockMovementSummary: {
          purchases: moveMap['purchase']?.count || 0,
          purchaseQty: moveMap['purchase']?.qty || 0,
          sales: moveMap['sale']?.count || 0,
          saleQty: moveMap['sale']?.qty || 0,
          adjustments: moveMap['adjustment']?.count || 0,
          adjustmentQty: moveMap['adjustment']?.qty || 0,
          totalMovements: (moveMap['purchase']?.count || 0) + (moveMap['sale']?.count || 0) + (moveMap['adjustment']?.count || 0)
        }
      },
      complaintAnalytics: {
        totalVolume: totalComplaints,
        openCount: complaintMap['open'] || 0,
        inProgressCount: complaintMap['in_progress'] || 0,
        resolvedCount: complaintMap['resolved'] || 0,
        categoryDistribution: complaintCategoryAgg.map(c => ({
          category: c._id,
          count: c.count
        })),
        priorityBreakdown: complaintPriorityAgg.map(p => ({
          priority: p._id,
          count: p.count
        })),
        avgFarmerRating: Math.round((complaintRatingAgg[0]?.avgRating || 5) * 10) / 10,
        ratedCount: complaintRatingAgg[0]?.ratedCount || 0
      },
      filterOptions: {
        services: availableServices.map(s => ({ id: s.code || s._id.toString(), name: s.name })),
        staff: availableStaff.map(st => ({ id: st.name, name: st.name })),
        centres: ['Krishi Seva Kendra - Main Centre']
      }
    });
  } catch (error: any) {
    console.error('Analytics aggregation error:', error);
    res.status(500).json({ error: 'Failed to compute analytics from MongoDB: ' + error.message });
  }
});

// =========================================================================
// 2. REPORTS ENDPOINT (VIEWS, SEARCH & CSV EXPORT)
// =========================================================================
router.get(['/reports/data', '/data'], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reportType = (req.query.type || 'daily').toString().toLowerCase();
    const format = (req.query.format || 'json').toString().toLowerCase();
    const { fromDate, toDate, rangeLabel } = parseDateRange(req.query);
    const serviceFilter = req.query.service ? req.query.service.toString().trim() : 'ALL';
    const staffFilter = req.query.staff ? req.query.staff.toString().trim() : 'ALL';

    let headers: string[] = [];
    let rows: any[] = [];
    let title = '';
    let summaryText = '';

    switch (reportType) {
      case 'daily':
      case 'weekly':
      case 'monthly': {
        title = reportType === 'daily'
          ? 'Kendra Daily Operations Report'
          : reportType === 'weekly'
          ? 'Kendra Weekly Performance Report'
          : 'Kendra Monthly Executive Operations Report';

        // Tokens in period
        const tokenQuery: any = { issuedAt: { $gte: fromDate, $lte: toDate } };
        if (serviceFilter !== 'ALL') tokenQuery.$or = [{ serviceId: serviceFilter }, { serviceName: serviceFilter }];
        if (staffFilter !== 'ALL') tokenQuery.staffName = staffFilter;

        const tokens = await TokenModel.find(tokenQuery).sort({ issuedAt: -1 }).limit(100);
        headers = ['Token Number', 'Farmer Name', 'Phone', 'Service', 'Staff', 'Status', 'Issued At', 'Completed At'];
        rows = tokens.map(t => [
          t.tokenNumber,
          t.farmerName,
          t.farmerPhone,
          t.serviceName,
          t.staffName || 'Counter Desk',
          t.status.toUpperCase(),
          new Date(t.issuedAt).toLocaleString('en-IN'),
          t.completedAt ? new Date(t.completedAt).toLocaleString('en-IN') : '-'
        ]);
        summaryText = `Total tokens in period: ${tokens.length} | Period: ${rangeLabel}`;
        break;
      }

      case 'queue': {
        title = 'Queue & Service Delivery Report';
        const query: any = { issuedAt: { $gte: fromDate, $lte: toDate } };
        if (serviceFilter !== 'ALL') query.$or = [{ serviceId: serviceFilter }, { serviceName: serviceFilter }];
        if (staffFilter !== 'ALL') query.staffName = staffFilter;

        const tokens = await TokenModel.find(query).sort({ issuedAt: -1 }).limit(200);
        headers = ['Token No', 'Farmer Name', 'Phone', 'Service', 'Counter', 'Staff', 'Status', 'Wait Time (min)', 'Service Time (min)', 'Time Issued'];
        rows = tokens.map(t => {
          let waitMin = '-';
          if (t.servedAt && t.issuedAt) {
            waitMin = Math.round((new Date(t.servedAt).getTime() - new Date(t.issuedAt).getTime()) / 60000).toString();
          }
          let servMin = '-';
          if (t.completedAt && t.servedAt) {
            servMin = Math.round((new Date(t.completedAt).getTime() - new Date(t.servedAt).getTime()) / 60000).toString();
          }
          return [
            t.tokenNumber,
            t.farmerName,
            t.farmerPhone,
            t.serviceName,
            t.counterNumber ? `Counter ${t.counterNumber}` : '-',
            t.staffName || 'Assigned Staff',
            t.status.toUpperCase(),
            waitMin,
            servMin,
            new Date(t.issuedAt).toLocaleString('en-IN')
          ];
        });
        summaryText = `Queue volume: ${tokens.length} records`;
        break;
      }

      case 'procurement': {
        title = 'Agricultural Produce Procurement Register';
        const query: any = { createdAt: { $gte: fromDate, $lte: toDate } };
        const procs = await ProcurementModel.find(query).sort({ createdAt: -1 }).limit(150);
        headers = ['Procurement No', 'Farmer Name', 'Phone', 'Crop Name', 'Grade', 'Moisture %', 'Net Wt (Qtl)', 'Accepted (Qtl)', 'Rate/Qtl', 'Net Payable (₹)', 'Payment Status', 'Date'];
        rows = procs.map(p => [
          p.procurementNumber,
          p.farmerName,
          p.farmerPhone,
          p.produce?.cropName || '-',
          p.quality?.grade || '-',
          p.quality?.moisturePercentage ? `${p.quality.moisturePercentage}%` : '-',
          p.weighment?.netWeight || 0,
          p.decision?.acceptedQuantity || 0,
          p.pricing?.ratePerUnit ? `₹${p.pricing.ratePerUnit}` : '-',
          p.pricing?.netPayable ? `₹${p.pricing.netPayable.toLocaleString('en-IN')}` : '0',
          p.payment?.status || 'PENDING',
          new Date(p.createdAt).toLocaleDateString('en-IN')
        ]);
        const totalVal = procs.reduce((acc, p) => acc + (p.pricing?.netPayable || 0), 0);
        summaryText = `Total Procurement Lots: ${procs.length} | Value: ₹${totalVal.toLocaleString('en-IN')}`;
        break;
      }

      case 'sales': {
        title = 'Krishi Seva Kendra Sales & Invoices Register';
        const query: any = { date: { $gte: fromDate, $lte: toDate } };
        if (staffFilter !== 'ALL') query.staffName = staffFilter;
        const sales = await SaleModel.find(query).sort({ date: -1 }).limit(200);
        headers = ['Invoice No', 'Farmer Name', 'Phone', 'Items Count', 'Payment Mode', 'Staff', 'Total (₹)', 'Date & Time'];
        rows = sales.map(s => [
          s.invoiceNumber,
          s.farmerName,
          s.farmerPhone,
          s.items?.length || 0,
          s.paymentMethod || 'Cash',
          s.staffName || 'Staff POS',
          `₹${(s.total || 0).toLocaleString('en-IN')}`,
          new Date(s.date).toLocaleString('en-IN')
        ]);
        const totalSales = sales.reduce((acc, s) => acc + (s.total || 0), 0);
        summaryText = `Total Sales: ${sales.length} invoices | Gross Collection: ₹${totalSales.toLocaleString('en-IN')}`;
        break;
      }

      case 'inventory': {
        title = 'Warehouse Inventory & Stock Position Report';
        const products = await ProductModel.find({}).sort({ stock: 1 });
        headers = ['Item Code', 'Product Name', 'Category', 'Current Stock', 'Unit', 'Min Threshold', 'Purchase Rate (₹)', 'Selling Rate (₹)', 'Status'];
        rows = products.map(p => [
          p.code,
          p.name,
          p.category,
          p.stock,
          p.unit,
          p.minThreshold,
          `₹${p.purchaseRate || 0}`,
          `₹${p.sellingRate || 0}`,
          p.stock <= p.minThreshold ? 'LOW STOCK ALERT' : 'HEALTHY'
        ]);
        summaryText = `Total SKUs: ${products.length} catalog items`;
        break;
      }

      case 'purchases': {
        title = 'Purchase & Inward Goods Register';
        const query: any = { date: { $gte: fromDate, $lte: toDate } };
        const purchases = await PurchaseModel.find(query).sort({ date: -1 }).limit(100);
        headers = ['Invoice No', 'Supplier', 'Items Count', 'Total Inward (₹)', 'Recorded By', 'Date'];
        rows = purchases.map(p => [
          p.invoiceNumber,
          p.supplier,
          p.itemsCount || (p.items ? p.items.length : 0),
          `₹${(p.total || 0).toLocaleString('en-IN')}`,
          p.recordedBy || 'Admin',
          new Date(p.date).toLocaleDateString('en-IN')
        ]);
        const totalPur = purchases.reduce((acc, p) => acc + (p.total || 0), 0);
        summaryText = `Total Inward Purchases: ₹${totalPur.toLocaleString('en-IN')}`;
        break;
      }

      case 'complaints': {
        title = 'Farmer Grievance & Complaint Redressal Report';
        const query: any = { createdAt: { $gte: fromDate, $lte: toDate } };
        if (staffFilter !== 'ALL') query.assignedStaffName = staffFilter;
        const complaints = await ComplaintModel.find(query).sort({ createdAt: -1 }).limit(150);
        headers = ['Complaint No', 'Farmer Name', 'Phone', 'Category', 'Subject', 'Priority', 'Status', 'Rating', 'Assigned Staff', 'Date Logged'];
        rows = complaints.map(c => [
          c.complaintNumber,
          c.farmerName,
          c.farmerPhone,
          c.category,
          c.subject,
          c.priority.toUpperCase(),
          c.status.toUpperCase(),
          c.rating ? `${c.rating} / 5` : '-',
          c.assignedStaffName || 'Kendra Officer',
          new Date(c.createdAt).toLocaleDateString('en-IN')
        ]);
        summaryText = `Total Grievances: ${complaints.length} | Resolved: ${complaints.filter(c => c.status === 'resolved').length}`;
        break;
      }

      default: {
        res.status(400).json({ error: 'Invalid report type requested' });
        return;
      }
    }

    // Return as CSV attachment if format === 'csv'
    if (format === 'csv') {
      const escapeCsvCell = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvLines: string[] = [];
      // Title metadata header
      csvLines.push(`"${title} - Krishi Seva Kendra"`);
      csvLines.push(`"Report Generated: ${new Date().toLocaleString('en-IN')}"`);
      csvLines.push(`"Filter Period: ${rangeLabel}"`);
      csvLines.push(`"${summaryText}"`);
      csvLines.push(''); // Blank row

      // Column Headers
      csvLines.push(headers.map(escapeCsvCell).join(','));

      // Data Rows
      for (const row of rows) {
        csvLines.push(row.map(escapeCsvCell).join(','));
      }

      const csvContent = csvLines.join('\n');
      const filename = `kendra_report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
      return;
    }

    // Default: JSON response for UI table rendering and printing
    res.json({
      reportType,
      title,
      summaryText,
      generatedAt: new Date().toISOString(),
      rangeLabel,
      headers,
      rows,
      totalRows: rows.length
    });
  } catch (error: any) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report: ' + error.message });
  }
});

// =========================================================================
// 3. COMPLAINTS MANAGEMENT API (ADMIN)
// =========================================================================
router.get('/complaints', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = req.query.status ? req.query.status.toString() : undefined;
    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    const complaints = await ComplaintModel.find(query).sort({ createdAt: -1 }).limit(100);
    res.json(complaints);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch complaints: ' + err.message });
  }
});

router.patch('/complaints/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, resolutionNotes } = req.body;
    const complaint = await ComplaintModel.findById(req.params.id);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint record not found' });
      return;
    }

    complaint.status = status || complaint.status;
    if (resolutionNotes) {
      complaint.resolutionNotes = resolutionNotes;
    }
    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
    }
    complaint.updatedAt = new Date();
    await complaint.save();

    res.json({ ok: true, complaint });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update complaint: ' + err.message });
  }
});

export default router;
