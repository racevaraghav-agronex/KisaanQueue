import { Router, Response } from 'express';
import { dbStatus } from '../db.ts';
import { authenticate, AuthRequest } from '../middleware/auth.ts';
import { handleFarmerAiChat, ChatHistoryItem } from '../services/aiService.ts';
import { getSmartKendraRecommendation } from '../services/kendraRecommendationService.ts';

const router = Router();

// In-memory rate limiter: 20 requests per minute per farmer
const aiRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkAiRateLimit(userIdOrIp: string): boolean {
  const now = Date.now();
  const entry = aiRateLimitMap.get(userIdOrIp);

  if (!entry || now > entry.resetAt) {
    aiRateLimitMap.set(userIdOrIp, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (entry.count >= 20) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Middleware to verify database connectivity
const ensureDb = (_req: any, res: Response, next: () => void) => {
  res.setHeader('Content-Type', 'application/json');
  if (!dbStatus.connected) {
    res.status(503).json({
      error: 'Database connection unavailable. Please try again in a few moments.'
    });
    return;
  }
  next();
};

router.use(ensureDb);

/**
 * GET /api/ai/status
 * Check availability of AI assistant service
 */
router.get('/status', (_req, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  res.json({
    status: hasKey ? 'ready' : 'degraded',
    model: 'gemini-3.8-flash',
    features: ['bilingual', 'grounded_data', 'rate_limited', 'lazy_init']
  });
});

/**
 * GET /api/ai/recommendations/kendra
 * Grounded Kendra recommendation for farmers based on real queue, ETA and slots
 */
router.get('/recommendations/kendra', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serviceCode = req.query.serviceCode ? String(req.query.serviceCode) : undefined;
    const date = req.query.date ? String(req.query.date) : undefined;
    const forceRefresh = req.query.refresh === 'true';

    const result = await getSmartKendraRecommendation({ serviceCode, date, forceRefresh });
    res.json(result);
  } catch (err: any) {
    console.error('Error generating farmer Kendra recommendation:', err);
    res.status(500).json({ error: err.message || 'Failed to generate Kendra recommendation.' });
  }
});

/**
 * POST /api/ai/chat
 * Authenticated endpoint for Farmer AI Assistant
 */
router.post('/chat', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required to access Kisan AI Assistant.' });
      return;
    }

    const clientIdentifier = req.user._id || req.ip || 'anonymous';
    if (!checkAiRateLimit(clientIdentifier)) {
      res.status(429).json({
        error: 'Too many requests. Please wait a moment before sending another message. (कृपया 1 मिनट प्रतीक्षा करें)'
      });
      return;
    }

    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    if (message.length > 800) {
      res.status(400).json({ error: 'Message exceeds maximum allowed length of 800 characters.' });
      return;
    }

    // Validate and sanitize history
    const sanitizedHistory: ChatHistoryItem[] = Array.isArray(history)
      ? history
          .filter(h => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string')
          .slice(-6)
          .map(h => ({
            role: h.role,
            text: h.text.trim().slice(0, 800)
          }))
      : [];

    const result = await handleFarmerAiChat(
      {
        _id: req.user._id,
        name: req.user.name,
        phone: req.user.phone,
        email: req.user.email
      },
      message,
      sanitizedHistory
    );

    res.json({
      ok: true,
      reply: result.reply,
      contextSummary: result.contextSummary,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error in /api/ai/chat route:', err);
    res.status(500).json({
      error: 'An error occurred while processing your request. Please try again.'
    });
  }
});

export default router;
