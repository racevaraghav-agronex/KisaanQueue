import { Router, Response, NextFunction } from 'express';
import { SlotModel } from '../models/Slot.ts';
import { BookingModel } from '../models/Booking.ts';
import { ServiceModel, DEFAULT_SERVICES } from '../models/Service.ts';
import { TokenModel } from '../models/Token.ts';
import { dbStatus } from '../db.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';
import {
  notifySlotConfirmed,
  notifySlotCancelled,
  notifySlotRescheduled
} from '../utils/notificationService.ts';

const router = Router();

// Ensure MongoDB is connected
const ensureDb = (_req: any, res: Response, next: () => void) => {
  res.setHeader('Content-Type', 'application/json');
  if (!dbStatus.connected) {
    res.status(503).json({ error: 'Database connection unavailable' });
    return;
  }
  next();
};

router.use(ensureDb);

// Helper to format 24-hr time 'HH:mm' to 12-hr format 'hh:mm AM/PM'
export function formatTo12Hour(time24: string): string {
  const [hourStr, minStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const min = minStr || '00';
  const period = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour -= 12;
  }
  const displayHour = hour < 10 ? `0${hour}` : `${hour}`;
  return `${displayHour}:${min} ${period}`;
}

// Generate slot string e.g. "09:00 AM – 09:30 AM"
export function generateSlotString(startTime: string, endTime: string): string {
  return `${formatTo12Hour(startTime)} – ${formatTo12Hour(endTime)}`;
}

// Helper to generate time slots based on service working hours and duration
export function generateTimeSlots(
  startHourStr = '09:00',
  endHourStr = '17:00',
  durationMinutes = 30
): Array<{ startTime: string; endTime: string; slotString: string }> {
  const slots: Array<{ startTime: string; endTime: string; slotString: string }> = [];

  const [startH, startM] = startHourStr.split(':').map(Number);
  const [endH, endM] = endHourStr.split(':').map(Number);

  let currentMinutes = startH * 60 + (startM || 0);
  const totalEndMinutes = endH * 60 + (endM || 0);

  while (currentMinutes + durationMinutes <= totalEndMinutes) {
    const sH = Math.floor(currentMinutes / 60);
    const sM = currentMinutes % 60;
    const eMinutes = currentMinutes + durationMinutes;
    const eH = Math.floor(eMinutes / 60);
    const eM = eMinutes % 60;

    const startTime = `${sH < 10 ? '0' + sH : sH}:${sM < 10 ? '0' + sM : sM}`;
    const endTime = `${eH < 10 ? '0' + eH : eH}:${eM < 10 ? '0' + eM : eM}`;

    slots.push({
      startTime,
      endTime,
      slotString: generateSlotString(startTime, endTime)
    });

    currentMinutes += durationMinutes;
  }

  return slots;
}

// Helper to get formatted today date 'YYYY-MM-DD'
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// =======================================================
// 1. GET /api/slots/availability
// Query: ?serviceId=FS&date=2026-09-10
// Returns: available slots with remaining capacity and status
// =======================================================
router.get(['/availability', '/slots/availability'], async (req, res): Promise<void> => {
  try {
    const { serviceId, date } = req.query;

    if (!serviceId || typeof serviceId !== 'string') {
      res.status(400).json({ error: 'serviceId is required' });
      return;
    }

    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Valid date in YYYY-MM-DD format is required' });
      return;
    }

    // Find service
    let service = await ServiceModel.findOne({
      $or: [{ code: serviceId.toUpperCase() }, { id: serviceId }, { _id: serviceId.match(/^[0-9a-fA-F]{24}$/) ? serviceId : null }]
    });

    if (!service) {
      const fallback = DEFAULT_SERVICES.find(s => s.code.toUpperCase() === serviceId.toUpperCase() || s.id === serviceId);
      if (fallback) {
        service = fallback as any;
      }
    }

    if (!service) {
      res.status(404).json({ error: `Service '${serviceId}' not found.` });
      return;
    }

    if (service.isActive === false) {
      res.status(400).json({ error: `Service '${service.name}' is currently unavailable.` });
      return;
    }

    const serviceCode = service.code || serviceId.toUpperCase();
    const serviceName = service.name;
    const slotDuration = service.slotDurationMinutes || 30;
    const capacity = service.slotCapacity || 10;
    const startTimeStr = service.workingStartTime || '09:00';
    const endTimeStr = service.workingEndTime || '17:00';

    // Generate base schedule
    const baseSlots = generateTimeSlots(startTimeStr, endTimeStr, slotDuration);

    // Current time calculations for today
    const todayStr = getTodayDateString();
    const isToday = date === todayStr;
    const isPastDate = date < todayStr;

    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    // Query all active bookings for this service and date directly from MongoDB
    const activeBookings = await BookingModel.find({
      serviceCode,
      date,
      status: { $in: ['BOOKED', 'CONFIRMED'] }
    }).select('startTime');

    // Count bookings per slot
    const bookingCountMap: Record<string, number> = {};
    activeBookings.forEach((b: any) => {
      bookingCountMap[b.startTime] = (bookingCountMap[b.startTime] || 0) + 1;
    });

    // Query any customized slot documents in SlotModel
    const existingSlots = await SlotModel.find({
      serviceId: serviceCode,
      date
    });
    const slotDocMap: Record<string, any> = {};
    existingSlots.forEach((s: any) => {
      slotDocMap[s.startTime] = s;
    });

    // Assemble slots with accurate status
    const slots = baseSlots.map(slot => {
      const slotDoc = slotDocMap[slot.startTime];
      const slotCapacity = slotDoc?.capacity || capacity;
      const bookedCount = bookingCountMap[slot.startTime] || 0;
      const availableSeats = Math.max(0, slotCapacity - bookedCount);

      // Check time expiry if date is today or past
      const [slotEndH, slotEndM] = slot.endTime.split(':').map(Number);
      const slotEndMinutes = slotEndH * 60 + (slotEndM || 0);

      let status: 'AVAILABLE' | 'FULL' | 'CLOSED' | 'EXPIRED' = 'AVAILABLE';

      if (slotDoc && slotDoc.status === 'CLOSED') {
        status = 'CLOSED';
      } else if (isPastDate) {
        status = 'EXPIRED';
      } else if (isToday && currentTotalMinutes >= slotEndMinutes) {
        status = 'EXPIRED';
      } else if (availableSeats <= 0) {
        status = 'FULL';
      } else {
        status = 'AVAILABLE';
      }

      return {
        serviceId: serviceCode,
        serviceName,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotString: slot.slotString,
        centre: slotDoc?.centre || 'Krishi Seva Kendra - Main Centre',
        capacity: slotCapacity,
        bookedCount,
        availableSeats,
        status
      };
    });

    res.json({
      service: {
        code: serviceCode,
        name: serviceName,
        durationMinutes: slotDuration,
        capacity,
        centre: 'Krishi Seva Kendra - Main Centre'
      },
      date,
      isToday,
      isPastDate,
      totalSlots: slots.length,
      availableSlotsCount: slots.filter(s => s.status === 'AVAILABLE').length,
      slots
    });
  } catch (err: any) {
    console.error('Slot availability error:', err);
    res.status(500).json({ error: err.message || 'Failed to calculate slot availability' });
  }
});

// =======================================================
// 2. POST /api/bookings
// Body: { serviceId, date, startTime, endTime, notes }
// Farmer creates slot booking with atomic concurrency protection
// =======================================================
router.post(['/', '/bookings'], authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (user.status === 'inactive') {
      res.status(403).json({ error: 'Your account is currently inactive.' });
      return;
    }

    const { serviceId, date, startTime, endTime, notes } = req.body;

    if (!serviceId || !date || !startTime || !endTime) {
      res.status(400).json({ error: 'serviceId, date, startTime, and endTime are required.' });
      return;
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
      return;
    }

    const todayStr = getTodayDateString();
    if (date < todayStr) {
      res.status(400).json({ error: 'Cannot book slots for a past date.' });
      return;
    }

    // Prevent booking further than 14 days in advance
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    const maxDateStr = maxDate.toISOString().slice(0, 10);
    if (date > maxDateStr) {
      res.status(400).json({ error: 'Bookings are only permitted up to 14 days in advance.' });
      return;
    }

    // If today, check that slot end time hasn't passed
    if (date === todayStr) {
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const [slotEndH, slotEndM] = endTime.split(':').map(Number);
      const slotEndMinutes = slotEndH * 60 + (slotEndM || 0);

      if (currentTotalMinutes >= slotEndMinutes) {
        res.status(400).json({ error: 'This time slot has already expired for today.' });
        return;
      }
    }

    // Verify service
    let service = await ServiceModel.findOne({
      $or: [{ code: serviceId.toUpperCase() }, { id: serviceId }, { _id: serviceId.match(/^[0-9a-fA-F]{24}$/) ? serviceId : null }]
    });

    if (!service) {
      const fallback = DEFAULT_SERVICES.find(s => s.code.toUpperCase() === serviceId.toUpperCase() || s.id === serviceId);
      if (fallback) {
        service = fallback as any;
      }
    }

    if (!service) {
      res.status(404).json({ error: `Service '${serviceId}' not found.` });
      return;
    }

    if (service.isActive === false) {
      res.status(400).json({ error: `Service '${service.name}' is inactive and cannot be booked.` });
      return;
    }

    const serviceCode = service.code || serviceId.toUpperCase();
    const serviceName = service.name;
    const capacity = service.slotCapacity || 10;
    const slotString = generateSlotString(startTime, endTime);
    const centre = 'Krishi Seva Kendra - Main Centre';

    // 4. DUPLICATE BOOKING LIMIT
    // Prevent duplicate active booking for the same farmer, service, and date/slot
    const existingDuplicate = await BookingModel.findOne({
      farmerId: user._id,
      serviceCode,
      date,
      startTime,
      status: { $in: ['BOOKED', 'CONFIRMED'] }
    });

    if (existingDuplicate) {
      res.status(409).json({
        error: `You already have an active booking (${existingDuplicate.bookingReference}) for this service and time slot.`,
        existingBooking: existingDuplicate
      });
      return;
    }

    // Also check if farmer already has another active booking for the same service on the same date
    const sameDayServiceBooking = await BookingModel.findOne({
      farmerId: user._id,
      serviceCode,
      date,
      status: { $in: ['BOOKED', 'CONFIRMED'] }
    });

    if (sameDayServiceBooking) {
      res.status(409).json({
        error: `You already have an appointment booked for ${serviceName} on ${date} (${sameDayServiceBooking.slotString}). To change your time, please reschedule your existing booking.`,
        existingBooking: sameDayServiceBooking
      });
      return;
    }

    // 5. CONCURRENCY SAFETY & ATOMIC SEAT RESERVATION
    // Ensure Slot document exists in MongoDB
    let slotDoc = await SlotModel.findOne({
      serviceId: serviceCode,
      date,
      startTime
    });

    if (!slotDoc) {
      try {
        slotDoc = await SlotModel.create({
          serviceId: serviceCode,
          serviceName,
          date,
          startTime,
          endTime,
          slotString,
          centre,
          capacity,
          bookedCount: 0,
          status: 'AVAILABLE'
        });
      } catch (err: any) {
        // Concurrently created by another request
        slotDoc = await SlotModel.findOne({ serviceId: serviceCode, date, startTime });
      }
    }

    if (!slotDoc) {
      res.status(500).json({ error: 'Could not initialize slot for booking.' });
      return;
    }

    if (slotDoc.status === 'CLOSED') {
      res.status(409).json({ error: 'This time slot is closed by Kendra administration.' });
      return;
    }

    // Atomic update with MongoDB: strictly increment only when bookedCount < capacity
    const updatedSlot = await SlotModel.findOneAndUpdate(
      {
        _id: slotDoc._id,
        bookedCount: { $lt: slotDoc.capacity },
        status: { $ne: 'CLOSED' }
      },
      {
        $inc: { bookedCount: 1 }
      },
      { new: true }
    );

    if (!updatedSlot) {
      res.status(409).json({
        error: 'This slot is now fully booked. Please choose another available time slot.'
      });
      return;
    }

    // Mark slot status as FULL if capacity reached
    if (updatedSlot.bookedCount >= updatedSlot.capacity) {
      await SlotModel.findByIdAndUpdate(updatedSlot._id, { status: 'FULL' });
    }

    // Generate unique booking reference (e.g. BK-20260910-5821)
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const bookingReference = `BK-${date.replace(/-/g, '')}-${randomDigits}`;

    // 13. TOKEN WORKFLOW INTEGRATION
    // If appointment is for TODAY, generate and link a real queue Token right now
    let generatedToken: any = null;
    if (date === todayStr) {
      // Check if farmer already has an active token in queue
      const existingActiveToken = await TokenModel.findOne({
        farmerId: user._id,
        status: { $in: ['waiting', 'serving'] }
      });

      if (!existingActiveToken) {
        const latestToken = await TokenModel.findOne().sort({ sequence: -1 });
        const nextSequence = latestToken ? latestToken.sequence + 1 : 101;
        const tokenNumber = `KQ-${nextSequence}`;

        generatedToken = await TokenModel.create({
          tokenNumber,
          sequence: nextSequence,
          farmerId: user._id,
          farmerName: user.name,
          farmerPhone: user.phone,
          serviceId: serviceCode,
          serviceName,
          status: 'waiting',
          issuedAt: new Date(),
          bookingReference,
          slotString,
          bookedDate: date,
          notes: notes || `Slot appointment: ${slotString}`
        });
      } else {
        generatedToken = existingActiveToken;
        // Associate booking info with existing active token
        existingActiveToken.bookingReference = bookingReference;
        existingActiveToken.slotString = slotString;
        existingActiveToken.bookedDate = date;
        await existingActiveToken.save();
      }
    }

    // Create Booking record in MongoDB
    const booking = await BookingModel.create({
      bookingReference,
      farmerId: user._id,
      farmerName: user.name,
      farmerPhone: user.phone,
      serviceId: serviceCode,
      serviceName,
      serviceCode,
      centre,
      date,
      startTime,
      endTime,
      slotString,
      slotId: updatedSlot._id,
      status: 'CONFIRMED',
      tokenId: generatedToken ? generatedToken._id : null,
      tokenNumber: generatedToken ? generatedToken.tokenNumber : null,
      notes: notes || ''
    });

    // Link bookingId back into token if created
    if (generatedToken && !generatedToken.bookingId) {
      generatedToken.bookingId = booking._id;
      await generatedToken.save();
    }

    // Trigger notification: Slot Confirmed
    notifySlotConfirmed({
      userId: String(user._id),
      userPhone: user.phone,
      bookingReference,
      serviceName,
      date,
      slotString,
      centre,
      tokenNumber: generatedToken ? generatedToken.tokenNumber : undefined
    }).catch(err => console.warn('Notification trigger error:', err));

    res.status(201).json({
      message: 'Slot booked successfully!',
      booking: booking.toObject(),
      token: generatedToken ? generatedToken.toObject() : null
    });
  } catch (err: any) {
    console.error('Booking creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create slot booking' });
  }
});

// =======================================================
// 3. GET /api/bookings/my
// Farmer fetches their bookings (Upcoming, Completed, Cancelled, Expired)
// =======================================================
router.get(['/my', '/bookings/my'], authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { status, filter } = req.query;
    const query: any = { farmerId: user._id };

    if (status && typeof status === 'string' && status !== 'all') {
      query.status = status.toUpperCase();
    }

    const bookings = await BookingModel.find(query).sort({ date: -1, startTime: -1 });

    const todayStr = getTodayDateString();
    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    // Categorize bookings for easy dashboard tabs
    const upcoming: any[] = [];
    const completed: any[] = [];
    const cancelled: any[] = [];
    const expired: any[] = [];

    bookings.forEach((b: any) => {
      const obj = b.toObject();
      const [endH, endM] = (obj.endTime || '17:00').split(':').map(Number);
      const slotEndMinutes = endH * 60 + (endM || 0);

      if (obj.status === 'CANCELLED') {
        cancelled.push(obj);
      } else if (obj.status === 'COMPLETED') {
        completed.push(obj);
      } else if (obj.date < todayStr || (obj.date === todayStr && currentTotalMinutes >= slotEndMinutes && !obj.completedAt)) {
        obj.displayStatus = 'EXPIRED';
        expired.push(obj);
      } else {
        upcoming.push(obj);
      }
    });

    res.json({
      all: bookings,
      upcoming,
      completed,
      cancelled,
      expired,
      counts: {
        upcoming: upcoming.length,
        completed: completed.length,
        cancelled: cancelled.length,
        expired: expired.length,
        total: bookings.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load bookings' });
  }
});

// =======================================================
// 4. GET /api/bookings/:id
// Get single booking details
// =======================================================
router.get(['/:id', '/bookings/:id'], authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (id === 'my' || id === 'availability' || id === 'bookings' || id === 'slots') {
      next();
      return;
    }
    const user = req.user!;

    const query: any = { _id: id };
    if (user.role === 'farmer') {
      query.farmerId = user._id;
    }

    const booking = await BookingModel.findOne(query);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found or not authorized.' });
      return;
    }

    let token: any = null;
    if (booking.tokenId) {
      token = await TokenModel.findById(booking.tokenId);
    }

    res.json({ booking, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch booking details' });
  }
});

// =======================================================
// 5. POST /api/bookings/:id/cancel or PATCH /api/bookings/:id/cancel
// Farmer cancels their booking and releases slot seat atomically
// =======================================================
const handleCancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user!;

    const query: any = { _id: id };
    if (user.role === 'farmer') {
      query.farmerId = user._id;
    }

    const booking = await BookingModel.findOne(query);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found or does not belong to you.' });
      return;
    }

    if (booking.status === 'CANCELLED') {
      res.status(400).json({ error: 'This booking is already cancelled.' });
      return;
    }

    if (booking.status === 'COMPLETED') {
      res.status(400).json({ error: 'Completed appointments cannot be cancelled.' });
      return;
    }

    // 1. Release slot seat atomically
    if (booking.slotId) {
      await SlotModel.findOneAndUpdate(
        { _id: booking.slotId, bookedCount: { $gt: 0 } },
        {
          $inc: { bookedCount: -1 },
          $set: { status: 'AVAILABLE' }
        }
      );
    } else {
      // Fallback: match by service, date, startTime
      await SlotModel.findOneAndUpdate(
        {
          serviceId: booking.serviceCode,
          date: booking.date,
          startTime: booking.startTime,
          bookedCount: { $gt: 0 }
        },
        {
          $inc: { bookedCount: -1 },
          $set: { status: 'AVAILABLE' }
        }
      );
    }

    // 2. Mark booking as CANCELLED (Preserve record historically)
    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date();
    booking.cancelReason = reason || 'Cancelled by farmer';
    await booking.save();

    // Trigger notification: Slot Cancelled
    notifySlotCancelled({
      userId: String(booking.farmerId),
      userPhone: booking.farmerPhone,
      bookingReference: booking.bookingReference,
      serviceName: booking.serviceName,
      date: booking.date,
      slotString: booking.slotString,
      reason: booking.cancelReason
    }).catch(() => {});

    // 3. If an associated waiting token exists in MongoDB, safely update its status
    if (booking.tokenId) {
      await TokenModel.findOneAndUpdate(
        { _id: booking.tokenId, status: 'waiting' },
        { status: 'cancelled', completedAt: new Date(), notes: 'Associated slot booking cancelled' }
      );
    }

    res.json({
      message: `Booking ${booking.bookingReference} cancelled successfully.`,
      booking
    });
  } catch (err: any) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: err.message || 'Failed to cancel booking' });
  }
};

router.post(['/:id/cancel', '/bookings/:id/cancel'], authenticate, handleCancelBooking);
router.patch(['/:id/cancel', '/bookings/:id/cancel'], authenticate, handleCancelBooking);

// =======================================================
// 6. POST /api/bookings/:id/reschedule
// Reschedule an eligible booking to a new date and available slot
// =======================================================
router.post(['/:id/reschedule', '/bookings/:id/reschedule'], authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newDate, newStartTime, newEndTime } = req.body;
    const user = req.user!;

    if (!newDate || !newStartTime || !newEndTime) {
      res.status(400).json({ error: 'newDate, newStartTime, and newEndTime are required.' });
      return;
    }

    // Validate format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      res.status(400).json({ error: 'Invalid newDate format. Expected YYYY-MM-DD.' });
      return;
    }

    const todayStr = getTodayDateString();
    if (newDate < todayStr) {
      res.status(400).json({ error: 'Cannot reschedule to a past date.' });
      return;
    }

    // Find current booking
    const query: any = { _id: id };
    if (user.role === 'farmer') {
      query.farmerId = user._id;
    }

    const booking = await BookingModel.findOne(query);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found or not authorized.' });
      return;
    }

    if (booking.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cancelled bookings cannot be rescheduled. Please book a new slot.' });
      return;
    }

    if (booking.status === 'COMPLETED') {
      res.status(400).json({ error: 'Completed appointments cannot be rescheduled.' });
      return;
    }

    const serviceCode = booking.serviceCode;
    const serviceName = booking.serviceName;

    // Check if new slot is expired if rescheduled for today
    if (newDate === todayStr) {
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const [slotEndH, slotEndM] = newEndTime.split(':').map(Number);
      const slotEndMinutes = slotEndH * 60 + (slotEndM || 0);

      if (currentTotalMinutes >= slotEndMinutes) {
        res.status(400).json({ error: 'The requested time slot has already passed for today.' });
        return;
      }
    }

    // Find or create the NEW slot document
    let newSlotDoc = await SlotModel.findOne({
      serviceId: serviceCode,
      date: newDate,
      startTime: newStartTime
    });

    if (!newSlotDoc) {
      const newSlotString = generateSlotString(newStartTime, newEndTime);
      try {
        newSlotDoc = await SlotModel.create({
          serviceId: serviceCode,
          serviceName,
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          slotString: newSlotString,
          capacity: 10,
          bookedCount: 0,
          status: 'AVAILABLE'
        });
      } catch (err: any) {
        newSlotDoc = await SlotModel.findOne({ serviceId: serviceCode, date: newDate, startTime: newStartTime });
      }
    }

    if (!newSlotDoc || newSlotDoc.status === 'CLOSED') {
      res.status(409).json({ error: 'The requested new slot is closed or unavailable.' });
      return;
    }

    // ATOMIC RESERVATION of the new slot
    const updatedNewSlot = await SlotModel.findOneAndUpdate(
      {
        _id: newSlotDoc._id,
        bookedCount: { $lt: newSlotDoc.capacity },
        status: { $ne: 'CLOSED' }
      },
      {
        $inc: { bookedCount: 1 }
      },
      { new: true }
    );

    if (!updatedNewSlot) {
      res.status(409).json({ error: 'The new slot is already full. Please select a different slot.' });
      return;
    }

    // ATOMIC RELEASE of the old slot
    if (booking.slotId) {
      await SlotModel.findOneAndUpdate(
        { _id: booking.slotId, bookedCount: { $gt: 0 } },
        { $inc: { bookedCount: -1 }, $set: { status: 'AVAILABLE' } }
      );
    } else {
      await SlotModel.findOneAndUpdate(
        {
          serviceId: booking.serviceCode,
          date: booking.date,
          startTime: booking.startTime,
          bookedCount: { $gt: 0 }
        },
        { $inc: { bookedCount: -1 }, $set: { status: 'AVAILABLE' } }
      );
    }

    // Save old slot info for reference
    const oldDetails = `${booking.date} (${booking.slotString})`;
    const oldDate = booking.date;
    const oldSlotString = booking.slotString;
    const newSlotString = generateSlotString(newStartTime, newEndTime);

    // Update booking
    booking.date = newDate;
    booking.startTime = newStartTime;
    booking.endTime = newEndTime;
    booking.slotString = newSlotString;
    booking.slotId = updatedNewSlot._id;
    booking.rescheduledFrom = oldDetails;
    booking.status = 'CONFIRMED';
    await booking.save();

    // Trigger notification: Slot Rescheduled
    notifySlotRescheduled({
      userId: String(booking.farmerId),
      userPhone: booking.farmerPhone,
      bookingReference: booking.bookingReference,
      serviceName: booking.serviceName,
      oldDate,
      oldSlotString,
      newDate,
      newSlotString
    }).catch(() => {});

    // If there is an active waiting token, update its slot details
    if (booking.tokenId) {
      await TokenModel.findByIdAndUpdate(booking.tokenId, {
        slotString: newSlotString,
        bookedDate: newDate,
        notes: `Rescheduled from ${oldDetails}`
      });
    }

    res.json({
      message: `Appointment successfully rescheduled to ${newDate} at ${newSlotString}.`,
      booking
    });
  } catch (err: any) {
    console.error('Reschedule booking error:', err);
    res.status(500).json({ error: err.message || 'Failed to reschedule booking' });
  }
});

// =======================================================
// 7. POST /api/bookings/:id/checkin-token
// Generate/Check-in queue token on appointment day
// =======================================================
router.post(['/:id/checkin-token', '/bookings/:id/checkin-token'], authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const booking = await BookingModel.findOne({ _id: id, farmerId: user._id });
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    const todayStr = getTodayDateString();
    if (booking.date !== todayStr) {
      res.status(400).json({
        error: `Queue tokens can only be issued on the scheduled appointment date (${booking.date}). Please check in on ${booking.date}.`
      });
      return;
    }

    if (booking.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cannot issue a token for a cancelled booking.' });
      return;
    }

    // Check if token already exists
    if (booking.tokenId) {
      const existingToken = await TokenModel.findById(booking.tokenId);
      if (existingToken) {
        res.json({
          message: `Active token ${existingToken.tokenNumber} is ready.`,
          token: existingToken,
          booking
        });
        return;
      }
    }

    // Generate new Token in MongoDB
    const latestToken = await TokenModel.findOne().sort({ sequence: -1 });
    const nextSequence = latestToken ? latestToken.sequence + 1 : 101;
    const tokenNumber = `KQ-${nextSequence}`;

    const newToken = await TokenModel.create({
      tokenNumber,
      sequence: nextSequence,
      farmerId: user._id,
      farmerName: user.name,
      farmerPhone: user.phone,
      serviceId: booking.serviceCode,
      serviceName: booking.serviceName,
      status: 'waiting',
      issuedAt: new Date(),
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      slotString: booking.slotString,
      bookedDate: booking.date,
      notes: `Appointment check-in: ${booking.slotString}`
    });

    booking.tokenId = newToken._id;
    booking.tokenNumber = newToken.tokenNumber;
    await booking.save();

    res.json({
      message: `Token ${newToken.tokenNumber} issued successfully for your appointment.`,
      token: newToken,
      booking
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check-in token' });
  }
});

// =======================================================
// 8. GET /api/bookings
// Admin & Staff: View bookings with filters (date, service, status)
// =======================================================
router.get(['/', '/bookings'], authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, serviceId, status, search } = req.query;
    const query: any = {};

    if (date && typeof date === 'string' && date !== 'all') {
      query.date = date;
    }

    if (serviceId && typeof serviceId === 'string' && serviceId !== 'all') {
      query.serviceCode = serviceId.toUpperCase();
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query.status = status.toUpperCase();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const clean = search.trim();
      query.$or = [
        { bookingReference: { $regex: clean, $options: 'i' } },
        { farmerName: { $regex: clean, $options: 'i' } },
        { farmerPhone: { $regex: clean, $options: 'i' } },
        { tokenNumber: { $regex: clean, $options: 'i' } }
      ];
    }

    const bookings = await BookingModel.find(query).sort({ date: 1, startTime: 1 });
    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch bookings list' });
  }
});

export default router;
