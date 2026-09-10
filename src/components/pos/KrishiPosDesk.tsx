import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProductItem, SaleRecord, TokenItem } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Lock, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Clock, 
  User, 
  Phone, 
  Tag, 
  Receipt, 
  Layers, 
  ShieldCheck, 
  Barcode,
  Calendar,
  Eye,
  Check,
  ChevronDown
} from 'lucide-react';

interface CartItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  rate: number;
  amount: number;
  unit: string;
  availableStock: number;
}

interface KrishiPosDeskProps {
  products: ProductItem[];
  currentServingToken: TokenItem | null;
  waitingQueue: TokenItem[];
  salesHistory: SaleRecord[];
  counterNumber: number;
  staffToken: string | null;
  staffUser: any;
  onSaleCompleted: (sale: SaleRecord) => void;
  onCompleteServingToken?: () => Promise<void>;
  onRefreshData: () => void;
  onOpenReceipt: (sale: SaleRecord) => void;
}

export const KrishiPosDesk: React.FC<KrishiPosDeskProps> = ({
  products,
  currentServingToken,
  waitingQueue,
  salesHistory,
  counterNumber,
  staffToken,
  staffUser,
  onSaleCompleted,
  onCompleteServingToken,
  onRefreshData,
  onOpenReceipt
}) => {
  // --- Farmer & Customer Identification State ---
  const [customerMode, setCustomerMode] = useState<'token' | 'queue_select' | 'walk_in'>('token');
  const [farmerName, setFarmerName] = useState<string>('');
  const [farmerPhone, setFarmerPhone] = useState<string>('');
  const [tokenNumber, setTokenNumber] = useState<string>('');
  const [selectedQueueTokenId, setSelectedQueueTokenId] = useState<string>('');

  // --- Fast Cart State ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [billingNotes, setBillingNotes] = useState<string>('');
  const [autoCompleteToken, setAutoCompleteToken] = useState<boolean>(true);

  // --- Payment Method State ---
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Pay Later'>('Cash');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [payLaterDueDate, setPayLaterDueDate] = useState<string>('');

  // --- Product Catalog Navigation & Quick Scanner ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [skuScannerInput, setSkuScannerInput] = useState<string>('');
  const [activeRightTab, setActiveRightTab] = useState<'cart' | 'today_bills'>('cart');
  const [todayBillsSearch, setTodayBillsSearch] = useState<string>('');

  // --- UI Action & Notification State ---
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Notification auto-dismiss
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Sync with current serving token when it changes, if cart/fields are empty
  useEffect(() => {
    if (currentServingToken) {
      setFarmerName(currentServingToken.farmerName);
      setFarmerPhone(currentServingToken.farmerPhone || '');
      setTokenNumber(currentServingToken.tokenNumber);
      setCustomerMode('token');
    } else {
      // Clear token-specific fields if we were in token mode
      if (customerMode === 'token') {
        setFarmerName('');
        setFarmerPhone('');
        setTokenNumber('');
        setCustomerMode('walk_in');
      }
    }
  }, [currentServingToken]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered products for quick catalogue
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = q === '' ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Check if current token was already billed today to prevent duplicate billing
  const duplicateBillingWarning = useMemo(() => {
    if (!tokenNumber || !tokenNumber.trim()) return null;
    const cleanTok = tokenNumber.trim().toUpperCase();
    
    // Look for matching sale today
    const today = new Date();
    const existing = salesHistory.find(s => {
      if (!s.tokenNumber) return false;
      if (s.tokenNumber.toUpperCase() !== cleanTok) return false;
      const sDate = new Date(s.date);
      return (
        sDate.getDate() === today.getDate() &&
        sDate.getMonth() === today.getMonth() &&
        sDate.getFullYear() === today.getFullYear()
      );
    });

    return existing || null;
  }, [tokenNumber, salesHistory]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.amount, 0);
  }, [cart]);

  const totalPayable = useMemo(() => {
    const validDiscount = Math.max(0, Number(discount) || 0);
    return Math.max(0, subtotal - validDiscount);
  }, [subtotal, discount]);

  // Cash change calculation
  const cashReceivedNumber = Number(cashTendered) || 0;
  const cashChange = useMemo(() => {
    if (paymentMode !== 'Cash' || cashReceivedNumber <= 0) return 0;
    return Math.max(0, cashReceivedNumber - totalPayable);
  }, [paymentMode, cashReceivedNumber, totalPayable]);

  // Check for any overselling in cart
  const oversellingItems = useMemo(() => {
    return cart.filter(item => {
      const prod = products.find(p => p._id === item.productId);
      const available = prod ? prod.stock : item.availableStock;
      return item.quantity > available;
    });
  }, [cart, products]);

  // Fast Cart Actions
  const handleAddToCart = (product: ProductItem) => {
    if (product.stock <= 0) {
      setNotification({
        type: 'error',
        text: `Cannot add "${product.name}": Out of Stock (0 ${product.unit} available).`
      });
      return;
    }

    const existingIdx = cart.findIndex(c => c.productId === product._id);
    if (existingIdx > -1) {
      const item = cart[existingIdx];
      const nextQty = item.quantity + 1;
      if (nextQty > product.stock) {
        setNotification({
          type: 'error',
          text: `Stock limit reached: Only ${product.stock} ${product.unit} available for "${product.name}".`
        });
        return;
      }
      const updated = [...cart];
      updated[existingIdx] = {
        ...item,
        quantity: nextQty,
        amount: nextQty * item.rate,
        availableStock: product.stock
      };
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product._id,
          productCode: product.code,
          productName: product.name,
          quantity: 1,
          rate: product.sellingRate, // Strictly Admin-Controlled Price
          amount: product.sellingRate,
          unit: product.unit,
          availableStock: product.stock
        }
      ]);
    }
  };

  // Barcode / SKU quick-scanner submit
  const handleScanSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSku = skuScannerInput.trim().toUpperCase();
    if (!cleanSku) return;

    const matched = products.find(p => p.code.toUpperCase() === cleanSku || p.name.toUpperCase() === cleanSku);
    if (matched) {
      handleAddToCart(matched);
      setSkuScannerInput('');
      setNotification({
        type: 'success',
        text: `Scanned & Added: ${matched.name} (${matched.code})`
      });
    } else {
      setNotification({
        type: 'error',
        text: `No product found matching SKU/Barcode: "${cleanSku}"`
      });
    }
  };

  const handleUpdateQuantity = (productId: string, newQty: number) => {
    const prod = products.find(p => p._id === productId);
    const maxStock = prod ? prod.stock : 999;

    if (newQty <= 0) {
      setCart(cart.filter(c => c.productId !== productId));
      return;
    }

    if (newQty > maxStock) {
      setNotification({
        type: 'error',
        text: `Cannot exceed stock of ${maxStock} ${prod?.unit || 'units'} for "${prod?.name}".`
      });
      newQty = maxStock;
    }

    setCart(
      cart.map(c => {
        if (c.productId === productId) {
          return {
            ...c,
            quantity: newQty,
            amount: newQty * c.rate,
            availableStock: maxStock
          };
        }
        return c;
      })
    );
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear all items from the current cart?')) {
      setCart([]);
      setDiscount(0);
      setBillingNotes('');
      setCashTendered('');
      setPaymentReference('');
    }
  };

  // Select token from waiting queue
  const handleSelectFromQueue = (tok: TokenItem) => {
    setFarmerName(tok.farmerName);
    setFarmerPhone(tok.farmerPhone || '');
    setTokenNumber(tok.tokenNumber);
    setSelectedQueueTokenId(tok._id);
    setCustomerMode('queue_select');
    setNotification({
      type: 'info',
      text: `Loaded Token ${tok.tokenNumber} (${tok.farmerName}) for billing.`
    });
  };

  // Reset farmer details
  const handleResetFarmer = () => {
    setFarmerName('');
    setFarmerPhone('');
    setTokenNumber('');
    setSelectedQueueTokenId('');
    setCustomerMode('walk_in');
  };

  // Submit sale to MongoDB
  const handleCompleteSale = async () => {
    if (!staffToken) {
      setNotification({ type: 'error', text: 'Authentication session required to bill.' });
      return;
    }

    if (!farmerName.trim()) {
      setNotification({ type: 'error', text: 'Please enter Farmer Name before completing the sale.' });
      return;
    }

    if (cart.length === 0) {
      setNotification({ type: 'error', text: 'Cart is empty. Please add products to bill.' });
      return;
    }

    if (oversellingItems.length > 0) {
      setNotification({
        type: 'error',
        text: `Overselling prevented: ${oversellingItems[0].productName} quantity exceeds available stock.`
      });
      return;
    }

    // Reference ID validation for UPI/Card
    if (paymentMode === 'UPI' && !paymentReference.trim()) {
      setNotification({
        type: 'error',
        text: 'Please enter the 12-digit UPI UTR / Reference ID for verification.'
      });
      return;
    }

    if (paymentMode === 'Card' && !paymentReference.trim()) {
      setNotification({
        type: 'error',
        text: 'Please enter the Card Approval / Auth Code or Last 4 Digits.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        farmerName: farmerName.trim(),
        farmerPhone: farmerPhone.trim(),
        tokenNumber: tokenNumber.trim().toUpperCase(),
        items: cart.map(c => ({
          productId: c.productId,
          productCode: c.productCode,
          productName: c.productName,
          quantity: c.quantity,
          rate: c.rate,
          amount: c.amount,
          unit: c.unit
        })),
        paymentMethod: paymentMode,
        paymentReference: paymentReference.trim(),
        paymentStatus: paymentMode === 'Pay Later' ? 'pending' : 'paid',
        discount: Number(discount) || 0,
        amountReceived: paymentMode === 'Cash' && cashReceivedNumber > 0 ? cashReceivedNumber : totalPayable,
        changeGiven: cashChange,
        notes: billingNotes.trim() + (paymentMode === 'Pay Later' && payLaterDueDate ? ` | Due: ${payLaterDueDate}` : ''),
        autoCompleteToken
      };

      const res = await safeFetchJson<{ sale: SaleRecord; message: string }>('/api/inventory/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok && res.data?.sale) {
        const createdSale = res.data.sale;
        setNotification({
          type: 'success',
          text: `Sale completed! Invoice: ${createdSale.invoiceNumber} (₹${createdSale.total.toLocaleString('en-IN')})`
        });

        // Trigger callback to parent
        onSaleCompleted(createdSale);
        onOpenReceipt(createdSale);

        // Reset Cart and form
        setCart([]);
        setDiscount(0);
        setCashTendered('');
        setPaymentReference('');
        setBillingNotes('');

        // If serving token was completed, reset farmer fields
        if (autoCompleteToken && currentServingToken && currentServingToken.tokenNumber === tokenNumber) {
          if (onCompleteServingToken) {
            await onCompleteServingToken();
          }
        }

        // Clear farmer if walk in or queue select
        if (customerMode !== 'token') {
          handleResetFarmer();
        }

        onRefreshData();
      } else {
        setNotification({
          type: 'error',
          text: res.error || 'Failed to record sale. Please try again.'
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'Network error processing sale.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Today's bills list
  const todaySalesList = useMemo(() => {
    const today = new Date();
    return salesHistory.filter(s => {
      const d = new Date(s.date);
      const isSameDay = (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
      if (!isSameDay) return false;

      if (!todayBillsSearch.trim()) return true;
      const q = todayBillsSearch.toLowerCase().trim();
      return (
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.farmerName.toLowerCase().includes(q) ||
        (s.farmerPhone && s.farmerPhone.includes(q)) ||
        (s.tokenNumber && s.tokenNumber.toLowerCase().includes(q))
      );
    });
  }, [salesHistory, todayBillsSearch]);

  const todayMetrics = useMemo(() => {
    const totalRev = todaySalesList.reduce((sum, s) => sum + (s.total || 0), 0);
    const cashRev = todaySalesList.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + (s.total || 0), 0);
    const upiRev = todaySalesList.filter(s => s.paymentMethod === 'UPI').reduce((sum, s) => sum + (s.total || 0), 0);
    const payLaterCount = todaySalesList.filter(s => s.paymentStatus === 'pending').length;
    return { count: todaySalesList.length, totalRev, cashRev, upiRev, payLaterCount };
  }, [todaySalesList]);

  return (
    <div className="space-y-4 font-sans">
      
      {/* 1. TOP STATUS & ALERT BANNER */}
      {notification && (
        <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
          notification.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-900' :
          'bg-sky-50 border-sky-300 text-sky-900'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
            {notification.type === 'info' && <ShieldCheck className="w-4 h-4 text-sky-600" />}
            <span>{notification.text}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Duplicate Billing Warning Alert */}
      {duplicateBillingWarning && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-950">
                Notice: Token {duplicateBillingWarning.tokenNumber} was already billed today!
              </span>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Invoice <span className="font-mono font-bold">{duplicateBillingWarning.invoiceNumber}</span> was issued to {duplicateBillingWarning.farmerName} for ₹{(duplicateBillingWarning.total || 0).toLocaleString('en-IN')}. Verify before generating a secondary bill.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenReceipt(duplicateBillingWarning)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>View Prior Bill</span>
          </button>
        </div>
      )}

      {/* 2. MAIN POS WORKSTATION LAYOUT (DESKTOP 2-COLUMN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ================= LEFT COLUMN: PRODUCT CATALOG & QUICK SEARCH (7 cols) ================= */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search, Barcode Scanner & Category Filter Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
            
            {/* Top Bar: Barcode quick scan & Keyword search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              
              {/* Keyword Search */}
              <div className="sm:col-span-7 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search fertilizers, seeds, spray, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none focus:bg-white transition-all font-medium placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs px-1"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* SKU / Barcode Quick Input (Enter to Add) */}
              <form onSubmit={handleScanSkuSubmit} className="sm:col-span-5 relative flex items-center">
                <Barcode className="w-4 h-4 text-emerald-700 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scan / Type SKU + Enter"
                  value={skuScannerInput}
                  onChange={(e) => setSkuScannerInput(e.target.value.toUpperCase())}
                  className="w-full bg-emerald-50/50 border border-emerald-200 rounded-2xl pl-9 pr-14 py-2 text-xs font-mono font-bold text-emerald-950 uppercase focus:ring-2 focus:ring-emerald-600 focus:outline-none focus:bg-white placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1 px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat === 'all' ? 'All Catalog' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>{filteredProducts.length} agricultural items registered</span>
              <span className="flex items-center space-x-1 text-slate-400 text-[11px]">
                <Lock className="w-3 h-3 text-emerald-700" />
                <span>Admin fixed selling prices</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">No matching products found in stock register.</p>
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const isOutOfStock = prod.stock <= 0;
                  const isLowStock = !isOutOfStock && prod.stock <= (prod.minThreshold || 10);
                  const inCartCount = cart.find(c => c.productId === prod._id)?.quantity || 0;

                  return (
                    <div
                      key={prod._id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                        isOutOfStock 
                          ? 'bg-slate-50 border-slate-200 opacity-60' 
                          : 'bg-white hover:border-emerald-500 border-slate-200 shadow-2xs hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {prod.code}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isOutOfStock ? 'bg-rose-100 text-rose-800' :
                            isLowStock ? 'bg-amber-100 text-amber-900 animate-pulse' :
                            'bg-emerald-100 text-emerald-900'
                          }`}>
                            {isOutOfStock ? 'Out of Stock' : `${prod.stock} ${prod.unit}`}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 pt-0.5">
                          {prod.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {prod.category}
                        </div>
                      </div>

                      <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase font-semibold">Govt Rate</div>
                          <div className="text-sm font-black text-slate-900 font-mono">
                            ₹{prod.sellingRate}
                            <span className="text-[10px] font-normal text-slate-500">/{prod.unit}</span>
                          </div>
                        </div>

                        {isOutOfStock ? (
                          <button
                            disabled
                            className="px-2.5 py-1 bg-slate-200 text-slate-400 rounded-xl text-xs font-semibold cursor-not-allowed"
                          >
                            Sold Out
                          </button>
                        ) : inCartCount > 0 ? (
                          <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-300 rounded-xl px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(prod._id, inCartCount - 1)}
                              className="w-5 h-5 bg-white hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg flex items-center justify-center text-xs cursor-pointer shadow-2xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-mono font-bold text-emerald-950 px-1">
                              {inCartCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(prod)}
                              className="w-5 h-5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg flex items-center justify-center text-xs cursor-pointer shadow-2xs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(prod)}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition-all shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: TRANSACTION WORKSTATION & CART (5 cols) ================= */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Workstation Tab Header (Cart vs Today's Invoices) */}
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-3xl p-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveRightTab('cart')}
              className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeRightTab === 'cart'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Active Cart ({cart.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRightTab('today_bills')}
              className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeRightTab === 'today_bills'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Today's Bills ({todaySalesList.length})</span>
            </button>
          </div>

          {/* ================= TAB CONTENT 1: ACTIVE CART & BILLING ================= */}
          {activeRightTab === 'cart' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              
              {/* Farmer + Token Selector Bar */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Customer & Token</span>
                  </span>

                  {/* Customer Mode Toggle */}
                  <div className="flex items-center space-x-1 text-[11px]">
                    {currentServingToken && (
                      <button
                        type="button"
                        onClick={() => {
                          setFarmerName(currentServingToken.farmerName);
                          setFarmerPhone(currentServingToken.farmerPhone || '');
                          setTokenNumber(currentServingToken.tokenNumber);
                          setCustomerMode('token');
                        }}
                        className={`px-2 py-0.5 rounded-lg font-bold cursor-pointer transition-colors ${
                          customerMode === 'token'
                            ? 'bg-emerald-800 text-white'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        Serving Token
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCustomerMode('queue_select')}
                      className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                        customerMode === 'queue_select'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Queue ({waitingQueue.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleResetFarmer}
                      className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                        customerMode === 'walk_in'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Walk-in
                    </button>
                  </div>
                </div>

                {/* Queue Token Dropdown if in queue_select mode */}
                {customerMode === 'queue_select' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Select Waiting Token from Line
                    </label>
                    <select
                      value={selectedQueueTokenId}
                      onChange={(e) => {
                        const tok = waitingQueue.find(t => t._id === e.target.value);
                        if (tok) handleSelectFromQueue(tok);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none"
                    >
                      <option value="">-- Choose Token from Queue --</option>
                      {waitingQueue.map(t => (
                        <option key={t._id} value={t._id}>
                          {t.tokenNumber} • {t.farmerName} ({t.serviceName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Selected Farmer Info / Manual Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Farmer Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Farmer full name"
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile"
                      value={farmerPhone}
                      onChange={(e) => setFarmerPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-medium focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400 font-medium">Token:</span>
                      <span className="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        {tokenNumber || 'Walk-in'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400 font-medium">Service:</span>
                      <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 max-w-[140px] truncate" title={currentServingToken?.serviceName || (selectedQueueTokenId && waitingQueue.find(t => t._id === selectedQueueTokenId)?.serviceName) || 'General'}>
                        {currentServingToken?.serviceName || (selectedQueueTokenId && waitingQueue.find(t => t._id === selectedQueueTokenId)?.serviceName) || 'Standard'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400 font-medium">Counter:</span>
                      <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        0{counterNumber}
                      </span>
                    </div>
                  </div>

                  {currentServingToken && (
                    <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={autoCompleteToken}
                        onChange={(e) => setAutoCompleteToken(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                      />
                      <span>Complete token on bill</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Fast Cart Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    Selected Items ({cart.length})
                  </span>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-1">
                    <ShoppingBag className="w-6 h-6 mx-auto text-slate-300" />
                    <p className="font-medium">Cart is currently empty</p>
                    <p className="text-[11px] text-slate-400">Click on products or scan SKU on the left to add items</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {cart.map((item) => {
                      const prod = products.find(p => p._id === item.productId);
                      const currentStock = prod ? prod.stock : item.availableStock;
                      const isOverselling = item.quantity > currentStock;

                      return (
                        <div 
                          key={item.productId} 
                          className={`p-2.5 flex items-center justify-between gap-2 text-xs ${
                            isOverselling ? 'bg-rose-50' : 'bg-white hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-900 truncate">{item.productName}</div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-2">
                              <span>SKU: {item.productCode}</span>
                              <span>•</span>
                              <span className="text-emerald-800 font-semibold">₹{item.rate}/{item.unit}</span>
                              <span>•</span>
                              <span className={isOverselling ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                                Stock: {currentStock}
                              </span>
                            </div>
                          </div>

                          {/* Stepper controls */}
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                              className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={currentStock}
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.productId, Math.max(1, Number(e.target.value)))}
                              className={`w-12 text-center font-mono font-bold text-xs border rounded-lg py-1 ${
                                isOverselling ? 'border-rose-400 bg-rose-100 text-rose-950' : 'border-slate-300 bg-white'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                              className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          {/* Line Amount */}
                          <div className="text-right font-mono font-bold text-slate-900 w-16 shrink-0">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.productId, 0)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment Methods & Details */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Payment Method
                </div>

                {/* 4 Mode Buttons */}
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Cash')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center space-y-1 transition-all cursor-pointer ${
                      paymentMode === 'Cash'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center space-y-1 transition-all cursor-pointer ${
                      paymentMode === 'UPI'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('Card')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center space-y-1 transition-all cursor-pointer ${
                      paymentMode === 'Card'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card / KCC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('Pay Later')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center space-y-1 transition-all cursor-pointer ${
                      paymentMode === 'Pay Later'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Pay Later</span>
                  </button>
                </div>

                {/* Mode-Specific Payment Inputs */}
                {paymentMode === 'Cash' && (
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700">Cash Received (₹):</label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-28 bg-white border border-emerald-300 rounded-xl px-2.5 py-1 text-right font-mono font-bold text-slate-900 focus:outline-none"
                      />
                    </div>

                    {/* Quick Cash Buttons */}
                    <div className="flex items-center space-x-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setCashTendered(String(totalPayable))}
                        className="px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Exact (₹{totalPayable})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashTendered(String(Math.ceil(totalPayable / 100) * 100))}
                        className="px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Round 100
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashTendered(String(Math.ceil(totalPayable / 500) * 500))}
                        className="px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Round 500
                      </button>
                    </div>

                    {cashChange > 0 && (
                      <div className="flex justify-between items-center pt-1 border-t border-emerald-200 text-emerald-900 font-bold">
                        <span>Change to Return:</span>
                        <span className="text-base font-mono text-emerald-700">₹{cashChange.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMode === 'UPI' && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Krishi Seva Kendra Bharat QR:</span>
                      <span className="font-mono font-bold text-slate-700">kisan.kendra@sbi</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        12-digit UTR / UPI Reference ID *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 625489012345"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value.trim())}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'Card' && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Card Approval Code / Last 4 Digits *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AUTH-8892 (RuPay/KCC)"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'Pay Later' && (
                  <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 space-y-2 text-xs">
                    <div className="text-[11px] font-bold text-amber-900">
                      Credit / Udhar Billing (Pending Payment)
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Promised Settlement Date / Farmer Village Note:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Village Rampur • Due on harvest (20 Oct)"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bill Totals & Complete Sale Action Button */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Subtotal ({cart.length} items):</span>
                    <span className="font-mono font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[11px]">Special Subsidy / Concession (₹):</span>
                    <input
                      type="number"
                      min={0}
                      max={subtotal}
                      placeholder="0"
                      value={discount || ''}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 text-right font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                    <div>
                      <div className="text-base font-black text-slate-900 font-heading">Total Payable</div>
                      <div className="text-[10px] text-slate-400 font-sans">Govt Subsidized Agricultural Rate</div>
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-800">
                      ₹{totalPayable.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Big Complete Sale Button */}
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={isSubmitting || cart.length === 0 || oversellingItems.length > 0 || !farmerName.trim()}
                  className={`w-full py-3.5 rounded-2xl text-xs font-bold font-heading uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer ${
                    isSubmitting || cart.length === 0 || oversellingItems.length > 0 || !farmerName.trim()
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:shadow-lg'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Receipt className="w-4 h-4" />
                      <span>Complete Sale & Print Bill</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* ================= TAB CONTENT 2: TODAY'S RECENT BILLS ================= */}
          {activeRightTab === 'today_bills' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              
              {/* Daily Metrics Pill Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Today's Invoices</div>
                  <div className="text-base font-black font-mono text-slate-900">{todayMetrics.count}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Revenue</div>
                  <div className="text-base font-black font-mono text-emerald-800">₹{todayMetrics.totalRev.toLocaleString('en-IN')}</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Cash / UPI</div>
                  <div className="text-xs font-mono font-bold text-slate-700">₹{todayMetrics.cashRev} / ₹{todayMetrics.upiRev}</div>
                </div>
              </div>

              {/* Search Today's Bills */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter bills by invoice, farmer or phone..."
                  value={todayBillsSearch}
                  onChange={(e) => setTodayBillsSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none"
                />
              </div>

              {/* Invoices List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {todaySalesList.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs space-y-1">
                    <Receipt className="w-6 h-6 mx-auto text-slate-300" />
                    <p>No bills issued today yet.</p>
                  </div>
                ) : (
                  todaySalesList.map((sale) => {
                    const sTime = new Date(sale.date);
                    return (
                      <div
                        key={sale._id}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all shadow-2xs flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-900">{sale.invoiceNumber}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {sTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 truncate">
                            {sale.farmerName} {sale.farmerPhone ? `• ${sale.farmerPhone}` : ''}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                            <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                              {sale.tokenNumber || 'Walk-in'}
                            </span>
                            <span>•</span>
                            <span className="uppercase font-semibold text-slate-700">{sale.paymentMethod}</span>
                            {sale.paymentStatus === 'pending' && (
                              <span className="text-amber-700 font-bold bg-amber-50 px-1 rounded">
                                Udhar
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-1.5">
                          <div className="font-mono font-black text-emerald-800 text-sm">
                            ₹{(sale.total || 0).toLocaleString('en-IN')}
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenReceipt(sale)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
