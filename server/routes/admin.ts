import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.ts';
import { TokenModel } from '../models/Token.ts';
import { ServiceModel, DEFAULT_SERVICES } from '../models/Service.ts';
import { ProductModel } from '../models/Product.ts';
import { SaleModel } from '../models/Sale.ts';
import { PriceHistoryModel } from '../models/PriceHistory.ts';
import { dbStatus } from '../db.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';
import { 
  normalizeIndianMobile, 
  isValidEmail, 
  MOBILE_ERROR_MESSAGE, 
  EMAIL_ERROR_MESSAGE 
} from '../utils/validators.ts';

const router = Router();

// Middleware to ensure MongoDB is ready
const ensureDb = (_req: any, res: Response, next: () => void) => {
  res.setHeader('Content-Type', 'application/json');
  if (!dbStatus.connected) {
    res.status(503).json({
      error: 'Database connection unavailable'
    });
    return;
  }
  next();
};

// Require Admin role and active MongoDB connection for all admin routes
router.use(authenticate, requireRole(['admin']), ensureDb);

// ==========================================
// 1. DASHBOARD & STATS (REAL MONGODB DATA)
// ==========================================
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalFarmers,
      totalStaff,
      activeStaff,
      totalTokens,
      waitingTokens,
      servingTokens,
      completedTokens,
      skippedTokens,
      todayTokens,
      totalProducts,
      lowStockProducts,
      todaySalesList
    ] = await Promise.all([
      UserModel.countDocuments({ role: 'farmer' }),
      UserModel.countDocuments({ role: 'staff' }),
      UserModel.countDocuments({ role: 'staff', status: { $ne: 'inactive' } }),
      TokenModel.countDocuments(),
      TokenModel.countDocuments({ status: 'waiting' }),
      TokenModel.countDocuments({ status: 'serving' }),
      TokenModel.countDocuments({ status: 'completed' }),
      TokenModel.countDocuments({ status: 'skipped' }),
      TokenModel.countDocuments({ issuedAt: { $gte: startOfToday } }),
      ProductModel.countDocuments(),
      ProductModel.countDocuments({
        $or: [
          { status: { $in: ['low_stock', 'out_of_stock'] } },
          { $expr: { $lte: ['$stock', '$minThreshold'] } }
        ]
      }),
      SaleModel.find({ date: { $gte: startOfToday } }, 'total')
    ]);

    const todaySalesTotal = todaySalesList.reduce((acc, s) => acc + (s.total || 0), 0);
    const todaySalesCount = todaySalesList.length;

    const serviceStats = await TokenModel.aggregate([
      { $group: { _id: '$serviceName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      totalFarmers,
      totalStaff,
      activeStaff,
      totalTokens,
      waitingTokens,
      servingTokens,
      completedTokens,
      skippedTokens,
      todayTokens,
      totalProducts,
      lowStockProducts,
      todaySalesTotal,
      todaySalesCount,
      serviceDistribution: serviceStats.map(s => ({ name: s._id || 'General', count: s.count })),
      dbStatus: {
        connected: true,
        type: 'mongodb',
        message: dbStatus.message
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin stats from MongoDB' });
  }
});

// ==========================================
// 2. STAFF MANAGEMENT (ADMIN ONLY)
// ==========================================

// Get all staff
router.get('/staff', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status } = req.query;
    const query: any = { role: 'staff' };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { phone: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const staffList = await UserModel.find(query).select('-password').sort({ createdAt: -1 });
    res.json(staffList);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch staff list' });
  }
});

// Create Staff (Admin only, cannot create admin)
router.post('/staff', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, counterNumber, assignedService, centre, shiftStatus } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Staff full name is required.' });
      return;
    }

    // Strict Indian mobile validation
    const normalizedPhone = normalizeIndianMobile(phone);
    if (!normalizedPhone) {
      res.status(400).json({ error: MOBILE_ERROR_MESSAGE });
      return;
    }

    // Strict email validation
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    if (!isValidEmail(cleanEmail, false)) {
      res.status(400).json({ error: EMAIL_ERROR_MESSAGE });
      return;
    }

    // Counter validation
    const cNum = Number(counterNumber);
    const counter = !isNaN(cNum) && cNum >= 1 && cNum <= 6 ? cNum : 1;

    // Check duplicate
    const existing = await UserModel.findOne({
      $or: [
        { email: cleanEmail },
        { phone: normalizedPhone },
        { phone: `+91 ${normalizedPhone}` }
      ]
    });

    if (existing) {
      const isEmail = existing.email === cleanEmail;
      res.status(409).json({
        error: isEmail
          ? 'A user with this email address already exists in MongoDB.'
          : 'A user with this mobile number already exists in MongoDB.'
      });
      return;
    }

    const rawPassword = password && password.length >= 6 ? password : 'kisan123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newStaff = await UserModel.create({
      name: name.trim(),
      email: cleanEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: 'staff',
      status: 'active',
      counterNumber: counter,
      centre: centre || 'Krishi Seva Kendra - Main Centre',
      shiftStatus: shiftStatus && ['active', 'break', 'offline'].includes(shiftStatus) ? shiftStatus : 'active',
      assignedService: assignedService || 'General Support'
    });

    res.status(201).json({
      message: 'Staff member created successfully in MongoDB',
      user: {
        _id: newStaff._id.toString(),
        name: newStaff.name,
        email: newStaff.email,
        phone: newStaff.phone,
        role: newStaff.role,
        status: newStaff.status,
        counterNumber: newStaff.counterNumber,
        centre: newStaff.centre,
        shiftStatus: newStaff.shiftStatus,
        assignedService: newStaff.assignedService
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create staff account' });
  }
});

// Edit Staff
router.put('/staff/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, counterNumber, assignedService, password, status, centre, shiftStatus } = req.body;

    const staff = await UserModel.findById(id);
    if (!staff) {
      res.status(404).json({ error: 'Staff member not found in MongoDB.' });
      return;
    }

    if (staff.role === 'admin') {
      res.status(403).json({ error: 'Admin accounts cannot be edited via the staff manager.' });
      return;
    }

    if (name && name.trim()) staff.name = name.trim();

    if (phone) {
      const normalizedPhone = normalizeIndianMobile(phone);
      if (!normalizedPhone) {
        res.status(400).json({ error: MOBILE_ERROR_MESSAGE });
        return;
      }
      // Check duplicate
      const duplicate = await UserModel.findOne({
        _id: { $ne: id },
        $or: [{ phone: normalizedPhone }, { phone: `+91 ${normalizedPhone}` }]
      });
      if (duplicate) {
        res.status(409).json({ error: 'This mobile number is already assigned to another user.' });
        return;
      }
      staff.phone = normalizedPhone;
    }

    if (counterNumber !== undefined) {
      const c = Number(counterNumber);
      if (!isNaN(c) && c >= 1 && c <= 6) {
        staff.counterNumber = c;
      }
    }

    if (assignedService !== undefined) {
      staff.assignedService = assignedService;
    }

    if (centre && typeof centre === 'string' && centre.trim()) {
      staff.centre = centre.trim();
    }

    if (shiftStatus && ['active', 'break', 'offline'].includes(shiftStatus)) {
      staff.shiftStatus = shiftStatus;
    }

    if (status && (status === 'active' || status === 'inactive')) {
      staff.status = status;
    }

    if (password && password.length >= 6) {
      staff.password = await bcrypt.hash(password, 10);
    }

    await staff.save();

    res.json({
      message: 'Staff details updated successfully',
      user: {
        _id: staff._id.toString(),
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        status: staff.status,
        counterNumber: staff.counterNumber,
        centre: staff.centre,
        shiftStatus: staff.shiftStatus,
        assignedService: staff.assignedService
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update staff member' });
  }
});

// Activate / Deactivate Staff (Does NOT delete records)
router.patch('/staff/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'active' && status !== 'inactive') {
      res.status(400).json({ error: 'Invalid status. Must be "active" or "inactive".' });
      return;
    }

    const targetUser = await UserModel.findById(id);
    if (!targetUser) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }

    if (targetUser.role === 'admin') {
      res.status(403).json({ error: 'Cannot deactivate an Admin account.' });
      return;
    }

    targetUser.status = status;
    await targetUser.save();

    res.json({
      message: `Staff account is now ${status}. All historical transactions remain preserved.`,
      status: targetUser.status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update staff status' });
  }
});

// ==========================================
// 3. FARMER MANAGEMENT
// ==========================================

// Get all farmers with token count and purchase count
router.get('/farmers', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status } = req.query;
    const query: any = { role: 'farmer' };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { phone: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const farmers = await UserModel.find(query).select('-password').sort({ createdAt: -1 });
    res.json(farmers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch farmers' });
  }
});

// Activate / Deactivate Farmer
router.patch('/farmers/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'active' && status !== 'inactive') {
      res.status(400).json({ error: 'Invalid status. Must be "active" or "inactive".' });
      return;
    }

    const farmer = await UserModel.findById(id);
    if (!farmer) {
      res.status(404).json({ error: 'Farmer not found in MongoDB.' });
      return;
    }

    farmer.status = status;
    await farmer.save();

    res.json({
      message: `Farmer account is now ${status}. History preserved.`,
      status: farmer.status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update farmer status' });
  }
});

// Get farmer token history
router.get('/farmers/:id/tokens', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tokens = await TokenModel.find({ farmerId: id }).sort({ issuedAt: -1 });
    res.json(tokens);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch farmer tokens' });
  }
});

// Get farmer purchase / sales history
router.get('/farmers/:id/sales', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const farmer = await UserModel.findById(id);
    const orConds: any[] = [{ farmerId: id }];
    if (farmer?.phone) {
      orConds.push({ farmerPhone: farmer.phone });
    }

    const sales = await SaleModel.find({ $or: orConds }).sort({ date: -1 });
    res.json(sales);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch farmer sales' });
  }
});

// ==========================================
// 4. SERVICE MANAGEMENT
// ==========================================

// Get all services
router.get('/services', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const services = await ServiceModel.find().sort({ name: 1 });
    if (services.length === 0) {
      res.json(DEFAULT_SERVICES.map(s => ({ ...s, fee: 0, isActive: true, requiresBilling: Boolean((s as any).requiresBilling) })));
      return;
    }
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch services' });
  }
});

// Add service
router.post('/services', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, code, description, averageMinutes, category, fee, isActive, requiresBilling } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Service name is required.' });
      return;
    }

    const serviceCode = code ? code.trim().toUpperCase() : `SRV-${Date.now().toString().slice(-4)}`;
    const existing = await ServiceModel.findOne({ code: serviceCode });
    if (existing) {
      res.status(409).json({ error: `A service with code "${serviceCode}" already exists.` });
      return;
    }

    const service = await ServiceModel.create({
      code: serviceCode,
      name: name.trim(),
      description: description ? description.trim() : 'Agricultural Kendra service',
      averageMinutes: Number(averageMinutes) > 0 ? Number(averageMinutes) : 10,
      category: category ? category.trim() : 'General',
      fee: Number(fee) >= 0 ? Number(fee) : 0,
      isActive: isActive !== false,
      requiresBilling: Boolean(requiresBilling) || false
    });

    res.status(201).json({ message: 'Service created successfully', service });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create service' });
  }
});

// Edit service
router.put('/services/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, averageMinutes, category, fee, isActive, requiresBilling } = req.body;

    const service = await ServiceModel.findById(id);
    if (!service) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }

    if (name && name.trim()) service.name = name.trim();
    if (description !== undefined) service.description = description.trim();
    if (averageMinutes !== undefined && Number(averageMinutes) > 0) {
      service.averageMinutes = Number(averageMinutes);
    }
    if (category) service.category = category.trim();
    if (fee !== undefined && Number(fee) >= 0) service.fee = Number(fee);
    if (isActive !== undefined) service.isActive = Boolean(isActive);
    if (requiresBilling !== undefined) service.requiresBilling = Boolean(requiresBilling);

    await service.save();
    res.json({ message: 'Service updated successfully', service });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update service' });
  }
});

// Toggle service active status
router.patch('/services/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const service = await ServiceModel.findById(id);
    if (!service) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }

    service.isActive = Boolean(isActive);
    await service.save();

    res.json({
      message: `Service is now ${service.isActive ? 'Active' : 'Inactive'}`,
      service
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update service status' });
  }
});

// ==========================================
// 5. PRODUCT MANAGEMENT
// ==========================================

// Get all products
router.get('/products', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, category, status } = req.query;
    const query: any = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      if (status === 'active') query.isActive = true;
      else if (status === 'inactive') query.isActive = false;
      else query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const clean = search.trim();
      query.$or = [
        { name: { $regex: clean, $options: 'i' } },
        { code: { $regex: clean, $options: 'i' } }
      ];
    }

    const products = await ProductModel.find(query).sort({ name: 1 });
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
});

// Add new product
router.post('/products', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      name, 
      code, 
      category, 
      stock, 
      unit, 
      purchaseRate, 
      sellingRate, 
      minThreshold, 
      supplier, 
      description, 
      isActive 
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Product name cannot be empty.' });
      return;
    }

    if (!code || !code.trim()) {
      res.status(400).json({ error: 'Product SKU/code cannot be empty.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await ProductModel.findOne({ code: cleanCode });
    if (existing) {
      res.status(409).json({ error: `Product with SKU "${cleanCode}" already exists. SKU must be unique.` });
      return;
    }

    const pRate = Number(purchaseRate);
    const sRate = Number(sellingRate);
    const st = Number(stock);
    const thresh = Number(minThreshold);

    if (pRate < 0 || sRate < 0) {
      res.status(400).json({ error: 'Product purchase and selling price cannot be negative.' });
      return;
    }

    if (st < 0) {
      res.status(400).json({ error: 'Product initial stock cannot be negative.' });
      return;
    }

    const product = await ProductModel.create({
      name: name.trim(),
      code: cleanCode,
      category: category ? category.trim() : 'Fertilizer',
      stock: !isNaN(st) ? st : 0,
      unit: unit ? unit.trim() : 'Bag',
      purchaseRate: !isNaN(pRate) ? pRate : 0,
      sellingRate: !isNaN(sRate) ? sRate : 0,
      minThreshold: !isNaN(thresh) ? thresh : 10,
      supplier: supplier ? supplier.trim() : '',
      description: description ? description.trim() : '',
      isActive: isActive !== false
    });

    res.status(201).json({ message: 'Product created successfully in MongoDB', product });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});

// Edit product details
router.put('/products/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      name, 
      category, 
      unit, 
      purchaseRate, 
      sellingRate, 
      minThreshold, 
      supplier, 
      description,
      isActive 
    } = req.body;

    const product = await ProductModel.findById(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    if (name && name.trim()) product.name = name.trim();
    if (category) product.category = category.trim();
    if (unit) product.unit = unit.trim();
    if (supplier !== undefined) product.supplier = supplier.trim();
    if (description !== undefined) product.description = description.trim();
    if (isActive !== undefined) product.isActive = Boolean(isActive);

    if (purchaseRate !== undefined) {
      const p = Number(purchaseRate);
      if (p < 0) {
        res.status(400).json({ error: 'Purchase rate cannot be negative.' });
        return;
      }
      product.purchaseRate = p;
    }

    if (minThreshold !== undefined) {
      const m = Number(minThreshold);
      if (m >= 0) product.minThreshold = m;
    }

    // If sellingRate changed, record in PriceHistory
    if (sellingRate !== undefined) {
      const newRate = Number(sellingRate);
      if (newRate < 0) {
        res.status(400).json({ error: 'Selling rate cannot be negative.' });
        return;
      }

      if (newRate !== product.sellingRate) {
        await PriceHistoryModel.create({
          productId: product._id,
          productCode: product.code,
          productName: product.name,
          oldPrice: product.sellingRate,
          newPrice: newRate,
          changedBy: req.user?.name || 'Admin',
          changedAt: new Date()
        });
        product.sellingRate = newRate;
      }
    }

    await product.save();
    res.json({ message: 'Product updated successfully', product });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});

// Toggle product active status (NO hard delete to keep sales history intact)
router.patch('/products/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const product = await ProductModel.findById(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found in stock register.' });
      return;
    }

    product.isActive = Boolean(isActive);
    await product.save();

    res.json({
      message: `Product is now ${product.isActive ? 'Active' : 'Inactive'}`,
      product
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update product status' });
  }
});

// ==========================================
// 6. RATE LIST & PRICE AUDIT HISTORY
// ==========================================

// Get rate list
router.get('/rates', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, category } = req.query;
    const query: any = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const clean = search.trim();
      query.$or = [
        { name: { $regex: clean, $options: 'i' } },
        { code: { $regex: clean, $options: 'i' } }
      ];
    }

    const products = await ProductModel.find(query).sort({ name: 1 });
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch rates' });
  }
});

// Update product selling rate and record audit log
router.put('/rates/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { sellingRate } = req.body;

    const numRate = Number(sellingRate);
    if (isNaN(numRate) || numRate < 0) {
      res.status(400).json({ error: 'Selling rate must be a valid non-negative number.' });
      return;
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const oldPrice = product.sellingRate;
    product.sellingRate = numRate;
    await product.save();

    // Create audit record
    const historyEntry = await PriceHistoryModel.create({
      productId: product._id,
      productCode: product.code,
      productName: product.name,
      oldPrice,
      newPrice: numRate,
      changedBy: req.user?.name || 'Administrator',
      changedAt: new Date()
    });

    res.json({
      message: `Selling rate for ${product.name} updated to ₹${numRate}. Previous invoices retain original rates.`,
      product,
      auditRecord: historyEntry
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update product rate' });
  }
});

// Get price change history
router.get('/rates/history', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.query;
    const query: any = {};
    if (productId) query.productId = productId;

    const history = await PriceHistoryModel.find(query).sort({ changedAt: -1 }).limit(100);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch price history' });
  }
});

// ==========================================
// 7. QUEUE OVERVIEW (ADMIN MONITOR)
// ==========================================
router.get('/queue', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const clean = search.trim();
      query.$or = [
        { tokenNumber: { $regex: clean, $options: 'i' } },
        { farmerName: { $regex: clean, $options: 'i' } },
        { farmerPhone: { $regex: clean, $options: 'i' } },
        { serviceName: { $regex: clean, $options: 'i' } }
      ];
    }

    const tokens = await TokenModel.find(query).sort({ sequence: -1 }).limit(200);
    res.json(tokens);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch queue list' });
  }
});

// ==========================================
// 8. SALES OVERVIEW
// ==========================================
router.get('/sales', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dateRange, paymentMethod, search } = req.query;
    const query: any = {};

    if (dateRange === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      query.date = { $gte: startOfToday };
    } else if (dateRange === 'week') {
      const startOfWeek = new Date(Date.now() - 7 * 86400000);
      query.date = { $gte: startOfWeek };
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const clean = search.trim();
      query.$or = [
        { invoiceNumber: { $regex: clean, $options: 'i' } },
        { farmerName: { $regex: clean, $options: 'i' } },
        { farmerPhone: { $regex: clean, $options: 'i' } }
      ];
    }

    const sales = await SaleModel.find(query).sort({ date: -1 }).limit(200);
    const totalRevenue = sales.reduce((acc, s) => acc + (s.total || 0), 0);

    res.json({ sales, totalRevenue, count: sales.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch sales overview' });
  }
});

// ==========================================
// 9. PAYMENTS OVERVIEW
// ==========================================
router.get('/payments', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const breakdown = await SaleModel.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalCollected = breakdown.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const totalTransactions = breakdown.reduce((acc, b) => acc + (b.count || 0), 0);

    res.json({
      breakdown: breakdown.map(b => ({
        method: b._id || 'Cash',
        amount: b.totalAmount,
        count: b.count
      })),
      totalCollected,
      totalTransactions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch payments overview' });
  }
});

// ==========================================
// 10. DAILY REPORTS & AUDIT
// ==========================================
router.get('/reports/daily', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      tokensIssuedToday,
      tokensServedToday,
      tokensWaitingToday,
      todaySales,
      lowStockItems
    ] = await Promise.all([
      TokenModel.countDocuments({ issuedAt: { $gte: startOfToday } }),
      TokenModel.countDocuments({ issuedAt: { $gte: startOfToday }, status: 'completed' }),
      TokenModel.countDocuments({ status: 'waiting' }),
      SaleModel.find({ date: { $gte: startOfToday } }),
      ProductModel.find({
        $or: [
          { status: { $in: ['low_stock', 'out_of_stock'] } },
          { $expr: { $lte: ['$stock', '$minThreshold'] } }
        ]
      }, 'code name stock unit minThreshold')
    ]);

    const salesTotalToday = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);
    const cashTotal = todaySales.filter(s => s.paymentMethod === 'Cash').reduce((acc, s) => acc + (s.total || 0), 0);
    const upiTotal = todaySales.filter(s => s.paymentMethod === 'UPI').reduce((acc, s) => acc + (s.total || 0), 0);

    // Aggregate items sold today
    const itemsMap: Record<string, { name: string; quantity: number; amount: number }> = {};
    for (const s of todaySales) {
      for (const item of (s.items || [])) {
        const key = item.productCode || item.productName;
        if (!itemsMap[key]) {
          itemsMap[key] = { name: item.productName, quantity: 0, amount: 0 };
        }
        itemsMap[key].quantity += (item.quantity || 0);
        itemsMap[key].amount += (item.amount || 0);
      }
    }

    const topSoldItems = Object.values(itemsMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    res.json({
      reportDate: startOfToday.toISOString(),
      tokens: {
        issued: tokensIssuedToday,
        served: tokensServedToday,
        waiting: tokensWaitingToday
      },
      sales: {
        totalRevenue: salesTotalToday,
        invoicesCount: todaySales.length,
        cashRevenue: cashTotal,
        upiRevenue: upiTotal
      },
      lowStockItems,
      topSoldItems
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate daily report' });
  }
});

export default router;
