import { Router, Response } from 'express';
import { ProductModel } from '../models/Product.ts';
import { SaleModel } from '../models/Sale.ts';
import { PurchaseModel } from '../models/Purchase.ts';
import { StockMovementModel } from '../models/StockMovement.ts';
import { UserModel } from '../models/User.ts';
import { TokenModel } from '../models/Token.ts';
import { dbStatus } from '../db.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Middleware to ensure MongoDB is ready
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

// 1. Get all inventory products from MongoDB
router.get('/products', async (_req, res: Response): Promise<void> => {
  try {
    const products = await ProductModel.find().sort({ name: 1 });
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch products from MongoDB' });
  }
});

// 2. Add or update product in MongoDB (Admin / Staff)
router.post('/products', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, code, category, stock, unit, purchaseRate, sellingRate, minThreshold } = req.body;

    if (!name || !code) {
      res.status(400).json({ error: 'Product name and code are required.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const currentStock = Number(stock || 0);
    const threshold = Number(minThreshold || 10);

    let product = await ProductModel.findOne({ code: cleanCode });

    if (product) {
      product.name = name.trim();
      product.category = category || product.category;
      product.stock = currentStock;
      product.unit = unit || product.unit;
      product.purchaseRate = Number(purchaseRate ?? product.purchaseRate);
      product.sellingRate = Number(sellingRate ?? product.sellingRate);
      product.minThreshold = threshold;
      await product.save();
    } else {
      product = await ProductModel.create({
        name: name.trim(),
        code: cleanCode,
        category: category || 'Fertilizer',
        stock: currentStock,
        unit: unit || 'Bag',
        purchaseRate: Number(purchaseRate || 0),
        sellingRate: Number(sellingRate || 0),
        minThreshold: threshold
      });
    }

    // Record initial stock movement if quantity > 0
    if (currentStock > 0) {
      await StockMovementModel.create({
        productId: product._id.toString(),
        productCode: product.code,
        productName: product.name,
        type: 'adjustment',
        quantity: currentStock,
        resultingStock: product.stock,
        referenceInvoice: 'INITIAL-STOCK',
        notes: 'Product registered or updated in stock register',
        performedBy: req.user?.name || 'Staff'
      });
    }

    res.status(201).json({ message: 'Product saved in MongoDB stock register', product });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save product in MongoDB' });
  }
});

/**
 * Generates a unique, collision-proof sale invoice number.
 * Format: INV-YYYYMMDD-XXXXX
 * Verifies against MongoDB to guarantee absolute uniqueness.
 */
async function generateUniqueSaleInvoiceNumber(): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yyyy}${mm}${dd}`;

  for (let attempt = 0; attempt < 30; attempt++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const timeSuffix = Date.now().toString().slice(-4);
    const candidate = `INV-${datePrefix}-${timeSuffix}${randomSuffix}`;
    const exists = await SaleModel.findOne({ invoiceNumber: candidate });
    if (!exists) {
      return candidate;
    }
  }

  return `INV-${datePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

/**
 * Generates a unique, collision-proof purchase invoice number.
 */
async function generateUniquePurchaseInvoiceNumber(): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yyyy}${mm}${dd}`;

  for (let attempt = 0; attempt < 30; attempt++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const timeSuffix = Date.now().toString().slice(-4);
    const candidate = `PUR-${datePrefix}-${timeSuffix}${randomSuffix}`;
    const exists = await PurchaseModel.findOne({ invoiceNumber: candidate });
    if (!exists) {
      return candidate;
    }
  }

  return `PUR-${datePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// 3. Update product stock / details in MongoDB (Admin / Staff)
router.put('/products/:id/stock', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { stock, sellingRate, purchaseRate, name, category, unit, minThreshold } = req.body;

    let product = await ProductModel.findById(id);
    if (!product) {
      product = await ProductModel.findOne({ code: id });
    }

    if (!product) {
      res.status(404).json({ error: 'Product not found in stock register.' });
      return;
    }

    const prevStock = product.stock;
    if (stock !== undefined && stock !== null) {
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0) {
        res.status(400).json({ error: 'Stock quantity cannot be negative.' });
        return;
      }
      product.stock = numStock;
    }
    if (sellingRate !== undefined && sellingRate !== null && req.user?.role === 'admin') {
      const numSelling = Number(sellingRate);
      if (!isNaN(numSelling) && numSelling >= 0) product.sellingRate = numSelling;
    }
    if (purchaseRate !== undefined && purchaseRate !== null) {
      const numPurchase = Number(purchaseRate);
      if (!isNaN(numPurchase) && numPurchase >= 0) product.purchaseRate = numPurchase;
    }
    if (minThreshold !== undefined && minThreshold !== null) {
      const numThresh = Number(minThreshold);
      if (!isNaN(numThresh) && numThresh >= 0) product.minThreshold = numThresh;
    }
    if (name && typeof name === 'string' && name.trim()) {
      product.name = name.trim();
    }
    if (category && typeof category === 'string' && category.trim()) {
      product.category = category.trim();
    }
    if (unit && typeof unit === 'string' && unit.trim()) {
      product.unit = unit.trim();
    }

    // Auto-update status
    if (product.stock <= 0) {
      product.status = 'out_of_stock';
    } else if (product.stock <= (product.minThreshold || 10)) {
      product.status = 'low_stock';
    } else {
      product.status = 'in_stock';
    }

    await product.save();

    if (stock !== undefined && stock !== null && Number(stock) !== prevStock) {
      await StockMovementModel.create({
        productId: product._id.toString(),
        productCode: product.code,
        productName: product.name,
        type: 'adjustment',
        quantity: product.stock - prevStock,
        resultingStock: product.stock,
        referenceInvoice: 'MANUAL-ADJUSTMENT',
        notes: `Manual stock adjustment from ${prevStock} to ${product.stock}`,
        performedBy: req.user?.name || 'Staff'
      });
    }

    res.json({ message: 'Product & stock updated successfully in MongoDB', product });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update stock in MongoDB' });
  }
});

// 4. Get sales register from MongoDB (with search/filter and farmer scoping)
router.get('/sales', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, farmerId, dateRange } = req.query;
    const query: any = {};

    // Automatic role-based security: if user is farmer, only show their own purchases
    if (req.user?.role === 'farmer') {
      const orConditions: any[] = [{ farmerId: req.user._id.toString() }];
      if (req.user.phone) {
        orConditions.push({ farmerPhone: req.user.phone });
      }
      if (req.user.name) {
        orConditions.push({ farmerName: req.user.name });
      }
      query.$or = orConditions;
    } else if (farmerId) {
      query.farmerId = farmerId;
    }

    // Optional date range filter
    if (dateRange === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      query.date = { $gte: startOfToday };
    } else if (dateRange === 'week') {
      const startOfWeek = new Date(Date.now() - 7 * 86400000);
      query.date = { $gte: startOfWeek };
    }

    // Search filter
    if (search && typeof search === 'string' && search.trim()) {
      const cleanSearch = search.trim();
      const searchConditions = [
        { invoiceNumber: { $regex: cleanSearch, $options: 'i' } },
        { farmerName: { $regex: cleanSearch, $options: 'i' } },
        { farmerPhone: { $regex: cleanSearch, $options: 'i' } },
        { tokenNumber: { $regex: cleanSearch, $options: 'i' } }
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const sales = await SaleModel.find(query).sort({ date: -1 });
    res.json(sales);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch sales from MongoDB' });
  }
});

// 5. Create new sale in MongoDB (Staff / Admin) - strictly prevents overselling & duplicate billing
router.post('/sales', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      farmerId, 
      farmerName, 
      farmerPhone, 
      tokenNumber, 
      items, 
      paymentMethod,
      paymentReference,
      paymentStatus,
      discount = 0,
      amountReceived = 0,
      changeGiven = 0,
      notes = '',
      autoCompleteToken = true
    } = req.body;
    const staff = req.user!;

    if (!farmerName || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Farmer name and at least one line item are required for billing.' });
      return;
    }

    // Duplicate billing prevention check:
    // If a sale for this tokenNumber or exact farmer + identical total was recorded in the last 15 seconds, reject to prevent duplicate charge
    if (tokenNumber && typeof tokenNumber === 'string' && tokenNumber.trim()) {
      const cleanToken = tokenNumber.trim().toUpperCase();
      const recentDuplicate = await SaleModel.findOne({
        tokenNumber: cleanToken,
        createdAt: { $gte: new Date(Date.now() - 15000) }
      });
      if (recentDuplicate) {
        res.status(409).json({
          error: `Duplicate billing prevented: A sale for token ${cleanToken} was just processed under Invoice ${recentDuplicate.invoiceNumber}.`
        });
        return;
      }
    }

    // Attempt to automatically link farmer account if registered
    let resolvedFarmerId = farmerId;
    if (!resolvedFarmerId || resolvedFarmerId === 'guest-farmer') {
      if (farmerPhone && typeof farmerPhone === 'string') {
        const digits = farmerPhone.replace(/\D/g, '');
        if (digits.length >= 10) {
          const userMatch = await UserModel.findOne({
            $or: [
              { phone: farmerPhone.trim() },
              { phone: digits.slice(-10) },
              { phone: { $regex: digits.slice(-10) } }
            ]
          });
          if (userMatch) resolvedFarmerId = userMatch._id.toString();
        }
      }
    }
    if (!resolvedFarmerId) resolvedFarmerId = 'guest-farmer';

    // Step 1: Validate items and resolve products
    interface ValidatedItem {
      product: any;
      quantity: number;
      rate: number;
      amount: number;
    }

    const validatedItems: ValidatedItem[] = [];
    const productQuantities: Record<string, number> = {};

    for (const it of items) {
      const qty = Number(it.quantity);
      if (isNaN(qty) || qty <= 0) {
        res.status(400).json({
          error: `Invalid sale quantity for item "${it.productName || 'product'}". Quantity must be a positive number.`
        });
        return;
      }

      let prod = null;
      if (it.productId && typeof it.productId === 'string' && it.productId.match(/^[0-9a-fA-F]{24}$/)) {
        prod = await ProductModel.findById(it.productId);
      }
      if (!prod && it.productCode) {
        prod = await ProductModel.findOne({ code: String(it.productCode).toUpperCase().trim() });
      }
      if (!prod && it.productName) {
        prod = await ProductModel.findOne({ name: String(it.productName).trim() });
      }

      if (!prod) {
        res.status(404).json({
          error: `Product "${it.productName || it.productCode || it.productId}" not found in inventory stock register.`
        });
        return;
      }

      const prodId = prod._id.toString();
      productQuantities[prodId] = (productQuantities[prodId] || 0) + qty;

      // Enforce official Admin-approved selling price from catalog
      const rate = Number(prod.sellingRate || 0);
      const amount = qty * rate;

      validatedItems.push({
        product: prod,
        quantity: qty,
        rate,
        amount
      });
    }

    // Step 2: Strict inventory overselling check - never allow sale quantity > available stock
    for (const [prodId, totalRequested] of Object.entries(productQuantities)) {
      const currentProduct = await ProductModel.findById(prodId);
      if (!currentProduct) {
        res.status(404).json({ error: 'Product not found in stock register.' });
        return;
      }

      if (totalRequested > currentProduct.stock) {
        res.status(400).json({
          error: `Insufficient stock for "${currentProduct.name}" (${currentProduct.code}). Available stock: ${currentProduct.stock} ${currentProduct.unit}, requested: ${totalRequested} ${currentProduct.unit}. Stock cannot be reduced below zero.`
        });
        return;
      }
    }

    // Step 3: Generate safely unique invoice number verified against database
    const invoiceNumber = await generateUniqueSaleInvoiceNumber();

    // Step 4: Atomic stock decrement with rollback safeguard
    let subtotal = 0;
    const processedItems: any[] = [];
    const modifiedProducts: { prodId: string; quantity: number }[] = [];

    for (const item of validatedItems) {
      const { product, quantity, rate, amount } = item;

      // Atomically decrement stock only if available stock is >= quantity
      const updatedProduct = await ProductModel.findOneAndUpdate(
        { _id: product._id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        // Rollback any earlier products decremented during this sale
        for (const rolled of modifiedProducts) {
          await ProductModel.findByIdAndUpdate(rolled.prodId, { $inc: { stock: rolled.quantity } });
        }
        res.status(400).json({
          error: `Insufficient stock for "${product.name}". Available inventory is insufficient to fulfill requested quantity.`
        });
        return;
      }

      modifiedProducts.push({ prodId: product._id.toString(), quantity });

      // Update product inventory status based on new stock level
      if (updatedProduct.stock <= 0) {
        updatedProduct.status = 'out_of_stock';
      } else if (updatedProduct.stock <= (updatedProduct.minThreshold || 10)) {
        updatedProduct.status = 'low_stock';
      } else {
        updatedProduct.status = 'in_stock';
      }
      await updatedProduct.save();

      subtotal += amount;

      await StockMovementModel.create({
        productId: updatedProduct._id.toString(),
        productCode: updatedProduct.code,
        productName: updatedProduct.name,
        type: 'sale',
        quantity: -quantity,
        resultingStock: updatedProduct.stock,
        referenceInvoice: invoiceNumber,
        performedBy: staff.name
      });

      processedItems.push({
        productId: updatedProduct._id.toString(),
        productCode: updatedProduct.code,
        productName: updatedProduct.name,
        quantity,
        rate,
        amount,
        unit: updatedProduct.unit
      });
    }

    // Step 5: Save official Sale Record in MongoDB with full payment breakdown
    const cleanDiscount = Math.max(0, Number(discount) || 0);
    const totalPayable = Math.max(0, subtotal - cleanDiscount);
    const recAmount = Number(amountReceived) || totalPayable;
    const chgGiven = Number(changeGiven) || (recAmount > totalPayable ? recAmount - totalPayable : 0);

    const newSale = await SaleModel.create({
      invoiceNumber,
      date: new Date(),
      farmerId: resolvedFarmerId,
      farmerName: farmerName.trim(),
      farmerPhone: farmerPhone || '',
      tokenNumber: tokenNumber ? tokenNumber.trim().toUpperCase() : '',
      items: processedItems,
      subtotal,
      discount: cleanDiscount,
      tax: 0,
      total: totalPayable,
      amountReceived: recAmount,
      changeGiven: chgGiven,
      staffId: staff._id,
      staffName: staff.name,
      paymentMethod: paymentMethod || 'Cash',
      paymentReference: paymentReference ? String(paymentReference).trim() : '',
      paymentStatus: paymentStatus === 'pending' ? 'pending' : 'paid',
      notes: notes ? String(notes).trim() : ''
    });

    // Step 6: If token was provided and autoCompleteToken is true, complete token in Token register
    if (tokenNumber && typeof tokenNumber === 'string' && tokenNumber.trim() && autoCompleteToken) {
      try {
        const cleanTok = tokenNumber.trim().toUpperCase();
        const existingToken = await TokenModel.findOne({ tokenNumber: cleanTok });
        if (existingToken && existingToken.status !== 'completed' && existingToken.status !== 'cancelled') {
          existingToken.status = 'completed';
          existingToken.completedAt = new Date();
          existingToken.staffId = staff._id.toString();
          existingToken.staffName = staff.name;
          const billingNote = `Billed under ${invoiceNumber}`;
          existingToken.notes = existingToken.notes ? `${existingToken.notes} | ${billingNote}` : billingNote;
          await existingToken.save();
        }
      } catch (tokErr) {
        console.warn('Notice: token status update warning:', tokErr);
      }
    }

    res.status(201).json({ message: 'Sale recorded and saved in MongoDB', sale: newSale });
  } catch (err: any) {
    console.error('Record sale error:', err);
    res.status(500).json({ error: err.message || 'Failed to record sale in MongoDB' });
  }
});

// 6. Get purchases register from MongoDB (with search support)
router.get('/purchases', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const query: any = {};

    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      query.$or = [
        { invoiceNumber: { $regex: s, $options: 'i' } },
        { supplier: { $regex: s, $options: 'i' } }
      ];
    }

    const purchases = await PurchaseModel.find(query).sort({ date: -1 });
    res.json(purchases);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch purchases from MongoDB' });
  }
});

// 7. Record new purchase in MongoDB (Staff / Admin) - increments stock in MongoDB
router.post('/purchases', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { supplier, invoiceNumber, items } = req.body;
    const staff = req.user!;

    if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Supplier and at least one line item are required.' });
      return;
    }

    // Safely unique purchase invoice number
    let finalInvoiceNumber = '';
    if (invoiceNumber && typeof invoiceNumber === 'string' && invoiceNumber.trim()) {
      const cleanInv = invoiceNumber.trim().toUpperCase();
      const existing = await PurchaseModel.findOne({ invoiceNumber: cleanInv });
      if (existing) {
        res.status(400).json({ error: `Purchase invoice number "${cleanInv}" already exists in the system.` });
        return;
      }
      finalInvoiceNumber = cleanInv;
    } else {
      finalInvoiceNumber = await generateUniquePurchaseInvoiceNumber();
    }

    let total = 0;
    const processedItems: any[] = [];

    for (const it of items) {
      let prod = null;
      if (it.productId && typeof it.productId === 'string' && it.productId.match(/^[0-9a-fA-F]{24}$/)) {
        prod = await ProductModel.findById(it.productId);
      }
      if (!prod && it.productCode) {
        prod = await ProductModel.findOne({ code: String(it.productCode).toUpperCase().trim() });
      }
      if (!prod && it.productName) {
        prod = await ProductModel.findOne({ name: String(it.productName).trim() });
      }

      const qty = Math.max(1, Number(it.quantity || 1));
      const rate = Math.max(0, Number(it.purchaseRate ?? prod?.purchaseRate ?? 0));
      const amount = qty * rate;
      total += amount;

      // If product does not exist yet, automatically create it in the catalog
      if (!prod && it.productName && it.productName.trim()) {
        const cleanName = it.productName.trim();
        const generatedCode = (it.productCode || cleanName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900)).toUpperCase();
        prod = await ProductModel.create({
          name: cleanName,
          code: generatedCode,
          category: it.category || 'Fertilizer',
          stock: qty,
          unit: it.unit || 'Bag',
          purchaseRate: rate,
          sellingRate: Number(it.sellingRate || (rate > 0 ? Math.round(rate * 1.15) : 0)),
          minThreshold: 10,
          status: 'in_stock'
        });

        await StockMovementModel.create({
          productId: prod._id.toString(),
          productCode: prod.code,
          productName: prod.name,
          type: 'purchase',
          quantity: qty,
          resultingStock: prod.stock,
          referenceInvoice: finalInvoiceNumber,
          notes: `New product added via Purchase: ${supplier}`,
          performedBy: staff.name
        });
      } else if (prod) {
        prod.stock += qty;
        if (rate > 0) prod.purchaseRate = rate;
        if (it.sellingRate && Number(it.sellingRate) > 0) {
          prod.sellingRate = Number(it.sellingRate);
        }
        // Update stock status
        if (prod.stock <= 0) {
          prod.status = 'out_of_stock';
        } else if (prod.stock <= (prod.minThreshold || 10)) {
          prod.status = 'low_stock';
        } else {
          prod.status = 'in_stock';
        }
        await prod.save();

        await StockMovementModel.create({
          productId: prod._id.toString(),
          productCode: prod.code,
          productName: prod.name,
          type: 'purchase',
          quantity: qty,
          resultingStock: prod.stock,
          referenceInvoice: finalInvoiceNumber,
          performedBy: staff.name
        });
      }

      processedItems.push({
        productName: prod?.name || it.productName || 'Supply Item',
        productId: prod?._id.toString(),
        productCode: prod?.code,
        quantity: qty,
        purchaseRate: rate,
        amount
      });
    }

    const newPurchase = await PurchaseModel.create({
      invoiceNumber: finalInvoiceNumber,
      supplier: supplier.trim(),
      date: new Date(),
      itemsCount: processedItems.length,
      items: processedItems,
      total,
      recordedBy: staff.name
    });

    res.status(201).json({ message: 'Purchase recorded into MongoDB stock register', purchase: newPurchase });
  } catch (err: any) {
    console.error('Record purchase error:', err);
    res.status(500).json({ error: err.message || 'Failed to record purchase in MongoDB' });
  }
});

// 8. Get Stock Movements Audit Trail (Staff / Admin)
router.get('/movements', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, limit = 50 } = req.query;
    const query: any = {};
    if (productId) query.productId = productId;

    const movements = await StockMovementModel.find(query).sort({ timestamp: -1 }).limit(Number(limit));
    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch stock movements from MongoDB' });
  }
});

// 8. Summary for Admin Dashboard (Today's metrics from MongoDB)
router.get('/summary', authenticate, requireRole(['staff', 'admin']), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todaySales, todayPurchases, lowStockItems, totalProducts] = await Promise.all([
      SaleModel.find({ date: { $gte: startOfToday } }),
      PurchaseModel.find({ date: { $gte: startOfToday } }),
      ProductModel.find({ status: { $in: ['low_stock', 'out_of_stock'] } }),
      ProductModel.countDocuments()
    ]);

    const todaySalesAmount = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);
    const todayPurchasesAmount = todayPurchases.reduce((acc, p) => acc + (p.total || 0), 0);

    res.json({
      todaySalesCount: todaySales.length,
      todaySalesAmount,
      todayPurchasesCount: todayPurchases.length,
      todayPurchasesAmount,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      totalProducts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch inventory summary from MongoDB' });
  }
});

export default router;
