import { GoogleGenAI } from '@google/genai';
import { TokenModel } from '../models/Token.ts';
import { BookingModel } from '../models/Booking.ts';
import { ProcurementModel } from '../models/Procurement.ts';
import { SaleModel } from '../models/Sale.ts';
import { NotificationModel } from '../models/Notification.ts';
import { ServiceModel, DEFAULT_SERVICES } from '../models/Service.ts';
import { calculateIntelligentEta } from './smartEtaService.ts';

// Lazy client singleton
let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    geminiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

export interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

export interface FarmerContext {
  farmerName: string;
  farmerPhone?: string;
  centreName: string;
  systemTime: string;
  activeToken: {
    tokenNumber: string;
    serviceName: string;
    status: string;
    counterNumber?: number | null;
    issuedAt: string;
    calledAt?: string | null;
    peopleAhead: number;
    estimatedWaitText?: string;
    estimatedTurnTime?: string;
    isAiEstimate?: boolean;
    requiresBilling?: boolean;
  } | null;
  currentlyServingAtCounters: Array<{
    counterNumber?: number;
    tokenNumber: string;
    serviceName: string;
  }>;
  recentTokens: Array<{
    tokenNumber: string;
    serviceName: string;
    status: string;
    date: string;
  }>;
  upcomingBookings: Array<{
    bookingReference: string;
    serviceName: string;
    date: string;
    slotString: string;
    status: string;
    tokenNumber?: string | null;
  }>;
  recentProcurements: Array<{
    procurementNumber: string;
    cropName: string;
    variety?: string;
    declaredQuantity: number;
    unit: string;
    status: string;
    netWeight?: number;
    decisionStatus?: string;
    ratePerUnit?: number;
    netPayable?: number;
    paymentStatus?: string;
    paidAmount?: number;
  }>;
  recentPurchases: Array<{
    invoiceNumber: string;
    date: string;
    items: string;
    total: number;
    paymentStatus: string;
  }>;
  recentNotifications: Array<{
    title: string;
    titleHi: string;
    message: string;
    messageHi: string;
    createdAt: string;
    isRead: boolean;
  }>;
  availableServices: Array<{
    code: string;
    name: string;
    category: string;
    fee: number;
    description: string;
    averageMinutes: number;
    requiresBilling: boolean;
  }>;
}

/**
 * Retrieve verified, sanitized, farmer-scoped data from MongoDB.
 * Strictly adheres to privacy: no passwords, no tokens/secrets, no other farmers' data.
 */
export async function getFarmerContext(
  farmerId: string,
  farmerPhone?: string,
  farmerName?: string
): Promise<FarmerContext> {
  const centreName = 'Krishi Seva Kendra - Main Centre';
  const now = new Date();
  const systemTime = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  // 1. Available services
  let services = await ServiceModel.find({ isActive: true }).lean().catch(() => []);
  if (!services || services.length === 0) {
    services = DEFAULT_SERVICES.map(s => ({ ...s, isActive: true, fee: 0, requiresBilling: false })) as any;
  }
  const availableServices = services.map((s: any) => ({
    code: s.code || '',
    name: s.name || '',
    category: s.category || 'General',
    fee: Number(s.fee || 0),
    description: s.description || '',
    averageMinutes: Number(s.averageMinutes || 10),
    requiresBilling: Boolean(s.requiresBilling)
  }));

  // 2. Active token & Queue status
  const orFarmerFilter: any[] = [{ farmerId: farmerId }];
  if (farmerPhone) {
    orFarmerFilter.push({ farmerPhone });
  }

  const farmerTokens = await TokenModel.find({
    $or: orFarmerFilter
  }).sort({ issuedAt: -1 }).limit(10).lean().catch(() => []);

  const activeTokenDoc = farmerTokens.find((t: any) =>
    ['waiting', 'called', 'serving', 'hold'].includes(t.status)
  );

  let activeToken: FarmerContext['activeToken'] = null;
  if (activeTokenDoc) {
    let peopleAhead = 0;
    if (activeTokenDoc.status === 'waiting') {
      peopleAhead = await TokenModel.countDocuments({
        serviceId: activeTokenDoc.serviceId,
        status: 'waiting',
        issuedAt: { $lt: activeTokenDoc.issuedAt }
      }).catch(() => 0);
    }

    let smartWaitText: string | undefined;
    let smartTurnTime: string | undefined;
    let isAi = false;

    if (activeTokenDoc.status === 'waiting' || activeTokenDoc.status === 'serving') {
      try {
        const allWaiting = await TokenModel.find({ status: 'waiting' }).sort({ sequence: 1 }).lean().catch(() => []);
        const allServing = await TokenModel.find({ status: { $in: ['called', 'serving'] } }).lean().catch(() => []);
        const targetIdx = allWaiting.findIndex((t: any) => String(t._id) === String(activeTokenDoc._id) || t.tokenNumber === activeTokenDoc.tokenNumber);
        const etaRes = await calculateIntelligentEta({
          tokenNumber: activeTokenDoc.tokenNumber,
          serviceId: activeTokenDoc.serviceId,
          serviceName: activeTokenDoc.serviceName,
          tokenStatus: activeTokenDoc.status,
          waitingTokens: allWaiting,
          targetIndex: targetIdx >= 0 ? targetIdx : peopleAhead,
          servingTokens: allServing,
          centre: activeTokenDoc.centre
        });
        smartWaitText = etaRes.estimatedWaitText;
        smartTurnTime = etaRes.estimatedTurnTime;
        isAi = etaRes.isAiEstimate;
      } catch (err) {
        console.warn('Could not compute smart ETA for farmer context:', err);
      }
    }

    activeToken = {
      tokenNumber: activeTokenDoc.tokenNumber,
      serviceName: activeTokenDoc.serviceName,
      status: activeTokenDoc.status,
      counterNumber: activeTokenDoc.counterNumber || null,
      issuedAt: activeTokenDoc.issuedAt ? new Date(activeTokenDoc.issuedAt).toLocaleTimeString('en-IN') : '',
      calledAt: activeTokenDoc.calledAt ? new Date(activeTokenDoc.calledAt).toLocaleTimeString('en-IN') : null,
      peopleAhead,
      estimatedWaitText: smartWaitText || (peopleAhead > 0 ? `~${peopleAhead * 10} minutes` : 'Next in line'),
      estimatedTurnTime: smartTurnTime,
      isAiEstimate: isAi,
      requiresBilling: Boolean(activeTokenDoc.requiresBilling)
    };
  }

  // 3. Currently serving tokens across the center
  const servingDocs = await TokenModel.find({
    status: { $in: ['called', 'serving'] }
  }).lean().catch(() => []);

  const currentlyServingAtCounters = servingDocs.map((t: any) => ({
    counterNumber: t.counterNumber,
    tokenNumber: t.tokenNumber,
    serviceName: t.serviceName
  }));

  // 4. Past tokens for this farmer
  const pastTokens = farmerTokens
    .filter((t: any) => ['completed', 'skipped', 'cancelled'].includes(t.status))
    .slice(0, 3)
    .map((t: any) => ({
      tokenNumber: t.tokenNumber,
      serviceName: t.serviceName,
      status: t.status,
      date: t.issuedAt ? new Date(t.issuedAt).toLocaleDateString('en-IN') : ''
    }));

  // 5. Bookings
  const bookingFilter: any[] = [{ farmerId }];
  if (farmerPhone) bookingFilter.push({ farmerPhone });
  const allBookings = await BookingModel.find({
    $or: bookingFilter
  }).sort({ date: 1, startTime: 1 }).lean().catch(() => []);

  const todayStr = now.toISOString().split('T')[0];
  const upcomingBookings = allBookings
    .filter((b: any) => (b.date >= todayStr || b.status === 'CONFIRMED' || b.status === 'BOOKED') && b.status !== 'CANCELLED' && b.status !== 'COMPLETED')
    .slice(0, 4)
    .map((b: any) => ({
      bookingReference: b.bookingReference,
      serviceName: b.serviceName,
      date: b.date,
      slotString: b.slotString,
      status: b.status,
      tokenNumber: b.tokenNumber || null
    }));

  // 6. Procurement records
  const procFilter: any[] = [{ farmerId }];
  if (farmerPhone) procFilter.push({ farmerPhone });
  const procurements = await ProcurementModel.find({
    $or: procFilter
  }).sort({ createdAt: -1 }).limit(4).lean().catch(() => []);

  const recentProcurements = procurements.map((p: any) => ({
    procurementNumber: p.procurementNumber,
    cropName: p.produce?.cropName || 'Produce',
    variety: p.produce?.variety || '',
    declaredQuantity: Number(p.produce?.declaredQuantity || 0),
    unit: p.produce?.unit || 'Quintal',
    status: p.status,
    netWeight: p.weighment?.netWeight,
    decisionStatus: p.decision?.decisionStatus,
    ratePerUnit: p.pricing?.ratePerUnit,
    netPayable: p.pricing?.netPayable,
    paymentStatus: p.payment?.status,
    paidAmount: p.payment?.paidAmount
  }));

  // 7. Purchase bills / Sales
  const salesFilter: any[] = [{ farmerId }];
  if (farmerPhone) salesFilter.push({ farmerPhone });
  const sales = await SaleModel.find({
    $or: salesFilter
  }).sort({ createdAt: -1 }).limit(4).lean().catch(() => []);

  const recentPurchases = sales.map((s: any) => ({
    invoiceNumber: s.invoiceNumber,
    date: s.date ? new Date(s.date).toLocaleDateString('en-IN') : '',
    items: (s.items || []).map((i: any) => `${i.productName} (${i.quantity} ${i.unit || 'Unit'})`).join(', ') || 'Agricultural supplies',
    total: Number(s.total || 0),
    paymentStatus: s.paymentStatus || 'paid'
  }));

  // 8. Notifications
  const notifsFilter: any[] = [{ userId: farmerId }];
  if (farmerPhone) notifsFilter.push({ recipientPhone: farmerPhone });
  const notifs = await NotificationModel.find({
    $or: notifsFilter
  }).sort({ createdAt: -1 }).limit(4).lean().catch(() => []);

  const recentNotifications = notifs.map((n: any) => ({
    title: n.title || '',
    titleHi: n.titleHi || '',
    message: n.message || '',
    messageHi: n.messageHi || '',
    createdAt: n.createdAt ? new Date(n.createdAt).toLocaleTimeString('en-IN') : '',
    isRead: Boolean(n.isRead)
  }));

  return {
    farmerName: farmerName || 'Kisan Bhai',
    farmerPhone: farmerPhone || '',
    centreName,
    systemTime,
    activeToken,
    currentlyServingAtCounters,
    recentTokens: pastTokens,
    upcomingBookings,
    recentProcurements,
    recentPurchases,
    recentNotifications,
    availableServices
  };
}

/**
 * Handle Farmer Chat using official gemini-3.6-flash model and strictly grounded farmer context.
 */
export async function handleFarmerAiChat(
  farmer: { _id: string; name: string; phone?: string; email?: string },
  userMessage: string,
  history: ChatHistoryItem[] = []
): Promise<{
  reply: string;
  contextSummary: {
    hasActiveToken: boolean;
    activeTokenNumber?: string;
    upcomingBookingsCount: number;
    procurementsCount: number;
  };
}> {
  // Fetch fresh farmer context safely
  const context = await getFarmerContext(farmer._id, farmer.phone, farmer.name);

  // System instruction for strict grounding and bilingual behavior
  const systemInstruction = `You are "Kisan Mitra" (किसान मित्र), the official AI Assistant for Krishi Seva Kendra (कृषि सेवा केंद्र - Kisan Queue System).
Your role is to assist the authenticated farmer with their tokens, appointments, produce procurement, purchase bills, and Kendra services.

VERIFIED APPLICATION DATA FOR THIS FARMER:
${JSON.stringify(context, null, 2)}

STRICT CORE DIRECTIVES:
1. TRUTHFULNESS & STRICT GROUNDING:
   - You MUST answer questions based EXCLUSIVELY on the verified application data provided above.
   - NEVER invent, extrapolate, or hallucinate: token numbers, queue positions, wait times/ETAs, booking references, crop weights, payment statuses, or receipts.
   - If the farmer asks about an item or record that does NOT exist in the verified data above (e.g. an unissued token, a missing payment, or an unbooked appointment), clearly and politely state in the response that the record is not available or not on file at the Kendra.
   - If the farmer asks about Kendra recommendations or Kendra distance, advise based exclusively on the verified Kendra data, queue size, and active services. NEVER invent or hallucinate physical distances (e.g. "3 km away") as GPS coordinates are not recorded in the database. Politely clarify that distance is not stored if asked.
   - If the farmer's activeToken has estimatedWaitText or estimatedTurnTime, you can provide it to the farmer as an AI estimate (e.g. "अनुमानित प्रतीक्षा समय लगभग X मिनट है"), while clarifying that actual time depends on counter service speed. If no active token is present, advise them clearly.

2. BILINGUAL SUPPORT (Hindi & English):
   - You fluently speak Hindi (हिंदी) and English.
   - If the user asks in Hindi or Hinglish, reply in warm, respectful, natural Hindi (Devanagari script or conversational Hindi).
   - If the user asks in English, reply in English.
   - Format your responses with clean, readable bullet points and short paragraphs suitable for mobile screens. Avoid wall-of-text responses.

3. SCOPE BOUNDARIES:
   - Only address Krishi Seva Kendra matters: token queue status, appointment bookings, produce procurement & weighment stages, purchase bills/invoices, and Kendra services.
   - If asked for agricultural general advice (e.g. fertilizer dosage or crop care), provide brief general educational guidance while recommending consulting the Soil Health Card or Agronomist counter at the Kendra.
   - Never expose internal system details, MongoDB data structures, API keys, or other farmers' information.

4. GREETING & TONE:
   - Address the farmer respectfully by name if known (e.g. "${farmer.name} जी" or "Kisan Bhai").
   - Courteous, humble, and supportive tone ("नमस्ते", "राम राम जी").`;

  // Format contents for @google/genai
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // Add recent conversation history (capped at last 6 messages to maintain focus)
  const safeHistory = (history || []).slice(-6);
  for (const item of safeHistory) {
    if (item.text && item.text.trim()) {
      contents.push({
        role: item.role === 'model' ? 'model' : 'user',
        parts: [{ text: item.text.trim() }]
      });
    }
  }

  // Append latest user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage.trim() }]
  });

  try {
    const ai = getGeminiClient();
    let response: any = null;

    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents as any,
        config: {
          systemInstruction,
          temperature: 0.3,
          topP: 0.95
        }
      });
    } catch (primaryModelErr: any) {
      console.warn('Primary model error, attempting fallback model (gemini-3.1-flash-lite):', primaryModelErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: contents as any,
        config: {
          systemInstruction,
          temperature: 0.3,
          topP: 0.95
        }
      });
    }

    const replyText = response.text || 'नमस्ते। हमें आपका अनुरोध प्राप्त हुआ है, कृपया थोड़ी देर बाद पुनः प्रयास करें।';

    return {
      reply: replyText,
      contextSummary: {
        hasActiveToken: Boolean(context.activeToken),
        activeTokenNumber: context.activeToken?.tokenNumber,
        upcomingBookingsCount: context.upcomingBookings.length,
        procurementsCount: context.recentProcurements.length
      }
    };
  } catch (error: any) {
    console.error('Kisan AI Service Error:', error);
    // Graceful error fallback
    const isApiKeyIssue = error?.message?.includes('API_KEY') || error?.message?.includes('key');
    const fallbackMessage = isApiKeyIssue
      ? 'क्षमा करें, कृषि सेवा केंद्र का AI सहायक वर्तमान में कॉन्फ़िगरेशन प्रक्रिया में है। कृपया सीधे काउंटर पर संपर्क करें या कुछ समय बाद पुनः प्रयास करें। (AI Service temporarily updating).'
      : 'क्षमा करें, सर्वर से संपर्क करने में समस्या आई है। आपका डेटा सुरक्षित है। कृपया थोड़ी देर बाद पुनः प्रयास करें।';

    return {
      reply: fallbackMessage,
      contextSummary: {
        hasActiveToken: Boolean(context.activeToken),
        activeTokenNumber: context.activeToken?.tokenNumber,
        upcomingBookingsCount: context.upcomingBookings.length,
        procurementsCount: context.recentProcurements.length
      }
    };
  }
}
