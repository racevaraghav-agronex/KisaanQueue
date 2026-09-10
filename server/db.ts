import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from './models/User.ts';
import { ServiceModel, DEFAULT_SERVICES } from './models/Service.ts';
import { ProductModel } from './models/Product.ts';
import { PurchaseModel } from './models/Purchase.ts';
import { StockMovementModel } from './models/StockMovement.ts';

export interface DBStatus {
  connected: boolean;
  type: 'mongodb' | 'in-memory';
  uriConfigured: boolean;
  message: string;
  error?: string;
  atlasNotice?: string;
}

export const dbStatus: DBStatus = {
  connected: false,
  type: 'in-memory',
  uriConfigured: false,
  message: 'Initializing database connection...'
};

export function setDbStatus(updates: Partial<DBStatus>) {
  Object.assign(dbStatus, updates);
}

let reconnectTimer: NodeJS.Timeout | null = null;

export function scheduleReconnect() {
  if (reconnectTimer || (dbStatus.connected && dbStatus.type === 'mongodb')) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (process.env.MONGODB_URI && dbStatus.type !== 'mongodb') {
      console.log('🔄 [MongoDB] Background reconnect attempt in progress...');
      try {
        await connectToDatabase();
      } catch {
        scheduleReconnect();
      }
    }
  }, 15000);
}

// Listen on connection events to prevent unhandled 'error' events on Mongoose EventEmitter
mongoose.connection.on('error', (err: any) => {
  console.log('[Mongoose Connection Event]:', err?.message || err);
  if (dbStatus.type === 'mongodb') {
    setDbStatus({
      connected: true,
      type: 'in-memory',
      error: err?.message || 'Database connection error',
      message: 'Switched to In-Memory mode due to connection disruption.'
    });
    scheduleReconnect();
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('[Mongoose] Disconnected from MongoDB.');
  if (dbStatus.type === 'mongodb') {
    setDbStatus({
      connected: true,
      type: 'in-memory',
      message: 'Switched to In-Memory mode due to disconnect.'
    });
    scheduleReconnect();
  }
});

export function maskMongoUri(uri: string): string {
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:****@');
}

/**
 * Sanitizes and normalizes the MongoDB URI to safely handle common accidental formatting issues:
 * 1. Surrounding quotes ('...' or "...")
 * 2. Accidental placeholder duplication from guides (e.g. inserting cluster before '@cluster....mongodb.net')
 * 3. Unescaped special characters (e.g. multiple '@' symbols in password)
 */
export function sanitizeMongoUri(rawUri: string): string {
  let uri = rawUri.trim();

  // Strip wrapping quotes if user pasted string with quotes
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }

  // Handle common copy-paste issue where cluster name was inserted right before a template placeholder
  // e.g. @kisanqueue.watzy9l@cluster....mongodb.net/kisan_queue -> @kisanqueue.watzy9l.mongodb.net/kisan_queue
  if (uri.includes('@cluster') && uri.match(/@[^@]+@cluster/)) {
    uri = uri.replace(/@([^@/]+)@cluster(?:\.+|[0-9]*\.)mongodb\.net/i, '@$1.mongodb.net');
  }

  // If multiple '@' symbols exist (e.g. unescaped @ in password):
  const atCount = (uri.match(/@/g) || []).length;
  if (atCount > 1) {
    const protoMatch = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/i);
    if (protoMatch) {
      const scheme = protoMatch[1];
      const afterScheme = protoMatch[2];
      const lastAtIndex = afterScheme.lastIndexOf('@');
      const userPassPart = afterScheme.slice(0, lastAtIndex);
      const hostAndRest = afterScheme.slice(lastAtIndex + 1);

      const firstColonIndex = userPassPart.indexOf(':');
      if (firstColonIndex !== -1) {
        const username = userPassPart.slice(0, firstColonIndex);
        const password = userPassPart.slice(firstColonIndex + 1);
        uri = `${scheme}${encodeURIComponent(decodeURIComponent(username))}:${encodeURIComponent(decodeURIComponent(password))}@${hostAndRest}`;
      }
    }
  }

  return uri;
}

/**
 * Connect to MongoDB before server starts.
 * If MONGODB_URI is not provided or unreachable, seamlessly falls back
 * to the resilient in-memory database store so the application operates uninterrupted.
 */
export async function connectToDatabase(): Promise<void> {
  mongoose.set('bufferCommands', false);

  const rawMongoUri = process.env.MONGODB_URI;

  if (!rawMongoUri || rawMongoUri.trim().length === 0) {
    console.log('ℹ️ [Database] MONGODB_URI not configured. Operating in resilient In-Memory mode.');
    setDbStatus({
      connected: true,
      type: 'in-memory',
      uriConfigured: false,
      message: 'Running in In-Memory mode with seeded Krishi Kendra services & admin. Configure MONGODB_URI to persist to MongoDB.'
    });
    await seedMongoDatabase();
    return;
  }

  const mongoUri = sanitizeMongoUri(rawMongoUri);
  if (mongoUri !== rawMongoUri) {
    console.log('🔧 [MongoDB] Sanitized malformed MONGODB_URI.');
    process.env.MONGODB_URI = mongoUri;
  }

  setDbStatus({ uriConfigured: true });

  try {
    const maskedUri = maskMongoUri(mongoUri);
    console.log(`[MongoDB] Connecting to MongoDB: ${maskedUri}`);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
      socketTimeoutMS: 8000
    });

    setDbStatus({
      connected: true,
      type: 'mongodb',
      uriConfigured: true,
      message: 'Connected to MongoDB successfully.',
      error: undefined,
      atlasNotice: undefined
    });

    console.log('✅ [MongoDB] Connected to MongoDB via Mongoose successfully.');

    // Seed required default accounts and default services if not already present
    await seedMongoDatabase();
  } catch (err: any) {
    const isAuthError =
      err.message?.includes('bad auth') ||
      err.message?.includes('authentication failed') ||
      err.message?.includes('Authentication failed');

    const isAtlasWhitelist =
      !isAuthError &&
      (err.message?.includes('whitelist') ||
        err.message?.includes('Atlas cluster') ||
        err.message?.includes('ETIMEDOUT') ||
        err.message?.includes('serverSelectionTimeoutMS') ||
        err.message?.includes('alert internal error') ||
        err.message?.includes('alert number 80'));

    let atlasNotice: string | undefined;
    let failureMessage = 'MongoDB connection failed';

    if (isAuthError) {
      failureMessage = 'MongoDB authentication failed: Incorrect database username or password';
      atlasNotice = 'Check MongoDB Atlas -> Database Access -> Database Users. Ensure the user exists and the password matches MONGODB_URI.';
    } else if (isAtlasWhitelist) {
      failureMessage = 'MongoDB connection failed: pending Atlas IP whitelist';
      atlasNotice = 'MongoDB Atlas Network Access: Whitelist IP 0.0.0.0/0 in MongoDB Atlas Security Settings to allow Cloud Run container access.';
    }

    console.log('================================================================');
    console.log('[MongoDB Connection Notice]');
    console.log(err.message);
    if (atlasNotice) {
      console.log(`👉 ${atlasNotice}`);
    }
    console.log('Falling back to In-Memory store for uninterrupted operation.');
    console.log('================================================================');

    setDbStatus({
      connected: true,
      type: 'in-memory',
      uriConfigured: true,
      message: `${failureMessage} — running in In-Memory fallback mode.`,
      error: err.message,
      atlasNotice
    });

    await seedMongoDatabase();
    scheduleReconnect();
  }
}

/**
 * Ensures default accounts and default services exist.
 */
async function seedMongoDatabase(): Promise<void> {
  try {
    // 1. Ensure required default Admin account exists
    const existingAdmin = await UserModel.findOne({ email: 'admin@kisanqueue.com' });
    if (!existingAdmin) {
      const adminHashed = await bcrypt.hash('Admin@123', 10);
      await UserModel.create({
        name: 'Kendra In-charge Sharma (Admin)',
        email: 'admin@kisanqueue.com',
        phone: '+91 99999 88888',
        password: adminHashed,
        role: 'admin',
        status: 'active'
      });
      console.log('[Seed] Provisioned default Admin account: admin@kisanqueue.com');
    } else {
      const matches = await bcrypt.compare('Admin@123', existingAdmin.password || '');
      if (!matches) {
        existingAdmin.password = await bcrypt.hash('Admin@123', 10);
        existingAdmin.status = 'active';
        await existingAdmin.save();
      }
    }

    // 2. Ensure default Staff account exists
    const existingStaff = await UserModel.findOne({ email: 'staff@kisanqueue.com' });
    if (!existingStaff) {
      const staffHashed = await bcrypt.hash('staff123', 10);
      await UserModel.create({
        name: 'Ramesh Kumar (Staff Counter 1)',
        email: 'staff@kisanqueue.com',
        phone: '+91 98765 00001',
        password: staffHashed,
        role: 'staff',
        counterNumber: 1,
        centre: 'Main Kendra Counter 1',
        status: 'active',
        shiftStatus: 'active'
      });
      console.log('[Seed] Provisioned default Staff account: staff@kisanqueue.com');
    } else {
      const matches = await bcrypt.compare('staff123', existingStaff.password || '');
      if (!matches) {
        existingStaff.password = await bcrypt.hash('staff123', 10);
        existingStaff.status = 'active';
        existingStaff.counterNumber = existingStaff.counterNumber || 1;
        await existingStaff.save();
      }
    }

    // 3. Ensure default Farmer account exists and password matches demo quick-fill
    const existingFarmer = await UserModel.findOne({
      $or: [{ phone: '9876543210' }, { email: 'farmer@kisanqueue.com' }]
    });
    if (!existingFarmer) {
      const farmerHashed = await bcrypt.hash('farmer123', 10);
      await UserModel.create({
        name: 'Kisan Balwan Singh',
        email: 'farmer@kisanqueue.com',
        phone: '9876543210',
        password: farmerHashed,
        role: 'farmer',
        status: 'active'
      });
      console.log('[Seed] Provisioned default Farmer account: 9876543210');
    } else {
      const matches = await bcrypt.compare('farmer123', existingFarmer.password || '');
      if (!matches) {
        existingFarmer.password = await bcrypt.hash('farmer123', 10);
        existingFarmer.status = 'active';
        await existingFarmer.save();
        console.log('[Seed] Synced default Farmer account password for 9876543210');
      }
    }

    // 4. Ensure default Services exist without duplicates
    for (const service of DEFAULT_SERVICES) {
      const existing = await ServiceModel.findOne({ code: service.code });
      if (!existing) {
        await ServiceModel.create({
          code: service.code,
          name: service.name,
          description: service.description,
          averageMinutes: service.averageMinutes,
          category: service.category
        });
      }
    }
    console.log('[MongoDB Seed] Verified default services in MongoDB.');

    // 3. Ensure default Agricultural Products exist in MongoDB Stock Register
    const productCount = await ProductModel.countDocuments();
    if (productCount === 0) {
      const DEFAULT_PRODUCTS = [
        {
          code: 'UREA-45',
          name: 'Neem Coated Urea (45kg)',
          category: 'Fertilizer',
          stock: 250,
          unit: 'Bag',
          purchaseRate: 242,
          sellingRate: 266.5,
          minThreshold: 50
        },
        {
          code: 'DAP-50',
          name: 'DAP 18:46:0 (50kg)',
          category: 'Fertilizer',
          stock: 180,
          unit: 'Bag',
          purchaseRate: 1250,
          sellingRate: 1350,
          minThreshold: 30
        },
        {
          code: 'NPK-123216',
          name: 'NPK 12:32:16 Complex (50kg)',
          category: 'Fertilizer',
          stock: 120,
          unit: 'Bag',
          purchaseRate: 1370,
          sellingRate: 1470,
          minThreshold: 25
        },
        {
          code: 'MOP-50',
          name: 'MOP - Muriate of Potash (50kg)',
          category: 'Fertilizer',
          stock: 90,
          unit: 'Bag',
          purchaseRate: 1550,
          sellingRate: 1700,
          minThreshold: 20
        },
        {
          code: 'SEED-WHEAT-HD',
          name: 'Certified Wheat Seeds HD-2967 (40kg)',
          category: 'Seeds',
          stock: 85,
          unit: 'Bag',
          purchaseRate: 1050,
          sellingRate: 1200,
          minThreshold: 20
        },
        {
          code: 'SEED-MUST-P31',
          name: 'Certified Hybrid Mustard Seeds (Pusa-31) (2kg)',
          category: 'Seeds',
          stock: 110,
          unit: 'Packet',
          purchaseRate: 420,
          sellingRate: 520,
          minThreshold: 15
        },
        {
          code: 'ZN-21-5KG',
          name: 'Zinc Sulphate 21% (5kg)',
          category: 'Micro-nutrients',
          stock: 140,
          unit: 'Packet',
          purchaseRate: 280,
          sellingRate: 350,
          minThreshold: 25
        },
        {
          code: 'EQ-SPRAY-16L',
          name: 'Battery Knapsack Sprayer 16L',
          category: 'Equipment',
          stock: 25,
          unit: 'Unit',
          purchaseRate: 1850,
          sellingRate: 2200,
          minThreshold: 5
        },
        {
          code: 'PEST-CHLOR-1L',
          name: 'Chlorpyrifos 20% EC (1 Litre)',
          category: 'Pesticides',
          stock: 60,
          unit: 'Bottle',
          purchaseRate: 380,
          sellingRate: 460,
          minThreshold: 10
        }
      ];

      const createdProducts = await ProductModel.insertMany(DEFAULT_PRODUCTS);
      console.log(`[MongoDB Seed] Provisioned ${createdProducts.length} default Krishi Kendra products in stock register.`);

      // Also create an initial Purchase Register record so staff has sample purchase history
      const initialPurchaseItems = createdProducts.slice(0, 3).map(p => ({
        productName: p.name,
        productId: p._id.toString(),
        productCode: p.code,
        quantity: p.stock,
        purchaseRate: p.purchaseRate,
        amount: p.stock * p.purchaseRate
      }));
      const initialTotal = initialPurchaseItems.reduce((acc, it) => acc + it.amount, 0);

      await PurchaseModel.create({
        invoiceNumber: 'PUR-INIT-2026-001',
        supplier: 'National Fertilizers Ltd & State Seeds Corp',
        date: new Date(Date.now() - 2 * 86400000), // 2 days ago
        itemsCount: initialPurchaseItems.length,
        items: initialPurchaseItems,
        total: initialTotal,
        recordedBy: 'Kendra In-charge Sharma (Admin)'
      });

      // Also create initial stock movement audit logs
      for (const p of createdProducts) {
        await StockMovementModel.create({
          productId: p._id.toString(),
          productCode: p.code,
          productName: p.name,
          type: 'purchase',
          quantity: p.stock,
          resultingStock: p.stock,
          referenceInvoice: 'PUR-INIT-2026-001',
          notes: 'Opening stock from seasonal procurement',
          performedBy: 'System Initializer'
        });
      }
      console.log('[MongoDB Seed] Provisioned initial Purchase Register record and Stock Movements.');
    }
  } catch (err) {
    console.error('[MongoDB Seed] Error during data seeding:', err);
  }
}

/**
 * Middleware or check to ensure database is available before processing CRUD
 */
export function checkDbConnection(): { ok: boolean; error?: string } {
  if (dbStatus.connected) {
    return { ok: true };
  }
  return {
    ok: false,
    error: dbStatus.error || 'Database is currently initializing.'
  };
}
