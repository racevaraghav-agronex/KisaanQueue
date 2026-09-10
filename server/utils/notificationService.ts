import { NotificationModel, NotificationType } from '../models/Notification.ts';

export interface SendNotificationParams {
  userId: string;
  recipientRole?: 'farmer' | 'staff' | 'admin';
  recipientPhone?: string;
  type: NotificationType;
  title: string;
  titleHi: string;
  message: string;
  messageHi: string;
  language?: string;
  entityType?: 'token' | 'slot' | 'procurement' | 'centre' | 'service' | 'general';
  entityId?: string;
  entityReference?: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
  deduplicateMinutes?: number;
}

/**
 * Future-ready channel abstraction for SMS / WhatsApp.
 * Extensible for Phase 6 without third-party dependencies now.
 */
export const FutureDispatchChannels = {
  dispatchSMS: async (phone: string, text: string) => {
    // Ready for future integration with SMS gateway (CDAC/NIC/Twilio)
    if (process.env.ENABLE_EXTERNAL_SMS === 'true' && phone) {
      console.log(`[Future SMS Stub] To ${phone}: ${text.slice(0, 60)}...`);
    }
    return true;
  },
  dispatchWhatsApp: async (phone: string, template: string, _params: any) => {
    // Ready for future integration with WhatsApp Business Cloud API
    if (process.env.ENABLE_EXTERNAL_WHATSAPP === 'true' && phone) {
      console.log(`[Future WhatsApp Stub] To ${phone} [${template}]`);
    }
    return true;
  }
};

/**
 * Core notification creation function with MongoDB persistence and deduplication
 */
export async function sendNotification(params: SendNotificationParams) {
  try {
    const {
      userId,
      recipientRole = 'farmer',
      recipientPhone = '',
      type,
      title,
      titleHi,
      message,
      messageHi,
      language = 'en',
      entityType = 'general',
      entityId = '',
      entityReference = '',
      metadata = {},
      actionUrl = '',
      deduplicateMinutes = 0
    } = params;

    if (!userId) {
      return null;
    }

    // Deduplication check if window is specified
    if (deduplicateMinutes > 0 && entityReference) {
      const windowStart = new Date(Date.now() - deduplicateMinutes * 60 * 1000);
      const existing = await NotificationModel.findOne({
        userId: String(userId),
        type,
        entityReference,
        createdAt: { $gte: windowStart }
      });
      if (existing) {
        return existing;
      }
    }

    const doc = await NotificationModel.create({
      userId: String(userId),
      recipientRole,
      recipientPhone,
      type,
      title,
      titleHi,
      message,
      messageHi,
      language,
      entityType,
      entityId,
      entityReference,
      metadata,
      isRead: false,
      channel: 'in_app',
      actionUrl
    });

    // Call future channel stubs asynchronously (non-blocking)
    if (recipientPhone) {
      FutureDispatchChannels.dispatchSMS(recipientPhone, `${title}: ${message}`).catch(() => {});
    }

    return doc;
  } catch (err: any) {
    console.error('Failed to create notification:', err?.message || err);
    return null;
  }
}

// -------------------------------------------------------------
// Specialized Domain Notification Helpers
// -------------------------------------------------------------

/**
 * 1. TOKEN_BOOKED: Issued when instant or slot token is generated
 */
export async function notifyTokenBooked(opts: {
  userId: string;
  userPhone?: string;
  tokenNumber: string;
  serviceName: string;
  estimatedWaitMinutes?: number;
  positionInQueue?: number;
  slotString?: string;
  bookedDate?: string;
}) {
  const waitText = opts.estimatedWaitMinutes ? `~${opts.estimatedWaitMinutes} mins` : 'shortly';
  const waitTextHi = opts.estimatedWaitMinutes ? `लगभग ${opts.estimatedWaitMinutes} मिनट` : 'शीघ्र';

  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'TOKEN_BOOKED',
    title: `Token Issued: ${opts.tokenNumber}`,
    titleHi: `टोकन जारी: ${opts.tokenNumber}`,
    message: `Your token ${opts.tokenNumber} for ${opts.serviceName} is confirmed. Estimated wait: ${waitText}.`,
    messageHi: `${opts.serviceName} हेतु आपका टोकन ${opts.tokenNumber} जारी हो गया है। अनुमानित समय: ${waitTextHi}।`,
    entityType: 'token',
    entityReference: opts.tokenNumber,
    metadata: {
      tokenNumber: opts.tokenNumber,
      serviceName: opts.serviceName,
      estimatedWaitMinutes: opts.estimatedWaitMinutes,
      positionInQueue: opts.positionInQueue,
      slotString: opts.slotString,
      bookedDate: opts.bookedDate
    },
    actionUrl: '/farmer?tab=queue'
  });
}

/**
 * 2. SLOT_CONFIRMED: Issued when slot booking is confirmed
 */
export async function notifySlotConfirmed(opts: {
  userId: string;
  userPhone?: string;
  bookingReference: string;
  serviceName: string;
  date: string;
  slotString: string;
  centre?: string;
  tokenNumber?: string;
}) {
  const tokenMsg = opts.tokenNumber ? ` Queue token: ${opts.tokenNumber}.` : '';
  const tokenMsgHi = opts.tokenNumber ? ` कतार टोकन: ${opts.tokenNumber}।` : '';

  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'SLOT_CONFIRMED',
    title: `Appointment Confirmed: ${opts.bookingReference}`,
    titleHi: `अपॉइंटमेंट स्लॉट सुनिश्चित: ${opts.bookingReference}`,
    message: `Your slot for ${opts.serviceName} on ${opts.date} (${opts.slotString}) is booked at ${opts.centre || 'Kendra'}.${tokenMsg}`,
    messageHi: `${opts.serviceName} हेतु ${opts.date} (${opts.slotString}) का स्लॉट केंद्र पर सुनिश्चित हो गया है।${tokenMsgHi}`,
    entityType: 'slot',
    entityReference: opts.bookingReference,
    metadata: {
      bookingReference: opts.bookingReference,
      serviceName: opts.serviceName,
      date: opts.date,
      slotString: opts.slotString,
      tokenNumber: opts.tokenNumber
    },
    actionUrl: '/farmer?tab=queue'
  });
}

/**
 * 3. TOKEN_APPROACHING: Triggered when queue position decreases to 1-2 people ahead
 */
export async function notifyTokenApproaching(opts: {
  userId: string;
  userPhone?: string;
  tokenNumber: string;
  serviceName: string;
  peopleAhead: number;
  counterNumber?: number;
}) {
  const counterText = opts.counterNumber ? ` near Counter ${opts.counterNumber}` : '';
  const counterTextHi = opts.counterNumber ? ` (काउंटर ${opts.counterNumber} के पास)` : '';

  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'TOKEN_APPROACHING',
    title: `Your Turn is Near! (${opts.tokenNumber})`,
    titleHi: `आपकी बारी आने वाली है! (${opts.tokenNumber})`,
    message: `Token ${opts.tokenNumber}: only ${opts.peopleAhead} person ahead of you. Please be ready in the waiting lounge${counterText}.`,
    messageHi: `टोकन ${opts.tokenNumber}: केवल ${opts.peopleAhead} किसान आपसे आगे हैं। कृपया प्रतीक्षा क्षेत्र${counterTextHi} में तैयार रहें।`,
    entityType: 'token',
    entityReference: opts.tokenNumber,
    metadata: {
      tokenNumber: opts.tokenNumber,
      serviceName: opts.serviceName,
      peopleAhead: opts.peopleAhead,
      counterNumber: opts.counterNumber
    },
    actionUrl: '/farmer?tab=queue',
    deduplicateMinutes: 10 // Prevent repeated alerts within 10 mins
  });
}

/**
 * 4. TOKEN_CALLED: Triggered when staff calls the farmer to counter
 */
export async function notifyTokenCalled(opts: {
  userId: string;
  userPhone?: string;
  tokenNumber: string;
  counterNumber: number;
  serviceName: string;
  staffName?: string;
}) {
  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'TOKEN_CALLED',
    title: `Now Calling: Proceed to Counter ${opts.counterNumber}`,
    titleHi: `टोकन पुकारा गया: काउंटर ${opts.counterNumber} पर आएं`,
    message: `Token ${opts.tokenNumber} is called at Counter ${opts.counterNumber} for ${opts.serviceName}. Please proceed immediately.`,
    messageHi: `टोकन ${opts.tokenNumber} को काउंटर ${opts.counterNumber} पर सेवा के लिए पुकारा गया है। कृपया तत्काल काउंटर पर उपस्थित हों।`,
    entityType: 'token',
    entityReference: opts.tokenNumber,
    metadata: {
      tokenNumber: opts.tokenNumber,
      counterNumber: opts.counterNumber,
      serviceName: opts.serviceName,
      staffName: opts.staffName
    },
    actionUrl: '/farmer?tab=queue',
    deduplicateMinutes: 2 // Allow recall notification after 2 minutes
  });
}

/**
 * 5. TOKEN_COMPLETED: Triggered when service is finished
 */
export async function notifyTokenCompleted(opts: {
  userId: string;
  userPhone?: string;
  tokenNumber: string;
  serviceName: string;
  counterNumber?: number;
}) {
  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'TOKEN_COMPLETED',
    title: `Service Completed: Token ${opts.tokenNumber}`,
    titleHi: `सेवा पूर्ण: टोकन ${opts.tokenNumber}`,
    message: `Your service for token ${opts.tokenNumber} (${opts.serviceName}) has been completed. Thank you for visiting Krishi Seva Kendra!`,
    messageHi: `टोकन ${opts.tokenNumber} (${opts.serviceName}) की सेवा पूर्ण हो चुकी है। कृषि सेवा केंद्र का उपयोग करने के लिए धन्यवाद!`,
    entityType: 'token',
    entityReference: opts.tokenNumber,
    metadata: {
      tokenNumber: opts.tokenNumber,
      serviceName: opts.serviceName,
      counterNumber: opts.counterNumber
    },
    actionUrl: '/farmer?tab=queue'
  });
}

/**
 * 6. TOKEN_CANCELLED: Triggered when token is cancelled or skipped
 */
export async function notifyTokenCancelled(opts: {
  userId: string;
  userPhone?: string;
  tokenNumber: string;
  serviceName?: string;
  reason?: string;
}) {
  const reasonText = opts.reason ? ` Reason: ${opts.reason}` : '';
  const reasonTextHi = opts.reason ? ` कारण: ${opts.reason}` : '';

  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'TOKEN_CANCELLED',
    title: `Token Cancelled: ${opts.tokenNumber}`,
    titleHi: `टोकन रद्द: ${opts.tokenNumber}`,
    message: `Token ${opts.tokenNumber} has been cancelled.${reasonText}`,
    messageHi: `टोकन ${opts.tokenNumber} को रद्द कर दिया गया है।${reasonTextHi}`,
    entityType: 'token',
    entityReference: opts.tokenNumber,
    metadata: {
      tokenNumber: opts.tokenNumber,
      reason: opts.reason
    },
    actionUrl: '/farmer?tab=queue'
  });
}

/**
 * 7. SLOT_CANCELLED: Triggered when appointment is cancelled
 */
export async function notifySlotCancelled(opts: {
  userId: string;
  userPhone?: string;
  bookingReference: string;
  serviceName: string;
  date: string;
  slotString: string;
  reason?: string;
}) {
  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'SLOT_CANCELLED',
    title: `Appointment Cancelled: ${opts.bookingReference}`,
    titleHi: `अपॉइंटमेंट रद्द: ${opts.bookingReference}`,
    message: `Slot booking ${opts.bookingReference} for ${opts.date} (${opts.slotString}) has been cancelled. Slot capacity released.`,
    messageHi: `अपॉइंटमेंट ${opts.bookingReference} (${opts.date}, ${opts.slotString}) रद्द कर दिया गया है। सीट मुक्त हो गई है।`,
    entityType: 'slot',
    entityReference: opts.bookingReference,
    metadata: {
      bookingReference: opts.bookingReference,
      serviceName: opts.serviceName,
      date: opts.date,
      slotString: opts.slotString,
      reason: opts.reason
    },
    actionUrl: '/farmer?tab=queue'
  });
}

/**
 * 8. SLOT_RESCHEDULED: Triggered when slot is rescheduled
 */
export async function notifySlotRescheduled(opts: {
  userId: string;
  userPhone?: string;
  bookingReference: string;
  serviceName: string;
  oldDate: string;
  oldSlotString: string;
  newDate: string;
  newSlotString: string;
}) {
  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'SLOT_RESCHEDULED',
    title: `Appointment Rescheduled: ${opts.bookingReference}`,
    titleHi: `अपॉइंटमेंट पुनर्निर्धारित: ${opts.bookingReference}`,
    message: `Your booking ${opts.bookingReference} is moved from ${opts.oldDate} to ${opts.newDate} (${opts.newSlotString}).`,
    messageHi: `आपकी बुकिंग ${opts.bookingReference} अब ${opts.oldDate} से बदलकर ${opts.newDate} (${opts.newSlotString}) कर दी गई है।`,
    entityType: 'slot',
    entityReference: opts.bookingReference,
    metadata: {
      bookingReference: opts.bookingReference,
      newDate: opts.newDate,
      newSlotString: opts.newSlotString
    },
    actionUrl: '/farmer?tab=queue'
  });
}

/**
 * 9. PROCUREMENT_STATUS_CHANGED: Triggered on stage transitions (ARRIVED, WEIGHED, QUALITY_CHECKED, ACCEPTED, REJECTED)
 */
export async function notifyProcurementStatusChanged(opts: {
  userId: string;
  userPhone?: string;
  procurementNumber: string;
  cropName: string;
  status: string;
  details?: {
    netWeight?: number;
    unit?: string;
    grade?: string;
    ratePerUnit?: number;
    netPayable?: number;
    notes?: string;
  };
}) {
  let titleEn = `Procurement Status: ${opts.status}`;
  let titleHi = `उपज खरीद स्थिति: ${opts.status}`;
  let messageEn = `Status for ${opts.cropName} (${opts.procurementNumber}) is updated to ${opts.status}.`;
  let messageHi = `${opts.cropName} (${opts.procurementNumber}) की स्थिति अब ${opts.status} है।`;

  const d = opts.details || {};

  if (opts.status === 'ARRIVED') {
    titleEn = `Arrival Verified: ${opts.cropName}`;
    titleHi = `आगमन सत्यापित: ${opts.cropName}`;
    messageEn = `Gate arrival verified for lot ${opts.procurementNumber} (${opts.cropName}). Proceed to weighbridge.`;
    messageHi = `उपज लॉट ${opts.procurementNumber} (${opts.cropName}) का केंद्र पर आगमन सत्यापित हुआ। धर्मकांटा (तौल) पर जाएं।`;
  } else if (opts.status === 'WEIGHED') {
    titleEn = `Weighment Recorded: ${d.netWeight || ''} ${d.unit || 'Quintals'}`;
    titleHi = `तौल दर्ज: ${d.netWeight || ''} ${d.unit || 'क्विंटल'}`;
    messageEn = `Net weight recorded: ${d.netWeight} ${d.unit || 'Quintals'} for lot ${opts.procurementNumber}. Quality inspection is next.`;
    messageHi = `लॉट ${opts.procurementNumber} का शुद्ध वजन ${d.netWeight} ${d.unit || 'क्विंटल'} दर्ज हुआ। अगला चरण गुणवत्ता जांच है।`;
  } else if (opts.status === 'QUALITY_CHECKED') {
    titleEn = `Quality Inspected: Grade ${d.grade || 'FAQ'}`;
    titleHi = `गुणवत्ता जांच पूर्ण: ग्रेड ${d.grade || 'FAQ'}`;
    messageEn = `Quality check complete for lot ${opts.procurementNumber}. Assigned Grade: ${d.grade || 'FAQ'}.`;
    messageHi = `लॉट ${opts.procurementNumber} की गुणवत्ता जांच पूर्ण हुई। निर्धारित ग्रेड: ${d.grade || 'FAQ'}।`;
  } else if (opts.status === 'ACCEPTED' || opts.status === 'PARTIALLY_ACCEPTED') {
    titleEn = `Procurement Accepted: ${opts.cropName}`;
    titleHi = `उपज खरीद स्वीकृत: ${opts.cropName}`;
    messageEn = `Procurement confirmed at ₹${d.ratePerUnit || 0}/unit. Total payable: ₹${d.netPayable || 0}.`;
    messageHi = `उपज खरीद ₹${d.ratePerUnit || 0} प्रति इकाई दर पर स्वीकृत हुई। शुद्ध देय राशि: ₹${d.netPayable || 0}।`;
  } else if (opts.status === 'REJECTED') {
    titleEn = `Procurement Rejected: ${opts.cropName}`;
    titleHi = `उपज खरीद अस्वीकृत: ${opts.cropName}`;
    messageEn = `Lot ${opts.procurementNumber} was not accepted during inspection. Please consult Kendra inspection desk.`;
    messageHi = `लॉट ${opts.procurementNumber} गुणवत्ता मानकों के कारण अस्वीकृत हुआ। कृपया केंद्र डेस्क से संपर्क करें।`;
  }

  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'PROCUREMENT_STATUS_CHANGED',
    title: titleEn,
    titleHi,
    message: messageEn,
    messageHi,
    entityType: 'procurement',
    entityReference: opts.procurementNumber,
    metadata: {
      procurementNumber: opts.procurementNumber,
      cropName: opts.cropName,
      status: opts.status,
      ...d
    },
    actionUrl: '/farmer?tab=procurement'
  });
}

/**
 * 10. PROCUREMENT_COMPLETED: Digital receipt generated
 */
export async function notifyProcurementCompleted(opts: {
  userId: string;
  userPhone?: string;
  procurementNumber: string;
  receiptReference: string;
  cropName: string;
  netPayable?: number;
}) {
  const amountStr = opts.netPayable ? ` Payable: ₹${opts.netPayable}.` : '';
  const amountStrHi = opts.netPayable ? ` कुल देय: ₹${opts.netPayable}।` : '';

  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'PROCUREMENT_COMPLETED',
    title: `Digital Receipt Generated: ${opts.receiptReference}`,
    titleHi: `डिजिटल रसीद जारी: ${opts.receiptReference}`,
    message: `Procurement of ${opts.cropName} (${opts.procurementNumber}) is completed.${amountStr} Digital receipt ${opts.receiptReference} is available for download.`,
    messageHi: `${opts.cropName} (${opts.procurementNumber}) की खरीद पूर्ण हुई।${amountStrHi} डिजिटल रसीद ${opts.receiptReference} डाउनलोड के लिए तैयार है।`,
    entityType: 'procurement',
    entityReference: opts.procurementNumber,
    metadata: {
      procurementNumber: opts.procurementNumber,
      receiptReference: opts.receiptReference,
      cropName: opts.cropName,
      netPayable: opts.netPayable
    },
    actionUrl: '/farmer?tab=procurement'
  });
}

/**
 * 11. PAYMENT_STATUS_CHANGED: Triggered when procurement payment is updated
 */
export async function notifyPaymentStatusChanged(opts: {
  userId: string;
  userPhone?: string;
  procurementNumber: string;
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL';
  paidAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
}) {
  const refText = opts.paymentReference ? ` (Ref: ${opts.paymentReference})` : '';
  const statusNameEn = opts.paymentStatus === 'PAID' ? 'Settled (Paid)' : opts.paymentStatus === 'PARTIAL' ? 'Partially Paid' : 'Pending';
  const statusNameHi = opts.paymentStatus === 'PAID' ? 'भुगतान पूर्ण (सफल)' : opts.paymentStatus === 'PARTIAL' ? 'आंशिक भुगतान' : 'लंबित';

  return sendNotification({
    userId: opts.userId,
    recipientRole: 'farmer',
    recipientPhone: opts.userPhone,
    type: 'PAYMENT_STATUS_CHANGED',
    title: `Payment ${statusNameEn}: ₹${opts.paidAmount}`,
    titleHi: `भुगतान स्थिति: ${statusNameHi} (₹${opts.paidAmount})`,
    message: `Payment status for ${opts.procurementNumber} is now ${statusNameEn} (₹${opts.paidAmount}). Method: ${opts.paymentMethod || 'Direct Kendra Transfer'}${refText}.`,
    messageHi: `लॉट ${opts.procurementNumber} का भुगतान अब ${statusNameHi} है। राशि: ₹${opts.paidAmount}, माध्यम: ${opts.paymentMethod || 'केंद्र बैंक ट्रांसफर'}${refText}।`,
    entityType: 'procurement',
    entityReference: opts.procurementNumber,
    metadata: {
      procurementNumber: opts.procurementNumber,
      paymentStatus: opts.paymentStatus,
      paidAmount: opts.paidAmount,
      paymentMethod: opts.paymentMethod,
      paymentReference: opts.paymentReference
    },
    actionUrl: '/farmer?tab=procurement'
  });
}
