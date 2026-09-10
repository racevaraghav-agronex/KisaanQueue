import { Router, Response } from 'express';
import { ProcurementModel, IProcurement } from '../models/Procurement.ts';
import { BookingModel } from '../models/Booking.ts';
import { TokenModel } from '../models/Token.ts';
import { UserModel } from '../models/User.ts';
import { dbStatus } from '../db.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';
import {
  notifyProcurementStatusChanged,
  notifyProcurementCompleted,
  notifyPaymentStatusChanged
} from '../utils/notificationService.ts';

const router = Router();

// Ensure DB is connected
const ensureDb = (_req: any, res: Response, next: () => void) => {
  res.setHeader('Content-Type', 'application/json');
  if (!dbStatus.connected) {
    res.status(503).json({ error: 'Database connection unavailable' });
    return;
  }
  next();
};

router.use(ensureDb);

/**
 * Generate a unique, professional Procurement Reference (e.g., PR-2026-1042)
 */
async function generateProcurementNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await ProcurementModel.countDocuments({});
  const seq = 1001 + count;
  const candidate = `PR-${year}-${seq}`;

  const exists = await ProcurementModel.findOne({ procurementNumber: candidate });
  if (!exists) {
    return candidate;
  }
  // Fallback random suffix if conflict
  return `PR-${year}-${seq}-${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * GET /api/procurement/farmer/my
 * Returns procurement history for the authenticated farmer
 */
router.get('/farmer/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const query: any = {
      $or: [
        { farmerId: user._id },
        { farmerPhone: user.phone }
      ]
    };

    const records = await ProcurementModel.find(query).sort({ createdAt: -1 }).limit(100);
    res.json(records);
  } catch (err: any) {
    console.error('Error fetching farmer procurements:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch procurement records' });
  }
});

/**
 * GET /api/procurement/stats/summary
 * Returns overall procurement KPI metrics for Admin and Staff
 */
router.get('/stats/summary', authenticate, requireRole(['staff', 'admin']), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const all = await ProcurementModel.find({}).sort({ createdAt: -1 });

    let totalLots = all.length;
    let pendingArrival = 0;
    let inInspection = 0;
    let completedLots = 0;
    let totalNetWeightQuintals = 0;
    let totalAcceptedQuintals = 0;
    let totalRejectedQuintals = 0;
    let totalValuation = 0;
    let totalPaidAmount = 0;

    const statusCounts: Record<string, number> = {};
    const cropCounts: Record<string, { quantity: number; amount: number }> = {};

    for (const p of all) {
      // Status counting
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;

      if (p.status === 'PENDING') pendingArrival++;
      if (['ARRIVED', 'WEIGHED', 'QUALITY_CHECKED'].includes(p.status)) inInspection++;
      if (['ACCEPTED', 'PARTIALLY_ACCEPTED', 'COMPLETED'].includes(p.status)) completedLots++;

      // Weights
      const net = p.weighment?.netWeight || 0;
      const accepted = p.decision?.acceptedQuantity || 0;
      const rejected = p.decision?.rejectedQuantity || 0;
      const unit = p.weighment?.unit || p.produce?.unit || 'Quintal';

      // Normalize to Quintals for statistics (1 Quintal = 100 kg)
      const multiplier = unit === 'Kg' ? 0.01 : 1;
      totalNetWeightQuintals += net * multiplier;
      totalAcceptedQuintals += accepted * multiplier;
      totalRejectedQuintals += rejected * multiplier;

      // Valuation & payments
      const payable = p.pricing?.netPayable || p.pricing?.totalAmount || 0;
      totalValuation += payable;
      totalPaidAmount += p.payment?.paidAmount || 0;

      // Crop distribution
      const crop = p.produce?.cropName || 'Other';
      if (!cropCounts[crop]) {
        cropCounts[crop] = { quantity: 0, amount: 0 };
      }
      cropCounts[crop].quantity += accepted * multiplier;
      cropCounts[crop].amount += payable;
    }

    const pendingPaymentAmount = Math.max(0, totalValuation - totalPaidAmount);

    res.json({
      totalLots,
      pendingArrival,
      inInspection,
      completedLots,
      totalNetWeightQuintals: Number(totalNetWeightQuintals.toFixed(2)),
      totalAcceptedQuintals: Number(totalAcceptedQuintals.toFixed(2)),
      totalRejectedQuintals: Number(totalRejectedQuintals.toFixed(2)),
      totalValuation: Math.round(totalValuation),
      totalPaidAmount: Math.round(totalPaidAmount),
      pendingPaymentAmount: Math.round(pendingPaymentAmount),
      statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      cropDistribution: Object.entries(cropCounts).map(([cropName, data]) => ({
        cropName,
        quantity: Number(data.quantity.toFixed(2)),
        amount: Math.round(data.amount)
      }))
    });
  } catch (err: any) {
    console.error('Error fetching procurement stats:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch procurement statistics' });
  }
});

/**
 * GET /api/procurement
 * Filterable list of procurement records
 * Farmers get only their own; Staff/Admin can view all
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      status,
      crop,
      search,
      paymentStatus,
      farmerId,
      dateRange
    } = req.query;

    const filter: any = {};

    // Role boundary: farmers only see their own
    if (user.role === 'farmer') {
      filter.$or = [
        { farmerId: user._id },
        { farmerPhone: user.phone }
      ];
    } else if (farmerId && typeof farmerId === 'string') {
      filter.farmerId = farmerId;
    }

    // Status filter
    if (status && status !== 'ALL' && typeof status === 'string') {
      filter.status = status;
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== 'ALL' && typeof paymentStatus === 'string') {
      filter['payment.status'] = paymentStatus;
    }

    // Crop filter
    if (crop && crop !== 'ALL' && typeof crop === 'string') {
      filter['produce.cropName'] = new RegExp(crop, 'i');
    }

    // Search term (farmerName, farmerPhone, procurementNumber, cropName, vehicleNumber)
    if (search && typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { procurementNumber: regex },
        { farmerName: regex },
        { farmerPhone: regex },
        { 'produce.cropName': regex },
        { 'produce.vehicleNumber': regex },
        { tokenNumber: regex },
        { bookingReference: regex }
      ];

      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchConditions }
        ];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    // Date range filter
    if (dateRange && typeof dateRange === 'string') {
      const now = new Date();
      if (dateRange === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filter.createdAt = { $gte: startOfDay };
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filter.createdAt = { $gte: weekAgo };
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filter.createdAt = { $gte: monthAgo };
      }
    }

    const records = await ProcurementModel.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(records);
  } catch (err: any) {
    console.error('Error listing procurements:', err);
    res.status(500).json({ error: err.message || 'Failed to list procurements' });
  }
});

/**
 * GET /api/procurement/:id
 * Single procurement record with full audit history
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const record = await ProcurementModel.findById(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Procurement record not found' });
      return;
    }

    // Security check: farmer can only view their own
    if (user.role === 'farmer' && record.farmerId !== user._id && record.farmerPhone !== user.phone) {
      res.status(403).json({ error: 'Access forbidden: You cannot view this procurement record' });
      return;
    }

    res.json(record);
  } catch (err: any) {
    console.error('Error fetching procurement detail:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch procurement' });
  }
});

/**
 * POST /api/procurement
 * Create new procurement lot intake
 * Can be initiated by Staff at Kendra Desk or pre-registered by Farmer
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      cropName,
      variety,
      declaredQuantity,
      unit = 'Quintal',
      bagsCount,
      vehicleNumber,
      notes,
      farmerId,
      farmerName,
      farmerPhone,
      bookingId,
      bookingReference,
      tokenId,
      tokenNumber,
      centre,
      initialArrival = false,
      gateNumber = ''
    } = req.body;

    // 1. Produce validation
    if (!cropName || typeof cropName !== 'string' || !cropName.trim()) {
      res.status(400).json({ error: 'Produce/crop name is required (e.g. Paddy / धान, Wheat / गेहूं)' });
      return;
    }

    const numDeclared = Number(declaredQuantity);
    if (isNaN(numDeclared) || numDeclared <= 0) {
      res.status(400).json({ error: 'Declared quantity must be a positive number greater than 0' });
      return;
    }

    const validUnits = ['Quintal', 'Kg'];
    if (!validUnits.includes(unit)) {
      res.status(400).json({ error: 'Invalid unit. Must be Quintal or Kg' });
      return;
    }

    // 2. Identify Farmer
    let targetFarmerId = '';
    let targetFarmerName = '';
    let targetFarmerPhone = '';

    if (user.role === 'farmer') {
      targetFarmerId = user._id;
      targetFarmerName = user.name;
      targetFarmerPhone = user.phone;
    } else {
      // Staff/Admin entering for farmer
      if (!farmerName || !farmerPhone) {
        res.status(400).json({ error: 'Farmer name and mobile number are required' });
        return;
      }
      targetFarmerId = farmerId || '';
      targetFarmerName = farmerName.trim();
      targetFarmerPhone = farmerPhone.trim();

      // If farmerId was not provided, look up or link by phone
      if (!targetFarmerId) {
        const foundFarmer = await UserModel.findOne({ phone: targetFarmerPhone });
        if (foundFarmer) {
          targetFarmerId = foundFarmer._id.toString();
        }
      }
    }

    // 3. Check optional Booking/Token link
    let resolvedBookingRef = bookingReference || '';
    if (bookingId && !resolvedBookingRef) {
      const b = await BookingModel.findById(bookingId);
      if (b) resolvedBookingRef = b.bookingReference;
    }

    let resolvedTokenNumber = tokenNumber || '';
    if (tokenId && !resolvedTokenNumber) {
      const t = await TokenModel.findById(tokenId);
      if (t) resolvedTokenNumber = t.tokenNumber;
    }

    const procurementNumber = await generateProcurementNumber();
    const isStaffOrAdmin = user.role === 'staff' || user.role === 'admin';
    const status = (initialArrival && isStaffOrAdmin) ? 'ARRIVED' : 'PENDING';

    const statusHistory = [
      {
        status,
        timestamp: new Date(),
        changedBy: `${user.name} (${user.role})`,
        notes: isStaffOrAdmin && initialArrival
          ? `Intake verified upon arrival at gate ${gateNumber || '1'}`
          : 'Produce lot intake created'
      }
    ];

    const newProcurement = await ProcurementModel.create({
      procurementNumber,
      farmerId: targetFarmerId || 'guest_farmer',
      farmerName: targetFarmerName,
      farmerPhone: targetFarmerPhone,
      bookingId: bookingId || '',
      bookingReference: resolvedBookingRef,
      tokenId: tokenId || '',
      tokenNumber: resolvedTokenNumber,
      centre: centre || user.centre || 'Krishi Seva Kendra - Main Centre',
      produce: {
        cropName: cropName.trim(),
        variety: (variety || '').trim(),
        declaredQuantity: numDeclared,
        unit,
        bagsCount: Number(bagsCount) || 0,
        vehicleNumber: (vehicleNumber || '').trim(),
        notes: (notes || '').trim()
      },
      arrival: {
        verified: (initialArrival && isStaffOrAdmin),
        arrivedAt: (initialArrival && isStaffOrAdmin) ? new Date() : undefined,
        verifiedByStaffId: (initialArrival && isStaffOrAdmin) ? user._id : '',
        verifiedByStaffName: (initialArrival && isStaffOrAdmin) ? user.name : '',
        gateNumber: gateNumber || ''
      },
      weighment: {
        grossWeight: 0,
        tareWeight: 0,
        netWeight: 0,
        unit
      },
      quality: {
        grade: 'FAQ',
        moisturePercentage: 0,
        foreignMatterPercentage: 0,
        damagedPercentage: 0,
        remarks: ''
      },
      decision: {
        decisionStatus: 'PENDING',
        acceptedQuantity: 0,
        rejectedQuantity: 0
      },
      pricing: {
        ratePerUnit: 0,
        totalAmount: 0,
        deductions: 0,
        netPayable: 0
      },
      payment: {
        status: 'PENDING',
        paidAmount: 0,
        paymentMethod: 'Direct Kendra Transfer'
      },
      status,
      statusHistory
    });

    res.status(201).json({
      message: 'Procurement lot created successfully',
      procurement: newProcurement
    });
  } catch (err: any) {
    console.error('Error creating procurement:', err);
    res.status(500).json({ error: err.message || 'Failed to create procurement record' });
  }
});

/**
 * POST /api/procurement/:id/verify-arrival
 * Staff verifies arrival of farmer with produce at the gate
 */
router.post('/:id/verify-arrival', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { gateNumber = 'Gate 1', vehicleNumber, bagsCount, notes } = req.body;

    const procurement = await ProcurementModel.findById(req.params.id);
    if (!procurement) {
      res.status(404).json({ error: 'Procurement record not found' });
      return;
    }

    if (procurement.status !== 'PENDING') {
      res.status(400).json({
        error: `Cannot verify arrival: current status is already "${procurement.status}"`
      });
      return;
    }

    procurement.arrival = {
      verified: true,
      arrivedAt: new Date(),
      verifiedByStaffId: user._id,
      verifiedByStaffName: user.name,
      gateNumber: gateNumber || procurement.arrival?.gateNumber || 'Gate 1'
    };

    if (vehicleNumber) procurement.produce.vehicleNumber = vehicleNumber.trim();
    if (bagsCount !== undefined) procurement.produce.bagsCount = Number(bagsCount) || 0;

    procurement.status = 'ARRIVED';
    procurement.statusHistory.push({
      status: 'ARRIVED',
      timestamp: new Date(),
      changedBy: `${user.name} (${user.role})`,
      notes: notes || `Arrival verified at ${gateNumber}`
    });

    await procurement.save();

    // Trigger notification: Farmer Arrival Verified
    notifyProcurementStatusChanged({
      userId: String(procurement.farmerId),
      userPhone: procurement.farmerPhone,
      procurementNumber: procurement.procurementNumber,
      cropName: procurement.produce?.cropName || 'Produce',
      status: 'ARRIVED'
    }).catch(() => {});

    res.json({
      message: 'Farmer arrival verified successfully',
      procurement
    });
  } catch (err: any) {
    console.error('Error verifying arrival:', err);
    res.status(500).json({ error: err.message || 'Failed to verify arrival' });
  }
});

/**
 * POST /api/procurement/:id/weighment
 * Staff records weighment on weighbridge (Gross, Tare -> Net = Gross - Tare)
 */
router.post('/:id/weighment', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      grossWeight,
      tareWeight = 0,
      unit = 'Quintal',
      weighbridgeSlipNumber = '',
      notes = ''
    } = req.body;

    const procurement = await ProcurementModel.findById(req.params.id);
    if (!procurement) {
      res.status(404).json({ error: 'Procurement record not found' });
      return;
    }

    // Status check
    const allowedStatuses = ['PENDING', 'ARRIVED', 'WEIGHED'];
    if (!allowedStatuses.includes(procurement.status)) {
      res.status(400).json({
        error: `Cannot record weighment on finalized/in-progress status "${procurement.status}"`
      });
      return;
    }

    const gross = Number(grossWeight);
    const tare = Number(tareWeight);

    if (isNaN(gross) || gross <= 0) {
      res.status(400).json({ error: 'Gross weight must be a positive number greater than 0' });
      return;
    }

    if (isNaN(tare) || tare < 0) {
      res.status(400).json({ error: 'Tare weight must be zero or a positive number' });
      return;
    }

    if (tare >= gross) {
      res.status(400).json({
        error: 'Gross weight must be strictly greater than Tare weight (Gross: ' + gross + ', Tare: ' + tare + ')'
      });
      return;
    }

    const net = Number((gross - tare).toFixed(2));
    if (net <= 0) {
      res.status(400).json({ error: 'Net weight calculation resulted in invalid weight <= 0' });
      return;
    }

    // Auto-verify arrival if not already verified
    if (!procurement.arrival?.verified) {
      procurement.arrival = {
        verified: true,
        arrivedAt: new Date(),
        verifiedByStaffId: user._id,
        verifiedByStaffName: user.name,
        gateNumber: 'Weighbridge Desk'
      };
    }

    procurement.weighment = {
      grossWeight: gross,
      tareWeight: tare,
      netWeight: net,
      unit: unit === 'Kg' ? 'Kg' : 'Quintal',
      weighbridgeSlipNumber: (weighbridgeSlipNumber || '').trim(),
      weighedAt: new Date(),
      weighedByStaffId: user._id,
      weighedByStaffName: user.name
    };

    procurement.status = 'WEIGHED';
    procurement.statusHistory.push({
      status: 'WEIGHED',
      timestamp: new Date(),
      changedBy: `${user.name} (${user.role})`,
      notes: notes || `Weighment recorded: Gross ${gross} ${unit}, Tare ${tare} ${unit}, Net ${net} ${unit}`
    });

    await procurement.save();

    // Trigger notification: Weighment Recorded
    notifyProcurementStatusChanged({
      userId: String(procurement.farmerId),
      userPhone: procurement.farmerPhone,
      procurementNumber: procurement.procurementNumber,
      cropName: procurement.produce?.cropName || 'Produce',
      status: 'WEIGHED',
      details: { netWeight: net, unit }
    }).catch(() => {});

    res.json({
      message: `Weighment recorded. Net weight: ${net} ${unit}`,
      procurement
    });
  } catch (err: any) {
    console.error('Error recording weighment:', err);
    res.status(500).json({ error: err.message || 'Failed to record weighment' });
  }
});

/**
 * POST /api/procurement/:id/quality-check
 * Staff inspects quality, assigns grade, and records accepted vs rejected quantities
 */
router.post('/:id/quality-check', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      grade = 'FAQ',
      moisturePercentage = 0,
      foreignMatterPercentage = 0,
      damagedPercentage = 0,
      acceptedQuantity,
      rejectedQuantity = 0,
      rejectionReason = '',
      remarks = ''
    } = req.body;

    const procurement = await ProcurementModel.findById(req.params.id);
    if (!procurement) {
      res.status(404).json({ error: 'Procurement record not found' });
      return;
    }

    // Allowed status transitions
    const allowed = ['WEIGHED', 'QUALITY_CHECKED'];
    if (!allowed.includes(procurement.status)) {
      res.status(400).json({
        error: `Cannot perform quality check. Current status must be WEIGHED, but is "${procurement.status}"`
      });
      return;
    }

    const netWeight = procurement.weighment?.netWeight || 0;
    if (netWeight <= 0) {
      res.status(400).json({ error: 'Net weight is zero or unrecorded. Complete weighment first.' });
      return;
    }

    const accepted = Number(acceptedQuantity);
    const rejected = Number(rejectedQuantity || 0);

    if (isNaN(accepted) || accepted < 0) {
      res.status(400).json({ error: 'Accepted quantity must be 0 or greater' });
      return;
    }

    if (isNaN(rejected) || rejected < 0) {
      res.status(400).json({ error: 'Rejected quantity must be 0 or greater' });
      return;
    }

    if (accepted === 0 && rejected === 0) {
      res.status(400).json({ error: 'At least one of accepted or rejected quantity must be greater than 0' });
      return;
    }

    // Strict validation: accepted + rejected <= netWeight (with small 0.05 float tolerance)
    const totalAssessed = Number((accepted + rejected).toFixed(2));
    if (totalAssessed > netWeight + 0.05) {
      res.status(400).json({
        error: `Accepted (${accepted}) + Rejected (${rejected}) = ${totalAssessed} exceeds total Net Weight (${netWeight})`
      });
      return;
    }

    if (rejected > 0 && !rejectionReason.trim()) {
      res.status(400).json({
        error: 'Rejection reason is required when rejected quantity is greater than 0'
      });
      return;
    }

    const validGrades = ['Grade A', 'Grade B', 'Grade C', 'FAQ', 'Below Standard'];
    const assignedGrade = validGrades.includes(grade) ? grade : 'FAQ';

    procurement.quality = {
      grade: assignedGrade,
      moisturePercentage: Number(moisturePercentage) || 0,
      foreignMatterPercentage: Number(foreignMatterPercentage) || 0,
      damagedPercentage: Number(damagedPercentage) || 0,
      remarks: (remarks || '').trim(),
      inspectedAt: new Date(),
      inspectedByStaffId: user._id,
      inspectedByStaffName: user.name
    };

    // Determine initial decision recommendation
    let decisionStatus: 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED' = 'ACCEPTED';
    if (accepted === 0 && rejected > 0) {
      decisionStatus = 'REJECTED';
    } else if (accepted > 0 && rejected > 0) {
      decisionStatus = 'PARTIALLY_ACCEPTED';
    }

    procurement.decision = {
      decisionStatus,
      acceptedQuantity: accepted,
      rejectedQuantity: rejected,
      rejectionReason: rejectionReason.trim(),
      decisionAt: new Date(),
      decidedByStaffId: user._id,
      decidedByStaffName: user.name
    };

    procurement.status = 'QUALITY_CHECKED';
    procurement.statusHistory.push({
      status: 'QUALITY_CHECKED',
      timestamp: new Date(),
      changedBy: `${user.name} (${user.role})`,
      notes: `Quality check completed: Grade ${assignedGrade}, Accepted: ${accepted}, Rejected: ${rejected}${rejectionReason ? ` (${rejectionReason})` : ''}`
    });

    await procurement.save();

    // Trigger notification: Quality Check Recorded
    notifyProcurementStatusChanged({
      userId: String(procurement.farmerId),
      userPhone: procurement.farmerPhone,
      procurementNumber: procurement.procurementNumber,
      cropName: procurement.produce?.cropName || 'Produce',
      status: 'QUALITY_CHECKED',
      details: { grade: assignedGrade, netWeight: procurement.weighment?.netWeight }
    }).catch(() => {});

    res.json({
      message: 'Quality check inspection recorded successfully',
      procurement
    });
  } catch (err: any) {
    console.error('Error during quality check:', err);
    res.status(500).json({ error: err.message || 'Failed to record quality check' });
  }
});

/**
 * POST /api/procurement/:id/decision
 * Staff/Admin confirms procurement decision with rate valuation (MSP/Kendra rate)
 */
router.post('/:id/decision', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      decisionStatus, // 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED'
      ratePerUnit = 0,
      deductions = 0,
      notes = ''
    } = req.body;

    const procurement = await ProcurementModel.findById(req.params.id);
    if (!procurement) {
      res.status(404).json({ error: 'Procurement record not found' });
      return;
    }

    const validStatuses = ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED'];
    if (!validStatuses.includes(decisionStatus)) {
      res.status(400).json({ error: 'Invalid decision status. Must be ACCEPTED, PARTIALLY_ACCEPTED, or REJECTED' });
      return;
    }

    const acceptedQty = procurement.decision?.acceptedQuantity || 0;
    const rate = Number(ratePerUnit);
    const deduct = Number(deductions) || 0;

    if (decisionStatus !== 'REJECTED' && acceptedQty > 0 && (isNaN(rate) || rate <= 0)) {
      res.status(400).json({ error: 'Valid procurement rate per unit is required for accepted quantity' });
      return;
    }

    const totalAmount = Math.round(acceptedQty * (rate || 0));
    const netPayable = Math.max(0, totalAmount - deduct);

    procurement.decision.decisionStatus = decisionStatus;
    procurement.decision.decisionAt = new Date();
    procurement.decision.decidedByStaffId = user._id;
    procurement.decision.decidedByStaffName = user.name;

    procurement.pricing = {
      ratePerUnit: rate,
      totalAmount,
      deductions: deduct,
      netPayable
    };

    procurement.status = decisionStatus;
    procurement.statusHistory.push({
      status: decisionStatus,
      timestamp: new Date(),
      changedBy: `${user.name} (${user.role})`,
      notes: notes || `Procurement decision: ${decisionStatus}. Rate: ₹${rate}/unit, Net Payable: ₹${netPayable}`
    });

    await procurement.save();

    // Trigger notification: Decision Recorded
    notifyProcurementStatusChanged({
      userId: String(procurement.farmerId),
      userPhone: procurement.farmerPhone,
      procurementNumber: procurement.procurementNumber,
      cropName: procurement.produce?.cropName || 'Produce',
      status: decisionStatus,
      details: { ratePerUnit: rate, netPayable }
    }).catch(() => {});

    res.json({
      message: `Procurement decision ${decisionStatus} saved successfully`,
      procurement
    });
  } catch (err: any) {
    console.error('Error confirming decision:', err);
    res.status(500).json({ error: err.message || 'Failed to record decision' });
  }
});

/**
 * POST /api/procurement/:id/complete
 * Finalizes procurement, locks weights/quality, and issues official receipt
 */
router.post('/:id/complete', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { notes = '' } = req.body;

    const procurement = await ProcurementModel.findById(req.params.id);
    if (!procurement) {
      res.status(404).json({ error: 'Procurement record not found' });
      return;
    }

    if (procurement.status === 'COMPLETED') {
      res.status(400).json({ error: 'Procurement record is already finalized and completed' });
      return;
    }

    const allowedPreStatuses = ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED'];
    if (!allowedPreStatuses.includes(procurement.status)) {
      res.status(400).json({
        error: `Cannot complete procurement from "${procurement.status}". Must be in ACCEPTED, PARTIALLY_ACCEPTED, or REJECTED status first.`
      });
      return;
    }

    const receiptRef = `RCP-${procurement.procurementNumber}`;
    procurement.status = 'COMPLETED';
    procurement.receiptReference = receiptRef;
    procurement.completedAt = new Date();

    procurement.statusHistory.push({
      status: 'COMPLETED',
      timestamp: new Date(),
      changedBy: `${user.name} (${user.role})`,
      notes: notes || `Finalized & Digital Receipt ${receiptRef} generated`
    });

    await procurement.save();

    // Trigger notification: Procurement Finalized & Receipt Issued
    notifyProcurementCompleted({
      userId: String(procurement.farmerId),
      userPhone: procurement.farmerPhone,
      procurementNumber: procurement.procurementNumber,
      receiptReference: receiptRef,
      cropName: procurement.produce?.cropName || 'Produce',
      netPayable: procurement.pricing?.netPayable
    }).catch(() => {});

    res.json({
      message: `Procurement finalized. Digital Receipt: ${receiptRef}`,
      procurement
    });
  } catch (err: any) {
    console.error('Error completing procurement:', err);
    res.status(500).json({ error: err.message || 'Failed to complete procurement' });
  }
});

/**
 * POST /api/procurement/:id/payment
 * Updates payment settlement status (PENDING, PAID, PARTIAL)
 * Transparent tracking of Direct Kendra Transfer / Cash / Cheque with reference
 */
router.post('/:id/payment', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      status, // 'PENDING' | 'PAID' | 'PARTIAL'
      paidAmount,
      paymentMethod = 'Direct Kendra Transfer',
      paymentReference = '',
      notes = ''
    } = req.body;

    const procurement = await ProcurementModel.findById(req.params.id);
    if (!procurement) {
      res.status(404).json({ error: 'Procurement record not found' });
      return;
    }

    const validPaymentStatuses = ['PENDING', 'PAID', 'PARTIAL'];
    if (!validPaymentStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid payment status. Must be PENDING, PAID, or PARTIAL' });
      return;
    }

    const amount = Number(paidAmount);
    if (status === 'PAID' || status === 'PARTIAL') {
      if (isNaN(amount) || amount <= 0) {
        res.status(400).json({ error: 'Paid amount must be greater than 0' });
        return;
      }
    }

    procurement.payment = {
      status,
      paidAmount: status === 'PENDING' ? 0 : amount,
      paymentMethod: paymentMethod || procurement.payment?.paymentMethod || 'Direct Kendra Transfer',
      paymentReference: (paymentReference || '').trim(),
      paidAt: status !== 'PENDING' ? new Date() : undefined,
      recordedBy: `${user.name} (${user.role})`,
      notes: (notes || '').trim()
    };

    procurement.statusHistory.push({
      status: procurement.status,
      timestamp: new Date(),
      changedBy: `${user.name} (${user.role})`,
      notes: `Payment status updated to ${status} (Amount: ₹${amount || 0}, Ref: ${paymentReference || 'N/A'})`
    });

    await procurement.save();

    // Trigger notification: Payment Status Updated
    notifyPaymentStatusChanged({
      userId: String(procurement.farmerId),
      userPhone: procurement.farmerPhone,
      procurementNumber: procurement.procurementNumber,
      paymentStatus: status,
      paidAmount: amount || 0,
      paymentMethod,
      paymentReference
    }).catch(() => {});

    res.json({
      message: `Payment status updated to ${status}`,
      procurement
    });
  } catch (err: any) {
    console.error('Error updating payment status:', err);
    res.status(500).json({ error: err.message || 'Failed to update payment status' });
  }
});

export default router;
