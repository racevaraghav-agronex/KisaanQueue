import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { TokenModel } from '../models/Token.ts';
import { UserModel } from '../models/User.ts';
import { ServiceModel, DEFAULT_SERVICES } from '../models/Service.ts';
import { BookingModel } from '../models/Booking.ts';
import { dbStatus } from '../db.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';
import {
  notifyTokenBooked,
  notifyTokenApproaching,
  notifyTokenCalled,
  notifyTokenCompleted,
  notifyTokenCancelled
} from '../utils/notificationService.ts';

const router = Router();

// Middleware to ensure MongoDB is connected
const ensureDb = (_req: any, res: Response, next: () => void) => {
  res.setHeader('Content-Type', 'application/json');
  if (!dbStatus.connected) {
    res.status(500).json({
      error: 'Database connection unavailable'
    });
    return;
  }
  next();
};

router.use(ensureDb);

// Helper to fetch service durations from MongoDB with fallback to defaults
async function getServiceDurationsMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const services = await ServiceModel.find({ isActive: { $ne: false } }).lean();
    if (services && services.length > 0) {
      services.forEach((s: any) => {
        const mins = Number(s.averageMinutes) || 10;
        if (s.code) map.set(s.code.toUpperCase(), mins);
        if (s.name) map.set(s.name.toLowerCase(), mins);
      });
    }
  } catch (err) {
    console.warn('Notice: Failed loading services from DB for durations:', err);
  }

  DEFAULT_SERVICES.forEach((s) => {
    if (!map.has(s.code.toUpperCase())) map.set(s.code.toUpperCase(), s.averageMinutes);
    if (!map.has(s.name.toLowerCase())) map.set(s.name.toLowerCase(), s.averageMinutes);
    if (s.id && !map.has(s.id.toLowerCase())) map.set(s.id.toLowerCase(), s.averageMinutes);
  });

  return map;
}

function getServiceDuration(serviceId?: string, serviceName?: string, map?: Map<string, number>): number {
  if (map) {
    if (serviceId && map.has(serviceId.toUpperCase())) return map.get(serviceId.toUpperCase())!;
    if (serviceName && map.has(serviceName.toLowerCase())) return map.get(serviceName.toLowerCase())!;
  }
  const fallback = DEFAULT_SERVICES.find(s =>
    (serviceId && (s.code.toUpperCase() === serviceId.toUpperCase() || s.id === serviceId)) ||
    (serviceName && s.name.toLowerCase() === serviceName.toLowerCase())
  );
  return fallback?.averageMinutes || 10;
}

// Smart Queue calculation engine
function calculateSmartQueueInfo({
  waitingTokens,
  targetIndex,
  servingTokens,
  serviceDurationsMap,
  tokenStatus
}: {
  waitingTokens: any[];
  targetIndex: number;
  servingTokens: any[];
  serviceDurationsMap: Map<string, number>;
  tokenStatus: string;
}) {
  const activeCounters = [...new Set(servingTokens.map((t: any) => t.counterNumber).filter(Boolean))] as number[];
  const activeCountersCount = Math.max(activeCounters.length, 1);
  const nextToken = waitingTokens[0]?.tokenNumber || null;

  if (tokenStatus === 'serving') {
    return {
      peopleAhead: 0,
      positionInQueue: 0,
      estimatedWaitMinutes: 0,
      estimatedWaitText: '0 min (Being served now)',
      estimatedTurnTime: 'Now at Counter',
      activeCounters,
      activeCountersCount,
      isTurnNear: true,
      isServingNow: true,
      nextToken
    };
  }

  if (targetIndex < 0 || tokenStatus !== 'waiting') {
    return {
      peopleAhead: 0,
      positionInQueue: 0,
      estimatedWaitMinutes: 0,
      estimatedWaitText: 'Completed / Inactive',
      estimatedTurnTime: '—',
      activeCounters,
      activeCountersCount,
      isTurnNear: false,
      isServingNow: false,
      nextToken
    };
  }

  // Exactly how many waiting tokens are ahead of this farmer (0-based index)
  const peopleAhead = Math.max(0, targetIndex);
  const positionInQueue = targetIndex + 1;

  // Sum durations of all waiting tokens preceding this farmer
  const preceding = waitingTokens.slice(0, targetIndex);
  const precedingMinutes = preceding.reduce((acc: number, t: any) => {
    return acc + getServiceDuration(t.serviceId, t.serviceName, serviceDurationsMap);
  }, 0);

  // Remaining time allowance for currently serving tokens at active counters
  let servingRemaining = 0;
  if (servingTokens.length > 0) {
    const totalServingMins = servingTokens.reduce((acc: number, t: any) => {
      return acc + getServiceDuration(t.serviceId, t.serviceName, serviceDurationsMap);
    }, 0);
    const avgServingMins = totalServingMins / servingTokens.length;
    servingRemaining = Math.max(2, Math.round(avgServingMins * 0.5));
  } else {
    servingRemaining = 1;
  }

  const rawEstimated = (servingRemaining + precedingMinutes) / activeCountersCount;
  const estimatedWaitMinutes = Math.max(1, Math.round(rawEstimated));
  const estimatedWaitText = `~${estimatedWaitMinutes} minutes`;

  const turnTime = new Date(Date.now() + estimatedWaitMinutes * 60000);
  const estimatedTurnTime = `Around ${turnTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

  const isTurnNear = peopleAhead <= 2;

  return {
    peopleAhead,
    positionInQueue,
    estimatedWaitMinutes,
    estimatedWaitText,
    estimatedTurnTime,
    activeCounters,
    activeCountersCount,
    isTurnNear,
    isServingNow: false,
    nextToken
  };
}

// Helper to compute estimated wait time and queue statistics from MongoDB (supporting centre-specific queue)
async function getQueueMetrics(centre?: string) {
  const queryCentre = centre
    ? { $or: [{ centre }, { centre: { $exists: false } }, { centre: null }] }
    : {};

  const waitingTokens = await TokenModel.find({ status: 'waiting', ...queryCentre }).sort({ sequence: 1 });
  const servingTokens = await TokenModel.find({ status: { $in: ['called', 'serving'] }, ...queryCentre }).sort({ servedAt: -1, calledAt: -1 });
  const heldTokens = await TokenModel.find({ status: 'hold', ...queryCentre }).sort({ holdAt: -1 });
  const completedCount = await TokenModel.countDocuments({ status: 'completed', ...queryCentre });
  const skippedCount = await TokenModel.countDocuments({ status: 'skipped', ...queryCentre });
  const totalTokens = await TokenModel.countDocuments(queryCentre);

  // Active staff on shift
  const activeStaff = await UserModel.find({
    role: 'staff',
    status: { $ne: 'inactive' },
    shiftStatus: 'active',
    ...(centre ? { centre } : {})
  });

  const staffCounters = activeStaff.map(s => s.counterNumber).filter(Boolean) as number[];
  const servingCounters = servingTokens.map((t: any) => t.counterNumber).filter(Boolean) as number[];
  const allActiveCounters = Array.from(new Set([...staffCounters, ...servingCounters])).sort((a, b) => a - b);

  const serviceDurationsMap = await getServiceDurationsMap();
  const queueOverview = calculateSmartQueueInfo({
    waitingTokens,
    targetIndex: 0,
    servingTokens,
    serviceDurationsMap,
    tokenStatus: 'waiting'
  });

  return {
    waitingTokens,
    servingTokens,
    heldTokens,
    waitingCount: waitingTokens.length,
    servingCount: servingTokens.length,
    heldCount: heldTokens.length,
    calledCount: servingTokens.filter((t: any) => t.status === 'called').length,
    completedCount,
    skippedCount,
    totalTokens,
    estimatedWaitMinutes: waitingTokens.length === 0 ? 0 : queueOverview.estimatedWaitMinutes,
    estimatedWaitText: waitingTokens.length === 0 ? 'No queue waiting' : queueOverview.estimatedWaitText,
    activeCounters: allActiveCounters.length > 0 ? allActiveCounters : queueOverview.activeCounters,
    activeCountersCount: allActiveCounters.length > 0 ? allActiveCounters.length : queueOverview.activeCountersCount,
    nextToken: queueOverview.nextToken,
    serviceDurationsMap
  };
}

// 1. Get available services list from MongoDB
router.get('/services', async (_req, res): Promise<void> => {
  try {
    const services = await ServiceModel.find({ isActive: { $ne: false } }).sort({ name: 1 });
    if (services && services.length > 0) {
      const formatted = services.map((s: any) => ({
        _id: s._id ? s._id.toString() : undefined,
        id: s.code ? s.code.toLowerCase() : (s._id ? s._id.toString() : 'service'),
        code: s.code || '',
        name: s.name,
        description: s.description,
        averageMinutes: s.averageMinutes || 10,
        category: s.category || 'General',
        fee: s.fee || 0,
        isActive: s.isActive !== false
      }));
      res.json(formatted);
      return;
    }
    res.json(DEFAULT_SERVICES.map(s => ({ ...s, fee: 0, isActive: true })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch services from MongoDB' });
  }
});

// 2. Get Public / Live Queue Status from MongoDB (with optional centre filter)
router.get('/live-queue', async (req, res): Promise<void> => {
  try {
    const centre = (req.query.centre as string)?.trim() || undefined;
    const metrics = await getQueueMetrics(centre);

    const waitingQueue = metrics.waitingTokens.map((t: any, index: number) => {
      const qInfo = calculateSmartQueueInfo({
        waitingTokens: metrics.waitingTokens,
        targetIndex: index,
        servingTokens: metrics.servingTokens,
        serviceDurationsMap: metrics.serviceDurationsMap,
        tokenStatus: t.status
      });

      return {
        _id: t._id.toString(),
        tokenNumber: t.tokenNumber,
        sequence: t.sequence,
        farmerName: t.farmerName,
        farmerPhone: t.farmerPhone,
        serviceName: t.serviceName,
        serviceId: t.serviceId,
        status: t.status,
        centre: t.centre,
        issuedAt: t.issuedAt,
        bookingReference: t.bookingReference || null,
        slotString: t.slotString || null,
        bookedDate: t.bookedDate || null,
        positionInQueue: qInfo.positionInQueue,
        peopleAhead: qInfo.peopleAhead,
        estimatedWaitMinutes: qInfo.estimatedWaitMinutes,
        estimatedWaitText: qInfo.estimatedWaitText,
        estimatedTurnTime: qInfo.estimatedTurnTime,
        isTurnNear: qInfo.isTurnNear
      };
    });

    res.json({
      centre: centre || 'All Centres',
      waitingCount: metrics.waitingCount,
      servingCount: metrics.servingCount,
      heldCount: metrics.heldCount,
      calledCount: metrics.calledCount,
      completedCount: metrics.completedCount,
      skippedCount: metrics.skippedCount,
      totalTokens: metrics.totalTokens,
      estimatedWaitMinutes: metrics.estimatedWaitMinutes,
      estimatedWaitText: metrics.estimatedWaitText,
      activeCounters: metrics.activeCounters,
      activeCountersCount: metrics.activeCountersCount,
      nextToken: metrics.nextToken,
      currentlyServing: metrics.servingTokens,
      heldTokens: metrics.heldTokens,
      waitingQueue,
      dbStatus: {
        type: 'mongodb',
        connected: true
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch queue status from MongoDB' });
  }
});

// Safe Public Verification Endpoint for QR Code and Reference Lookup
router.get('/verify/:reference', async (req, res): Promise<void> => {
  try {
    const rawRef = String(req.params.reference || '').trim();
    if (!rawRef) {
      res.status(400).json({ valid: false, error: 'Token or booking reference is required for verification.' });
      return;
    }

    const upperRef = rawRef.toUpperCase();

    // 1. Search in TokenModel
    let token = await TokenModel.findOne({
      $or: [
        { tokenNumber: upperRef },
        { bookingReference: upperRef },
        { _id: mongoose.isValidObjectId(rawRef) ? rawRef : undefined }
      ].filter(Boolean) as any[]
    });

    // 2. Search in BookingModel if not found or to enrich booking details
    let booking = null;
    if (!token) {
      booking = await BookingModel.findOne({
        $or: [
          { bookingReference: upperRef },
          { tokenNumber: upperRef },
          { _id: mongoose.isValidObjectId(rawRef) ? rawRef : undefined }
        ].filter(Boolean) as any[]
      });
    } else if (token.bookingReference || token.bookingId) {
      booking = await BookingModel.findOne({
        $or: [
          { bookingReference: token.bookingReference },
          { _id: mongoose.isValidObjectId(token.bookingId) ? token.bookingId : undefined }
        ].filter(Boolean) as any[]
      });
    }

    if (!token && !booking) {
      res.status(404).json({
        valid: false,
        reference: rawRef,
        error: 'No active or historical record found for this token or booking reference.'
      });
      return;
    }

    const tokenNumber = token?.tokenNumber || booking?.tokenNumber || 'SLOT-BOOKING';
    const bookingReference = booking?.bookingReference || token?.bookingReference || null;
    const serviceName = token?.serviceName || booking?.serviceName || 'Agricultural Consultation';
    const serviceCode = token?.serviceId || booking?.serviceCode || 'AGRI';
    const centre = booking?.centre || 'Krishi Seva Kendra - Main Centre';
    const date = token?.bookedDate || booking?.date || (token?.issuedAt ? new Date(token.issuedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const slotString = token?.slotString || booking?.slotString || (token ? 'Walk-in Token' : 'Booked Slot');
    const status = (token?.status || booking?.status || 'WAITING').toUpperCase();
    const counterNumber = token?.counterNumber || null;
    const issuedAt = token?.issuedAt || booking?.createdAt;
    const completedAt = token?.completedAt || booking?.completedAt || null;

    res.json({
      valid: true,
      reference: rawRef,
      tokenNumber,
      bookingReference,
      serviceName,
      serviceCode,
      centre,
      date,
      slotString,
      status,
      counterNumber,
      issuedAt,
      completedAt,
      verificationSource: 'AgroNex Kisan Queue Official Verification Registry',
      verificationSeal: 'AN-KQ-AUTHENTIC-SEAL',
      verifiedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message || 'Verification process failed' });
  }
});

// 3. Farmer: Get current active token for logged in farmer from MongoDB
router.get('/farmer/my-token', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const metrics = await getQueueMetrics();

    // Find active token in MongoDB
    const activeToken = await TokenModel.findOne({
      farmerId: userId,
      status: { $in: ['waiting', 'serving'] }
    });

    const pastTokens = await TokenModel.find({
      farmerId: userId,
      status: { $in: ['completed', 'skipped', 'cancelled'] }
    }).sort({ issuedAt: -1 }).limit(10);

    let queueInfo = null;

    if (activeToken) {
      const idx = metrics.waitingTokens.findIndex((t: any) =>
        t._id.toString() === activeToken._id.toString() || t.tokenNumber === activeToken.tokenNumber
      );
      queueInfo = calculateSmartQueueInfo({
        waitingTokens: metrics.waitingTokens,
        targetIndex: idx,
        servingTokens: metrics.servingTokens,
        serviceDurationsMap: metrics.serviceDurationsMap,
        tokenStatus: activeToken.status
      });
    }

    res.json({
      activeToken: activeToken ? {
        ...activeToken.toObject(),
        ...queueInfo
      } : null,
      currentlyServing: metrics.servingTokens,
      activeCounters: metrics.activeCounters,
      activeCountersCount: metrics.activeCountersCount,
      nextToken: metrics.nextToken,
      pastTokens
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch farmer token from MongoDB' });
  }
});

// 4. Farmer: Generate new Token in MongoDB (prevent duplicate active tokens)
router.post('/generate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceId, notes } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'User session invalid' });
      return;
    }

    if (user.status === 'inactive') {
      res.status(403).json({ error: 'Your account has been deactivated. Please contact the Kendra administration.' });
      return;
    }

    if (!serviceId) {
      res.status(400).json({ error: 'Please select an agricultural service.' });
      return;
    }

    // Find service metadata from MongoDB or fallback metadata
    let serviceInfo = await ServiceModel.findOne({ $or: [{ code: serviceId }, { id: serviceId }] });
    if (!serviceInfo) {
      serviceInfo = DEFAULT_SERVICES.find(s => s.id === serviceId || s.code === serviceId) as any;
    }

    if (serviceInfo && serviceInfo.isActive === false) {
      res.status(400).json({ error: 'This service is currently unavailable. Please select another active service.' });
      return;
    }

    const sName = serviceInfo?.name || 'General Agriculture Consultation';
    const sId = serviceInfo?.code || serviceId;

    // Check if farmer already has an active token in MongoDB
    const existingActiveToken = await TokenModel.findOne({
      farmerId: user._id,
      status: { $in: ['waiting', 'serving'] }
    });

    if (existingActiveToken) {
      res.status(409).json({
        error: 'You already have an active token in the queue! Only one active token is permitted per farmer to prevent duplicates.',
        existingToken: existingActiveToken
      });
      return;
    }

    // Generate next sequence from MongoDB
    const latestToken = await TokenModel.findOne().sort({ sequence: -1 });
    const nextSequence = latestToken ? latestToken.sequence + 1 : 101;
    const tokenNumber = `KQ-${nextSequence}`;

    const newToken = await TokenModel.create({
      tokenNumber,
      sequence: nextSequence,
      farmerId: user._id,
      farmerName: user.name,
      farmerPhone: user.phone,
      serviceId: sId,
      serviceName: sName,
      status: 'waiting',
      issuedAt: new Date(),
      notes: notes || ''
    });

    const metrics = await getQueueMetrics();
    const targetIndex = metrics.waitingTokens.length - 1;
    const queueInfo = calculateSmartQueueInfo({
      waitingTokens: metrics.waitingTokens,
      targetIndex: Math.max(0, targetIndex),
      servingTokens: metrics.servingTokens,
      serviceDurationsMap: metrics.serviceDurationsMap,
      tokenStatus: 'waiting'
    });

    // Notify farmer: Token Booked
    notifyTokenBooked({
      userId: String(user._id),
      userPhone: user.phone,
      tokenNumber: newToken.tokenNumber,
      serviceName: newToken.serviceName,
      estimatedWaitMinutes: queueInfo.estimatedWaitMinutes,
      positionInQueue: queueInfo.positionInQueue
    }).catch(err => console.warn('Notification trigger error:', err));

    res.status(201).json({
      message: 'Token issued and saved in MongoDB',
      token: {
        ...newToken.toObject(),
        ...queueInfo
      },
      currentlyServing: metrics.servingTokens
    });
  } catch (err: any) {
    console.error('Generate token error:', err);
    res.status(500).json({ error: err.message || 'Error generating token in MongoDB' });
  }
});

// Single Token Status Endpoint: GET /api/tokens/:tokenId/status
router.get('/:tokenId/status', async (req, res): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const query = mongoose.isValidObjectId(tokenId)
      ? { $or: [{ _id: tokenId }, { tokenNumber: tokenId.toUpperCase() }] }
      : { tokenNumber: tokenId.toUpperCase() };

    const token = await TokenModel.findOne(query);
    if (!token) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    res.json({
      tokenNumber: token.tokenNumber,
      status: token.status,
      counterNumber: token.counterNumber || null,
      serviceName: token.serviceName,
      issuedAt: token.issuedAt,
      servedAt: token.servedAt || null,
      completedAt: token.completedAt || null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch token status' });
  }
});

// Single Token Queue Position: GET /api/tokens/:tokenId/queue-position
router.get('/:tokenId/queue-position', async (req, res): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const query = mongoose.isValidObjectId(tokenId)
      ? { $or: [{ _id: tokenId }, { tokenNumber: tokenId.toUpperCase() }] }
      : { tokenNumber: tokenId.toUpperCase() };

    const token = await TokenModel.findOne(query);
    if (!token) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    const metrics = await getQueueMetrics();
    const idx = metrics.waitingTokens.findIndex((t: any) =>
      t._id.toString() === token._id.toString() || t.tokenNumber === token.tokenNumber
    );

    const queueInfo = calculateSmartQueueInfo({
      waitingTokens: metrics.waitingTokens,
      targetIndex: idx,
      servingTokens: metrics.servingTokens,
      serviceDurationsMap: metrics.serviceDurationsMap,
      tokenStatus: token.status
    });

    res.json({
      tokenNumber: token.tokenNumber,
      status: token.status,
      counterNumber: token.counterNumber || null,
      currentlyServing: metrics.servingTokens,
      ...queueInfo
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to calculate queue position' });
  }
});

// Single Token ETA: GET /api/tokens/:tokenId/eta
router.get('/:tokenId/eta', async (req, res): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const query = mongoose.isValidObjectId(tokenId)
      ? { $or: [{ _id: tokenId }, { tokenNumber: tokenId.toUpperCase() }] }
      : { tokenNumber: tokenId.toUpperCase() };

    const token = await TokenModel.findOne(query);
    if (!token) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    const metrics = await getQueueMetrics();
    const idx = metrics.waitingTokens.findIndex((t: any) =>
      t._id.toString() === token._id.toString() || t.tokenNumber === token.tokenNumber
    );

    const queueInfo = calculateSmartQueueInfo({
      waitingTokens: metrics.waitingTokens,
      targetIndex: idx,
      servingTokens: metrics.servingTokens,
      serviceDurationsMap: metrics.serviceDurationsMap,
      tokenStatus: token.status
    });

    const avgMins = getServiceDuration(token.serviceId, token.serviceName, metrics.serviceDurationsMap);

    res.json({
      tokenNumber: token.tokenNumber,
      serviceName: token.serviceName,
      serviceAverageMinutes: avgMins,
      estimatedWaitMinutes: queueInfo.estimatedWaitMinutes,
      estimatedWaitText: queueInfo.estimatedWaitText,
      estimatedTurnTime: queueInfo.estimatedTurnTime,
      peopleAhead: queueInfo.peopleAhead,
      activeCountersCount: queueInfo.activeCountersCount,
      isTurnNear: queueInfo.isTurnNear
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to calculate ETA' });
  }
});

// 5. Farmer: Cancel own waiting token in MongoDB
const handleCancelToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const userId = req.user?._id;

    const token = await TokenModel.findOne({ _id: tokenId, farmerId: userId });
    if (!token) {
      res.status(404).json({ error: 'Token not found or does not belong to you.' });
      return;
    }
    if (token.status !== 'waiting') {
      res.status(400).json({ error: 'Cannot cancel a token that is already serving or completed.' });
      return;
    }

    token.status = 'cancelled';
    token.completedAt = new Date();
    await token.save();

    // Trigger notification: Token Cancelled
    notifyTokenCancelled({
      userId: String(token.farmerId),
      userPhone: token.farmerPhone,
      tokenNumber: token.tokenNumber,
      serviceName: token.serviceName,
      reason: 'Cancelled by farmer'
    }).catch(() => {});

    res.json({ message: 'Token cancelled successfully in MongoDB', token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to cancel token' });
  }
};

router.post('/cancel/:tokenId', authenticate, handleCancelToken);
router.post('/:tokenId/cancel', authenticate, handleCancelToken);
router.put('/:tokenId/cancel', authenticate, handleCancelToken);

// 6. Staff / Admin: Call Next Token in MongoDB (with atomic concurrency protection & shift check)
const handleCallNextToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = req.user!;
    
    // Check shift status in database to avoid stale JWT state
    const staffUser = await UserModel.findById(staff._id);
    const shift = staffUser?.shiftStatus || staff.shiftStatus || 'active';
    if (shift === 'break') {
      res.status(400).json({
        error: 'You are currently marked On Break. Please switch your shift status to Active before calling the next token.'
      });
      return;
    }
    if (shift === 'offline') {
      res.status(400).json({
        error: 'You are currently marked Offline. Please switch your shift status to Active before calling tokens.'
      });
      return;
    }

    const counterNumber = Number(req.body.counterNumber || staffUser?.counterNumber || staff.counterNumber || 1);
    const targetCentre = staffUser?.centre || staff.centre || req.body.centre || 'Krishi Seva Kendra - Main Centre';

    // Check if counter already has an active called or serving token
    const existingActive = await TokenModel.findOne({
      status: { $in: ['called', 'serving'] },
      counterNumber
    });

    if (existingActive) {
      res.status(400).json({
        error: `Counter ${counterNumber} is currently serving Token ${existingActive.tokenNumber} (${existingActive.farmerName}). Please complete, hold, or skip this token before calling the next one.`,
        activeToken: existingActive
      });
      return;
    }

    // Concurrency protection: atomically claim the next waiting token in this centre
    const nextToken = await TokenModel.findOneAndUpdate(
      {
        status: 'waiting',
        $or: [{ centre: targetCentre }, { centre: { $exists: false } }, { centre: null }]
      },
      {
        $set: {
          status: 'called',
          calledAt: new Date(),
          servedAt: new Date(),
          counterNumber,
          staffId: staff._id,
          staffName: staff.name,
          centre: targetCentre,
          recallCount: 1
        }
      },
      {
        sort: { sequence: 1 },
        new: true
      }
    );

    if (!nextToken) {
      res.status(404).json({ error: 'No farmers are currently waiting in queue for this centre.' });
      return;
    }

    // Trigger notification: Token Called to Counter
    notifyTokenCalled({
      userId: String(nextToken.farmerId),
      userPhone: nextToken.farmerPhone,
      tokenNumber: nextToken.tokenNumber,
      counterNumber,
      serviceName: nextToken.serviceName,
      staffName: staff.name
    }).catch(() => {});

    // Check subsequent waiting tokens to notify that their turn is approaching
    TokenModel.find({
      status: 'waiting',
      $or: [{ centre: targetCentre }, { centre: { $exists: false } }, { centre: null }]
    })
      .sort({ sequence: 1 })
      .limit(2)
      .then(upcoming => {
        if (upcoming && upcoming.length > 0) {
          upcoming.forEach((upToken: any, idx: number) => {
            notifyTokenApproaching({
              userId: String(upToken.farmerId),
              userPhone: upToken.farmerPhone,
              tokenNumber: upToken.tokenNumber,
              serviceName: upToken.serviceName,
              peopleAhead: idx + 1,
              counterNumber
            }).catch(() => {});
          });
        }
      })
      .catch(() => {});

    res.json({
      message: `Token ${nextToken.tokenNumber} called to Counter ${counterNumber}`,
      token: nextToken
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to call next token in MongoDB' });
  }
};

router.post('/call-next', authenticate, requireRole(['staff', 'admin']), handleCallNextToken);
router.post('/staff/call-next', authenticate, requireRole(['staff', 'admin']), handleCallNextToken);

// 7. Staff / Admin: Re-announce / Recall Token
const handleRecallToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const staff = req.user!;
    const counterNumber = Number(req.body.counterNumber || staff.counterNumber || 1);

    const token = await TokenModel.findById(tokenId);
    if (!token) {
      res.status(404).json({ error: 'Token not found in MongoDB' });
      return;
    }

    if (!['called', 'serving'].includes(token.status)) {
      res.status(400).json({ error: `Cannot recall token in '${token.status}' state.` });
      return;
    }

    token.status = 'called';
    token.calledAt = new Date();
    token.counterNumber = counterNumber;
    token.staffId = staff._id;
    token.staffName = staff.name;
    token.recallCount = (token.recallCount || 0) + 1;
    await token.save();

    // Trigger notification: Token Recalled
    notifyTokenCalled({
      userId: String(token.farmerId),
      userPhone: token.farmerPhone,
      tokenNumber: token.tokenNumber,
      counterNumber,
      serviceName: token.serviceName,
      staffName: staff.name
    }).catch(() => {});

    res.json({
      message: `Token ${token.tokenNumber} recalled to Counter ${counterNumber} (Call #${token.recallCount})`,
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to recall token in MongoDB' });
  }
};

router.post('/:tokenId/recall', authenticate, requireRole(['staff', 'admin']), handleRecallToken);
router.post('/staff/recall/:tokenId', authenticate, requireRole(['staff', 'admin']), handleRecallToken);

// 8. Staff / Admin: Transition from Called to Serving
const handleStartServingToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const token = await TokenModel.findById(tokenId);
    if (!token) {
      res.status(404).json({ error: 'Token not found in MongoDB' });
      return;
    }

    token.status = 'serving';
    token.servedAt = token.servedAt || new Date();
    await token.save();

    res.json({ message: `Token ${token.tokenNumber} is now serving at Counter ${token.counterNumber || 1}`, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update token to serving' });
  }
};

router.put('/:tokenId/start-serving', authenticate, requireRole(['staff', 'admin']), handleStartServingToken);
router.post('/:tokenId/start-serving', authenticate, requireRole(['staff', 'admin']), handleStartServingToken);

// 9. Staff / Admin: Place Token on Hold
const handleHoldToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const { reason } = req.body;

    const token = await TokenModel.findById(tokenId);
    if (!token) {
      res.status(404).json({ error: 'Token not found in MongoDB' });
      return;
    }

    if (!['called', 'serving'].includes(token.status)) {
      res.status(400).json({ error: `Cannot put token with status '${token.status}' on hold.` });
      return;
    }

    token.status = 'hold';
    token.holdAt = new Date();
    token.holdReason = reason || 'Farmer requested hold / awaiting documents or verification';
    // Clear counter assignment to free the counter for other farmers
    token.counterNumber = undefined;
    await token.save();

    res.json({
      message: `Token ${token.tokenNumber} put on hold: ${token.holdReason}`,
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to put token on hold in MongoDB' });
  }
};

router.put('/:tokenId/hold', authenticate, requireRole(['staff', 'admin']), handleHoldToken);
router.post('/:tokenId/hold', authenticate, requireRole(['staff', 'admin']), handleHoldToken);
router.post('/staff/hold/:tokenId', authenticate, requireRole(['staff', 'admin']), handleHoldToken);

// 10. Staff / Admin: Resume Held Token
const handleResumeToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const staff = req.user!;
    const counterNumber = Number(req.body.counterNumber || staff.counterNumber || 1);

    // Check if counter is currently occupied
    const existingActive = await TokenModel.findOne({
      status: { $in: ['called', 'serving'] },
      counterNumber
    });

    if (existingActive) {
      res.status(400).json({
        error: `Counter ${counterNumber} is currently serving Token ${existingActive.tokenNumber}. Please complete, hold, or skip the active token before resuming a held token.`
      });
      return;
    }

    const token = await TokenModel.findById(tokenId);
    if (!token) {
      res.status(404).json({ error: 'Token not found in MongoDB' });
      return;
    }

    if (token.status !== 'hold') {
      res.status(400).json({ error: `Only held tokens can be resumed. Current status is '${token.status}'.` });
      return;
    }

    token.status = 'serving';
    token.servedAt = new Date();
    token.counterNumber = counterNumber;
    token.staffId = staff._id;
    token.staffName = staff.name;
    await token.save();

    res.json({
      message: `Token ${token.tokenNumber} resumed at Counter ${counterNumber}`,
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resume token in MongoDB' });
  }
};

router.put('/:tokenId/resume', authenticate, requireRole(['staff', 'admin']), handleResumeToken);
router.post('/:tokenId/resume', authenticate, requireRole(['staff', 'admin']), handleResumeToken);
router.post('/staff/resume/:tokenId', authenticate, requireRole(['staff', 'admin']), handleResumeToken);

// 11. Staff / Admin: Complete Token in MongoDB
const handleCompleteToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const { notes } = req.body;

    const token = await TokenModel.findById(tokenId);
    if (!token) {
      res.status(404).json({ error: 'Token not found in MongoDB' });
      return;
    }

    if (!['called', 'serving', 'hold'].includes(token.status)) {
      res.status(400).json({ error: `Cannot complete token in '${token.status}' state.` });
      return;
    }

    token.status = 'completed';
    token.completedAt = new Date();
    if (notes) token.notes = notes;
    await token.save();

    // Trigger notification: Token Completed
    notifyTokenCompleted({
      userId: String(token.farmerId),
      userPhone: token.farmerPhone,
      tokenNumber: token.tokenNumber,
      serviceName: token.serviceName,
      counterNumber: token.counterNumber
    }).catch(() => {});

    res.json({ message: `Token ${token.tokenNumber} marked as Completed`, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to complete token in MongoDB' });
  }
};

router.put('/:tokenId/complete', authenticate, requireRole(['staff', 'admin']), handleCompleteToken);
router.post('/:tokenId/complete', authenticate, requireRole(['staff', 'admin']), handleCompleteToken);
router.post('/staff/complete/:tokenId', authenticate, requireRole(['staff', 'admin']), handleCompleteToken);

// 12. Staff / Admin: Skip Token in MongoDB
const handleSkipToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const { reason } = req.body;

    const token = await TokenModel.findById(tokenId);
    if (!token) {
      res.status(404).json({ error: 'Token not found in MongoDB' });
      return;
    }

    if (!['called', 'serving', 'hold'].includes(token.status)) {
      res.status(400).json({ error: `Cannot skip token in '${token.status}' state.` });
      return;
    }

    token.status = 'skipped';
    token.completedAt = new Date();
    token.notes = reason || 'Farmer did not report after multiple announcements.';
    await token.save();

    // Trigger notification: Token Skipped
    notifyTokenCancelled({
      userId: String(token.farmerId),
      userPhone: token.farmerPhone,
      tokenNumber: token.tokenNumber,
      serviceName: token.serviceName,
      reason: token.notes
    }).catch(() => {});

    res.json({ message: `Token ${token.tokenNumber} skipped: ${token.notes}`, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to skip token in MongoDB' });
  }
};

router.put('/:tokenId/skip', authenticate, requireRole(['staff', 'admin']), handleSkipToken);
router.post('/:tokenId/skip', authenticate, requireRole(['staff', 'admin']), handleSkipToken);
router.post('/staff/skip/:tokenId', authenticate, requireRole(['staff', 'admin']), handleSkipToken);

// 13. Get Held Tokens (for Staff Desk)
router.get('/held', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = req.user!;
    const centre = (req.query.centre as string) || staff.centre || undefined;
    const query: any = { status: 'hold' };
    if (centre) {
      query.$or = [{ centre }, { centre: { $exists: false } }, { centre: null }];
    }
    const heldTokens = await TokenModel.find(query).sort({ holdAt: -1 });
    res.json(heldTokens);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch held tokens from MongoDB' });
  }
});

// 14. Search Tokens & Farmer Bookings (for Staff Search Bar)
router.get('/search', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json([]);
      return;
    }

    const cleanQ = q.replace(/[-\s]/g, '');
    const query: any = {
      $or: [
        { tokenNumber: { $regex: q, $options: 'i' } },
        { farmerName: { $regex: q, $options: 'i' } },
        { farmerPhone: { $regex: cleanQ || q, $options: 'i' } },
        { bookingReference: { $regex: q, $options: 'i' } },
        { serviceName: { $regex: q, $options: 'i' } }
      ]
    };

    if (req.query.centre) {
      query.centre = req.query.centre;
    }

    const tokens = await TokenModel.find(query).sort({ issuedAt: -1 }).limit(25);
    res.json(tokens);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to search tokens in MongoDB' });
  }
});

// 15. Staff: Update Shift Status and Assigned Counter
router.put('/staff/shift', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = req.user!;
    const { shiftStatus, counterNumber, centre } = req.body;

    const user = await UserModel.findById(staff._id);
    if (!user) {
      res.status(404).json({ error: 'Staff user not found in MongoDB' });
      return;
    }

    if (shiftStatus && ['active', 'break', 'offline'].includes(shiftStatus)) {
      user.shiftStatus = shiftStatus;
    }

    if (counterNumber !== undefined) {
      const c = Number(counterNumber);
      if (!isNaN(c) && c >= 1 && c <= 6) {
        user.counterNumber = c;
      }
    }

    if (centre && typeof centre === 'string' && centre.trim()) {
      user.centre = centre.trim();
    }

    await user.save();

    res.json({
      message: 'Staff shift status and counter updated successfully in MongoDB',
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        counterNumber: user.counterNumber,
        centre: user.centre,
        shiftStatus: user.shiftStatus,
        assignedService: user.assignedService
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update staff shift status' });
  }
});

export default router;
