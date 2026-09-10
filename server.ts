import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { connectToDatabase, dbStatus } from './server/db.ts';
import authRoutes from './server/routes/auth.ts';
import tokenRoutes from './server/routes/tokens.ts';
import adminRoutes from './server/routes/admin.ts';
import inventoryRoutes from './server/routes/inventory.ts';
import slotsRoutes from './server/routes/slots.ts';

// Load environment variables from .env
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Middleware for JSON body parsing with size limit
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Handle JSON parsing syntax errors (e.g. malformed JSON in request body) returning JSON instead of HTML
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
      res.setHeader('Content-Type', 'application/json');
      res.status(400).json({ error: 'Invalid JSON payload in request body' });
      return;
    }
    next(err);
  });

  // Ensure all /api responses default to Content-Type: application/json
  app.use('/api', (_req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Connect to MongoDB before starting Express server
  console.log('🔄 [Startup] Connecting to MongoDB as the ONLY database...');
  try {
    await connectToDatabase();
  } catch (err: any) {
    console.log('[Startup] MongoDB connection pending:', err.message);
    console.log('================================================================');
    console.log('NOTICE: MONGODB_URI is required for persistent database operations.');
    console.log('In-memory database fallback is completely disabled.');
    console.log('================================================================');
  }

  // API Routes MUST be mounted before Vite middleware
  app.get('/api/health', (_req, res) => {
    res.json({
      status: dbStatus.connected ? 'ok' : 'database_error',
      service: 'Kisan Queue API',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tokens', tokenRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/slots', slotsRoutes);
  app.use('/api/bookings', slotsRoutes);
  app.use('/api', slotsRoutes);

  // Direct shortcuts for convenience
  app.get('/api/services', (req, res, next) => {
    req.url = '/services';
    tokenRoutes(req, res, next);
  });
  app.get('/api/live-queue', (req, res, next) => {
    req.url = '/live-queue';
    tokenRoutes(req, res, next);
  });

  // Catch-all for undefined /api/* routes so they NEVER fall through to Vite SPA HTML
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Global error handler for /api to guarantee JSON responses (never HTML error pages)
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('❌ API Error:', err);
    res.setHeader('Content-Type', 'application/json');
    const statusCode = typeof err.status === 'number' ? err.status : 500;
    res.status(statusCode).json({
      error: err.message || 'Internal server error'
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind server on port 3000 and 0.0.0.0 for container routing
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌾 Kisan Queue MERN Server running at http://0.0.0.0:${PORT}`);
    console.log(`📊 DB Mode: ${dbStatus.type.toUpperCase()} (Connected: ${dbStatus.connected})`);
    if (!dbStatus.connected && dbStatus.error) {
      console.warn(`⚠️ Warning: MongoDB is not connected: ${dbStatus.error}`);
    }
  });

  // Handle server errors to prevent unhandled 'error' event crashes (such as listen EADDRINUSE)
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ [Server Error] Port ${PORT} is already in use.`);
    } else {
      console.error('❌ [Server Error]:', err);
    }
  });

  // Clean shutdown handlers to release port 3000 on process termination
  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Global safety error listeners to prevent uncaught process exit
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
