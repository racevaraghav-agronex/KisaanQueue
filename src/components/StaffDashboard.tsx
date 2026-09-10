import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { TokenItem, ProductItem, SaleRecord, PurchaseRecord, ServiceItem } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { SaleReceiptModal } from './SaleReceiptModal.tsx';
import { KrishiPosDesk } from './pos/KrishiPosDesk.tsx';
import { AddProductModal } from './AddProductModal.tsx';
import { EditStockModal } from './EditStockModal.tsx';
import { NewPurchaseModal } from './NewPurchaseModal.tsx';
import { PurchaseDetailsModal } from './PurchaseDetailsModal.tsx';
import { TokenVerifyModal } from './TokenVerifyModal.tsx';
import { PublicDisplayBoard } from './PublicDisplayBoard.tsx';
import { StaffProcurementTab } from './StaffProcurementTab.tsx';
import { announceToken, playChime } from '../utils/audio.ts';
import { 
  PhoneCall, 
  CheckCircle2, 
  Clock, 
  Users, 
  AlertCircle, 
  RefreshCw, 
  Search,
  Volume2,
  XCircle,
  Plus,
  Printer,
  ShoppingBag,
  Package,
  FileText,
  Trash2,
  Eye,
  Layers,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Pause,
  Play,
  RotateCcw,
  Monitor,
  Calendar,
  MapPin,
  Tag,
  UserCheck,
  Wheat,
  Receipt
} from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const { t } = useLanguage();

  const [counterNumber, setCounterNumber] = useState<number>(user?.counterNumber || 1);
  const [shiftStatus, setShiftStatus] = useState<'active' | 'break' | 'offline'>(
    (user as any)?.shiftStatus || 'active'
  );
  const [activeTab, setActiveTab] = useState<'queue' | 'sales' | 'history' | 'inventory' | 'purchases' | 'procurement'>('queue');

  // Services Catalog & Billing State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [showBillingRequiredModal, setShowBillingRequiredModal] = useState<boolean>(false);
  const autoOpenedTokensRef = useRef<Set<string>>(new Set());

  // Operational Queue State
  const [currentServingToken, setCurrentServingToken] = useState<TokenItem | null>(null);
  const [waitingQueue, setWaitingQueue] = useState<TokenItem[]>([]);
  const [heldTokens, setHeldTokens] = useState<TokenItem[]>([]);
  const [queueEstimatedWaitText, setQueueEstimatedWaitText] = useState<string>('');
  const [queueActiveCountersCount, setQueueActiveCountersCount] = useState<number>(1);
  const [queueNextToken, setQueueNextToken] = useState<string | null>(null);
  const [verifyReference, setVerifyReference] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Hold Modal
  const [showHoldModal, setShowHoldModal] = useState<boolean>(false);
  const [holdReason, setHoldReason] = useState<string>('Document / Kisan card verification pending');
  const [customHoldReason, setCustomHoldReason] = useState<string>('');

  // Complete Dialog
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [completionNotes, setCompletionNotes] = useState<string>('Service completed at counter desk');

  // Skip Dialog
  const [showSkipModal, setShowSkipModal] = useState<boolean>(false);
  const [skipReason, setSkipReason] = useState<string>('Farmer absent after 3 public announcements');

  // Search Farmer / Token State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<TokenItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedSearchToken, setSelectedSearchToken] = useState<TokenItem | null>(null);

  // Centre Display Mode in full modal
  const [showDisplayMode, setShowDisplayMode] = useState<boolean>(false);

  // Billing / New Sale State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [billingProductSearch, setBillingProductSearch] = useState<string>('');
  const [billingCategoryFilter, setBillingCategoryFilter] = useState<string>('all');
  const [saleFarmerName, setSaleFarmerName] = useState<string>('');
  const [saleFarmerPhone, setSaleFarmerPhone] = useState<string>('');
  const [saleTokenNumber, setSaleTokenNumber] = useState<string>('');
  const [autoCompleteTokenOnSale, setAutoCompleteTokenOnSale] = useState<boolean>(true);
  const [saleItems, setSaleItems] = useState<Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    rate: number;
    amount: number;
    unit: string;
  }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [lastCompletedSale, setLastCompletedSale] = useState<SaleRecord | null>(null);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<SaleRecord | null>(null);

  // Sales History State
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyDateFilter, setHistoryDateFilter] = useState<'all' | 'today' | 'week'>('today');

  // Stock Register State
  const [stockSearch, setStockSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [editingStockProduct, setEditingStockProduct] = useState<ProductItem | null>(null);

  // Purchases Register State
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [purchasesSearch, setPurchasesSearch] = useState<string>('');
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState<boolean>(false);
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState<PurchaseRecord | null>(null);

  // Sync user counter
  useEffect(() => {
    if (user?.counterNumber) {
      setCounterNumber(user.counterNumber);
    }
  }, [user]);

  // Notification auto-dismiss
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 6000);
    return () => clearTimeout(t);
  }, [notification]);

  // Fetch Queue Data
  const fetchQueueData = async () => {
    try {
      const centreParam = user?.centre ? `?centre=${encodeURIComponent(user.centre)}` : '';
      const res = await safeFetchJson<{
        waitingQueue?: TokenItem[];
        currentlyServing?: TokenItem[];
        estimatedWaitText?: string;
        activeCountersCount?: number;
        nextToken?: string | null;
      }>(`/api/tokens/live-queue${centreParam}`);
      if (res.ok && res.data) {
        setWaitingQueue(res.data.waitingQueue || []);
        setQueueEstimatedWaitText(res.data.estimatedWaitText || '');
        setQueueActiveCountersCount(res.data.activeCountersCount || 1);
        setQueueNextToken(res.data.nextToken || (res.data.waitingQueue?.[0]?.tokenNumber || null));

        const myServing = (res.data.currentlyServing || []).find(
          (t: TokenItem) => t.counterNumber === counterNumber || t.staffId === user?._id
        );
        setCurrentServingToken(myServing || null);

        // Pre-fill billing with current serving farmer if fields are empty
        if (myServing && !saleFarmerName) {
          setSaleFarmerName(myServing.farmerName);
          setSaleFarmerPhone(myServing.farmerPhone || '');
          setSaleTokenNumber(myServing.tokenNumber);
        }
      }
    } catch (err) {
      console.warn('Notice: Queue sync pending:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Held Tokens
  const fetchHeldTokens = async () => {
    if (!token) return;
    try {
      const res = await safeFetchJson<{ heldTokens: TokenItem[] }>('/api/tokens/held', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok && res.data?.heldTokens) {
        setHeldTokens(res.data.heldTokens);
      }
    } catch (err) {
      console.warn('Notice: Held tokens sync pending:', err);
    }
  };

  // Fetch Inventory Products, Sales History, Purchases, and Services Catalog
  const fetchInventoryData = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const [prodRes, salesRes, purchRes, srvRes] = await Promise.all([
        safeFetchJson<ProductItem[]>('/api/inventory/products'),
        safeFetchJson<SaleRecord[]>('/api/inventory/sales', { headers }),
        safeFetchJson<PurchaseRecord[]>('/api/inventory/purchases', { headers }),
        safeFetchJson<ServiceItem[]>('/api/tokens/services')
      ]);

      if (prodRes.ok && Array.isArray(prodRes.data)) {
        setProducts(prodRes.data);
      }
      if (salesRes.ok && Array.isArray(salesRes.data)) {
        setSalesHistory(salesRes.data);
      }
      if (purchRes.ok && Array.isArray(purchRes.data)) {
        setPurchases(purchRes.data);
      }
      if (srvRes.ok && Array.isArray(srvRes.data)) {
        setServices(srvRes.data);
      }
    } catch (err) {
      console.warn('Notice: Inventory sync pending:', err);
    }
  };

  useEffect(() => {
    fetchQueueData();
    fetchHeldTokens();
    fetchInventoryData();
    const interval = setInterval(() => {
      fetchQueueData();
      fetchHeldTokens();
    }, 4000);
    return () => clearInterval(interval);
  }, [counterNumber, token, user?.centre]);

  // ================= SHIFT & COUNTER CONTROLS =================
  const handleUpdateShiftStatus = async (newStatus: 'active' | 'break' | 'offline') => {
    if (!token) return;
    try {
      const res = await safeFetchJson<{ user: any }>('/api/tokens/staff/shift', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ shiftStatus: newStatus, counterNumber })
      });
      if (res.ok) {
        setShiftStatus(newStatus);
        setNotification({
          type: 'info',
          text: `Shift status updated to: ${newStatus === 'active' ? 'On Duty' : newStatus === 'break' ? 'On Break' : 'Offline'}`
        });
      }
    } catch (err: any) {
      console.error('Error updating shift status:', err);
    }
  };

  const handleChangeCounter = async (newCounter: number) => {
    setCounterNumber(newCounter);
    if (!token) return;
    try {
      await safeFetchJson('/api/tokens/staff/shift', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ counterNumber: newCounter, shiftStatus })
      });
    } catch (err) {
      console.warn('Counter update pending:', err);
    }
  };

  // ================= BILLING & SERVICE HELPERS =================
  const checkRequiresBilling = (tokenItem: TokenItem | null): boolean => {
    if (!tokenItem) return false;
    if (tokenItem.requiresBilling === true) return true;
    const matched = services.find(s =>
      (s.code && tokenItem.serviceId && s.code.toUpperCase() === tokenItem.serviceId.toUpperCase()) ||
      (s._id && tokenItem.serviceId && s._id === tokenItem.serviceId) ||
      (s.id && tokenItem.serviceId && s.id === tokenItem.serviceId) ||
      (s.name && tokenItem.serviceName && s.name.toLowerCase() === tokenItem.serviceName.toLowerCase())
    );
    return Boolean(matched?.requiresBilling);
  };

  const getCompletedSaleForToken = (tokNumber?: string): SaleRecord | undefined => {
    if (!tokNumber) return undefined;
    const clean = tokNumber.trim().toUpperCase();
    return salesHistory.find(s => s.tokenNumber && s.tokenNumber.trim().toUpperCase() === clean);
  };

  const isTokenAlreadyBilled = (tokNumber?: string): boolean => {
    return Boolean(getCompletedSaleForToken(tokNumber));
  };

  // ================= 1. QUEUE CONTROLS =================
  const handleCallNext = async () => {
    if (!token) return;

    if (shiftStatus !== 'active') {
      setNotification({
        type: 'error',
        text: `Your counter is currently marked ${shiftStatus === 'break' ? 'On Break' : 'Offline'}. Please switch to "On Duty" to call tokens.`
      });
      return;
    }

    if (currentServingToken) {
      setNotification({
        type: 'error',
        text: `Currently serving ${currentServingToken.tokenNumber}. Please Complete, Hold, or Skip first.`
      });
      return;
    }

    if (waitingQueue.length === 0) {
      setNotification({ type: 'info', text: 'No farmers currently waiting in queue for this centre.' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await safeFetchJson<{ token: TokenItem }>('/api/tokens/call-next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ counterNumber })
      });

      if (res.ok && res.data?.token) {
        const called = res.data.token;
        setCurrentServingToken(called);
        setSaleFarmerName(called.farmerName);
        setSaleFarmerPhone(called.farmerPhone || '');
        setSaleTokenNumber(called.tokenNumber);

        // Check if service requires billing
        const needsBilling = called.requiresBilling ?? checkRequiresBilling(called);
        const alreadyBilled = isTokenAlreadyBilled(called.tokenNumber);

        if (needsBilling && !alreadyBilled) {
          // Auto open billing only if not previously auto opened for this token
          if (!autoOpenedTokensRef.current.has(called._id)) {
            autoOpenedTokensRef.current.add(called._id);
            setActiveTab('sales');
            setNotification({
              type: 'info',
              text: `Auto-opened Billing for Token ${called.tokenNumber} (${called.serviceName || 'Service'} requires billing).`
            });
          }
        } else if (needsBilling && alreadyBilled) {
          setNotification({
            type: 'info',
            text: `Called token ${called.tokenNumber} (${called.farmerName}). Billing already completed.`
          });
        } else {
          setNotification({
            type: 'success',
            text: `Called token ${called.tokenNumber} (${called.farmerName}) to Counter 0${counterNumber}.`
          });
        }

        playChime();
        announceToken(called.tokenNumber, counterNumber, called.farmerName);
        fetchQueueData();
      } else {
        setNotification({ type: 'error', text: res.error || 'Failed to call next token.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error calling token.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartServing = async () => {
    if (!token || !currentServingToken) return;

    setActionLoading(true);
    try {
      const res = await safeFetchJson<{ token: TokenItem }>(`/api/tokens/${currentServingToken._id}/start-serving`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok && res.data?.token) {
        setCurrentServingToken(res.data.token);
        setNotification({
          type: 'success',
          text: `Now serving Token ${currentServingToken.tokenNumber} (${currentServingToken.farmerName}).`
        });
        fetchQueueData();
      } else {
        setNotification({ type: 'error', text: res.error || 'Failed to start serving token.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error starting service.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecall = async () => {
    if (!token || !currentServingToken) return;

    setActionLoading(true);
    try {
      const res = await safeFetchJson<{ token: TokenItem }>(`/api/tokens/${currentServingToken._id}/recall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ counterNumber })
      });

      if (res.ok && res.data?.token) {
        setCurrentServingToken(res.data.token);
        playChime();
        announceToken(currentServingToken.tokenNumber, counterNumber, currentServingToken.farmerName);
        setNotification({
          type: 'info',
          text: `Re-announced token ${currentServingToken.tokenNumber} (Call #${res.data.token.recallCount || 1}).`
        });
      } else {
        setNotification({ type: 'error', text: res.error || 'Failed to recall token.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error recalling token.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleHold = async () => {
    if (!token || !currentServingToken) return;

    const reasonToUse = holdReason === 'custom' ? customHoldReason.trim() : holdReason;
    if (!reasonToUse) {
      setNotification({ type: 'error', text: 'Please provide a valid reason for putting the token on hold.' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await safeFetchJson<{ token: TokenItem }>(`/api/tokens/${currentServingToken._id}/hold`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reasonToUse })
      });

      if (res.ok) {
        setNotification({
          type: 'info',
          text: `Token ${currentServingToken.tokenNumber} placed on HOLD. Counter 0${counterNumber} is now ready for the next farmer.`
        });
        setCurrentServingToken(null);
        setSaleFarmerName('');
        setSaleFarmerPhone('');
        setSaleTokenNumber('');
        setShowHoldModal(false);
        setCustomHoldReason('');
        fetchQueueData();
        fetchHeldTokens();
      } else {
        setNotification({ type: 'error', text: res.error || 'Failed to place token on hold.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error holding token.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeToken = async (tokenId: string) => {
    if (!token) return;

    if (shiftStatus !== 'active') {
      setNotification({
        type: 'error',
        text: `Please switch to "On Duty" before resuming tokens.`
      });
      return;
    }

    if (currentServingToken) {
      setNotification({
        type: 'error',
        text: `Currently serving token ${currentServingToken.tokenNumber}. Please complete or hold it first.`
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await safeFetchJson<{ token: TokenItem }>(`/api/tokens/${tokenId}/resume`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ counterNumber })
      });

      if (res.ok && res.data?.token) {
        const resumed = res.data.token;
        setCurrentServingToken(resumed);
        setSaleFarmerName(resumed.farmerName);
        setSaleFarmerPhone(resumed.farmerPhone || '');
        setSaleTokenNumber(resumed.tokenNumber);

        playChime();
        announceToken(resumed.tokenNumber, counterNumber, resumed.farmerName);
        setNotification({
          type: 'success',
          text: `Resumed token ${resumed.tokenNumber} (${resumed.farmerName}) at Counter 0${counterNumber}.`
        });
        fetchQueueData();
        fetchHeldTokens();
      } else {
        setNotification({ type: 'error', text: res.error || 'Failed to resume token.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error resuming token.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!token || !currentServingToken) return;

    // Front-end validation: if service requires billing, verify that a bill has been created
    const needsBilling = checkRequiresBilling(currentServingToken);
    const alreadyBilled = isTokenAlreadyBilled(currentServingToken.tokenNumber);

    if (needsBilling && !alreadyBilled) {
      setNotification({
        type: 'error',
        text: 'Billing is required. Complete billing first.'
      });
      setShowCompleteModal(false);
      setShowBillingRequiredModal(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await safeFetchJson<{ ok?: boolean; message?: string; error?: string; requiresBilling?: boolean }>(`/api/tokens/${currentServingToken._id}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: completionNotes.trim() || 'Service completed at counter desk' })
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          text: `Token ${currentServingToken.tokenNumber} marked COMPLETED.`
        });
        setCurrentServingToken(null);
        setShowCompleteModal(false);
        setCompletionNotes('Service completed at counter desk');
        setSaleFarmerName('');
        setSaleFarmerPhone('');
        setSaleTokenNumber('');
        fetchQueueData();
      } else {
        if (res.data?.requiresBilling) {
          setShowCompleteModal(false);
          setShowBillingRequiredModal(true);
        }
        setNotification({ type: 'error', text: res.error || 'Failed to complete token.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error completing token.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!token || !currentServingToken) return;

    setActionLoading(true);
    try {
      const res = await safeFetchJson(`/api/tokens/${currentServingToken._id}/skip`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: skipReason })
      });

      if (res.ok) {
        setNotification({
          type: 'info',
          text: `Token ${currentServingToken.tokenNumber} marked SKIPPED.`
        });
        setCurrentServingToken(null);
        setSaleFarmerName('');
        setSaleFarmerPhone('');
        setSaleTokenNumber('');
        setShowSkipModal(false);
        fetchQueueData();
      } else {
        setNotification({ type: 'error', text: res.error || 'Failed to skip token.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error skipping token.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearchFarmerToken = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await safeFetchJson<{ tokens: TokenItem[] }>(`/api/tokens/search?q=${encodeURIComponent(query.trim())}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (res.ok && res.data?.tokens) {
        setSearchResults(res.data.tokens);
      }
    } catch (err) {
      console.warn('Search query error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Load current serving token farmer into billing form
  const handleLoadServingToBilling = () => {
    if (!currentServingToken) return;
    setSaleFarmerName(currentServingToken.farmerName);
    setSaleFarmerPhone(currentServingToken.farmerPhone || '');
    setSaleTokenNumber(currentServingToken.tokenNumber);
    setActiveTab('sales');
    setNotification({
      type: 'info',
      text: `Loaded details for ${currentServingToken.farmerName} (${currentServingToken.tokenNumber}) into billing.`
    });
  };

  // ================= 2. BILLING / SALES LOGIC =================
  const handleAddItemToSale = (productId: string) => {
    const prod = products.find(p => p._id === productId);
    if (!prod) return;

    if (prod.stock <= 0) {
      setNotification({
        type: 'error',
        text: `Cannot add "${prod.name}": Out of stock (0 ${prod.unit} available).`
      });
      return;
    }

    const existingIndex = saleItems.findIndex(i => i.productId === prod._id);
    if (existingIndex > -1) {
      const nextQty = saleItems[existingIndex].quantity + 1;
      if (nextQty > prod.stock) {
        setNotification({
          type: 'error',
          text: `Cannot exceed available stock for "${prod.name}". Available: ${prod.stock} ${prod.unit}.`
        });
        return;
      }
      const updated = [...saleItems];
      updated[existingIndex].quantity = nextQty;
      updated[existingIndex].amount = nextQty * updated[existingIndex].rate;
      setSaleItems(updated);
    } else {
      setSaleItems([
        ...saleItems,
        {
          productId: prod._id,
          productCode: prod.code,
          productName: prod.name,
          quantity: 1,
          rate: prod.sellingRate,
          amount: prod.sellingRate,
          unit: prod.unit
        }
      ]);
    }
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setSaleItems(saleItems.filter((_, i) => i !== index));
      return;
    }
    const item = saleItems[index];
    const prod = products.find(p => p._id === item.productId);
    if (prod && newQty > prod.stock) {
      setNotification({
        type: 'error',
        text: `Stock limit reached: Only ${prod.stock} ${prod.unit} available for "${prod.name}".`
      });
    }
    const updated = [...saleItems];
    updated[index].quantity = newQty;
    updated[index].amount = newQty * updated[index].rate;
    setSaleItems(updated);
  };

  const saleSubtotal = useMemo(() => {
    return saleItems.reduce((acc, item) => acc + item.amount, 0);
  }, [saleItems]);

  const hasOversellingItem = useMemo(() => {
    return saleItems.some(item => {
      const prod = products.find(p => p._id === item.productId);
      return prod && item.quantity > prod.stock;
    });
  }, [saleItems, products]);

  const handleCreateSale = async () => {
    if (!token) return;

    if (!saleFarmerName.trim()) {
      setNotification({ type: 'error', text: 'Please enter Farmer Name before creating bill.' });
      return;
    }
    if (saleItems.length === 0) {
      setNotification({ type: 'error', text: 'Please add at least one product item to the bill.' });
      return;
    }
    if (hasOversellingItem) {
      setNotification({
        type: 'error',
        text: 'One or more line items exceed current available stock. Please adjust quantities.'
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await safeFetchJson<{ sale: SaleRecord }>('/api/inventory/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          farmerName: saleFarmerName.trim(),
          farmerPhone: saleFarmerPhone.trim(),
          tokenNumber: saleTokenNumber.trim(),
          items: saleItems,
          paymentMethod
        })
      });

      if (res.ok && res.data?.sale) {
        const createdSale = res.data.sale;
        setNotification({
          type: 'success',
          text: `Sale recorded successfully! Invoice: ${createdSale.invoiceNumber} (Total: ₹${createdSale.total.toLocaleString('en-IN')}).`
        });
        setLastCompletedSale(createdSale);
        setSelectedReceiptSale(createdSale);

        // If serving farmer matches this sale and auto-complete is checked, complete the token
        if (autoCompleteTokenOnSale && currentServingToken) {
          await handleComplete();
        } else {
          setSaleItems([]);
          if (!currentServingToken) {
            setSaleFarmerName('');
            setSaleFarmerPhone('');
            setSaleTokenNumber('');
          }
        }

        fetchInventoryData();
      } else {
        setNotification({ type: 'error', text: res.error || 'Failed to record sale.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error processing sale.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered products for billing screen
  const filteredBillingProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = billingProductSearch.trim() === '' ||
        p.name.toLowerCase().includes(billingProductSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(billingProductSearch.toLowerCase());
      const matchCat = billingCategoryFilter === 'all' || p.category === billingCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, billingProductSearch, billingCategoryFilter]);

  // ================= 3. SALES HISTORY LOGIC =================
  const filteredSales = useMemo(() => {
    return salesHistory.filter(s => {
      const sTerm = historySearch.toLowerCase().trim();
      const matchesSearch = sTerm === '' ||
        s.invoiceNumber.toLowerCase().includes(sTerm) ||
        s.farmerName.toLowerCase().includes(sTerm) ||
        (s.farmerPhone && s.farmerPhone.includes(sTerm)) ||
        (s.tokenNumber && s.tokenNumber.toLowerCase().includes(sTerm));

      if (!matchesSearch) return false;

      if (historyDateFilter === 'today') {
        const saleDate = new Date(s.date);
        const today = new Date();
        return (
          saleDate.getDate() === today.getDate() &&
          saleDate.getMonth() === today.getMonth() &&
          saleDate.getFullYear() === today.getFullYear()
        );
      } else if (historyDateFilter === 'week') {
        const saleTime = new Date(s.date).getTime();
        return Date.now() - saleTime <= 7 * 86400000;
      }
      return true;
    });
  }, [salesHistory, historySearch, historyDateFilter]);

  // Sales History Metrics
  const todaySalesMetrics = useMemo(() => {
    const today = new Date();
    const todaySales = salesHistory.filter(s => {
      const d = new Date(s.date);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    });

    const revenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
    const itemsCount = todaySales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, it) => iSum + (it.quantity || 1), 0),
      0
    );

    return { count: todaySales.length, revenue, itemsCount };
  }, [salesHistory]);

  // ================= 4. STOCK REGISTER LOGIC =================
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const sTerm = stockSearch.toLowerCase().trim();
      const matchSearch = sTerm === '' ||
        p.name.toLowerCase().includes(sTerm) ||
        p.code.toLowerCase().includes(sTerm);
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [products, stockSearch, categoryFilter, statusFilter]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock').length;
  }, [products]);

  // ================= 5. PURCHASES REGISTER LOGIC =================
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const sTerm = purchasesSearch.toLowerCase().trim();
      return sTerm === '' ||
        p.invoiceNumber.toLowerCase().includes(sTerm) ||
        p.supplier.toLowerCase().includes(sTerm);
    });
  }, [purchases, purchasesSearch]);

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER WITH MODERN GRADIENT & OPERATOR STATUS */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 border border-emerald-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 font-mono">
                {t('staff.deskTitle', 'STAFF COUNTER DESK • LIVE')}
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 font-semibold">
                Counter 0{counterNumber}
              </span>
              {/* Centre Badge */}
              <div className="flex items-center space-x-1 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full text-emerald-300 text-[10px] font-semibold">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>{user?.centre || 'Krishi Seva Kendra - Main Centre'}</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-heading">
              {t('staff.deskHeading', 'Krishi Operations & Token Calling')}
            </h1>
            <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
              <span>{t('staff.operator', 'Operator')}: <span className="font-semibold text-emerald-300">{user?.name || 'Staff Representative'}</span></span>
              <span>•</span>
              {/* Shift Status Selector */}
              <span className="flex items-center space-x-1.5">
                <span className="text-slate-400">Shift:</span>
                <select
                  value={shiftStatus}
                  onChange={(e) => handleUpdateShiftStatus(e.target.value as 'active' | 'break' | 'offline')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border cursor-pointer focus:outline-none ${
                    shiftStatus === 'active'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : shiftStatus === 'break'
                      ? 'bg-amber-950 text-amber-300 border-amber-600'
                      : 'bg-slate-800 text-slate-400 border-slate-600'
                  }`}
                >
                  <option value="active" className="bg-slate-900 text-emerald-300">● On Duty (Active)</option>
                  <option value="break" className="bg-slate-900 text-amber-300">● On Break</option>
                  <option value="offline" className="bg-slate-900 text-slate-300">● Offline</option>
                </select>
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Centre Display Mode Button */}
            <button
              onClick={() => setShowDisplayMode(true)}
              className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700 shadow-xs"
              title="Open Public Waiting Display for this Centre"
            >
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>Centre Display</span>
            </button>

            {/* Quick Verify Token / QR Code Button */}
            <button
              onClick={() => setVerifyReference(' ')}
              className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-emerald-500/40 shadow-xs"
              title="Lookup or Scan QR Token"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Verify Token / QR</span>
            </button>

            {/* Counter Switcher Dropdown */}
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 backdrop-blur-xs">
              <span className="text-slate-400">{t('staff.counterNo', 'Counter')}:</span>
              <select
                value={counterNumber}
                onChange={(e) => handleChangeCounter(Number(e.target.value))}
                className="font-bold text-white bg-transparent focus:outline-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num} className="bg-slate-900 text-white">
                    Counter 0{num}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={() => {
                fetchQueueData();
                fetchHeldTokens();
                fetchInventoryData();
                setNotification({ type: 'info', text: 'Refreshed queue, held tokens and inventory data.' });
              }}
              className="p-2.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl cursor-pointer transition-colors border border-slate-700 hover:border-slate-600 shadow-xs"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Live Mini Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center space-x-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Waiting Line</div>
              <div className="text-base font-bold text-white font-mono">
                {waitingQueue.length} {t('board.farmersWaiting', 'Farmers')}
              </div>
              <div className="text-[10px] text-amber-400 font-medium">
                {queueNextToken ? `Next: ${queueNextToken}` : 'Queue empty'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium">{t('board.nowServing', 'Currently Serving')}</div>
              <div className="text-base font-bold text-emerald-300 font-mono">
                {currentServingToken ? currentServingToken.tokenNumber : t('board.idleCounter', 'None (Idle)')}
              </div>
              <div className="text-[10px] text-slate-400">
                Counter 0{counterNumber}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Smart Queue ETA</div>
              <div className="text-base font-bold text-white font-mono">
                {queueEstimatedWaitText || (waitingQueue.length > 0 ? `~${waitingQueue.length * 8} mins` : 'No Wait')}
              </div>
              <div className="text-[10px] text-sky-300">
                Service-based estimate
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Active Counters</div>
              <div className="text-base font-bold text-emerald-300 font-mono">
                {queueActiveCountersCount} Desk{queueActiveCountersCount > 1 ? 's' : ''} Active
              </div>
              <div className="text-[10px] text-slate-400">
                Parallel processing
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TAB BAR WITH MODERN BADGES */}
      <div className="flex border-b border-slate-200 text-xs font-semibold overflow-x-auto bg-slate-100/90 rounded-2xl p-1.5 space-x-1.5 shadow-inner">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/90 ring-1 ring-emerald-500/10'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>{t('staff.tabQueue', 'Counter Queue & Call')}</span>
          {waitingQueue.length > 0 && (
            <span className="ml-1 bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
              {waitingQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'sales'
              ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/90 ring-1 ring-emerald-500/10'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          <span>{t('staff.tabBilling', 'New Sale (Billing)')}</span>
          {saleItems.length > 0 && (
            <span className="ml-1 bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              {saleItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/90 ring-1 ring-emerald-500/10'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>{t('staff.tabHistory', 'Sales History')}</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/90 ring-1 ring-emerald-500/10'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Package className="w-4 h-4 text-emerald-600" />
          <span>{t('staff.tabStock', 'Stock Register')}</span>
          {lowStockCount > 0 && (
            <span className="ml-1 bg-rose-100 text-rose-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
              {lowStockCount} low
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'purchases'
              ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/90 ring-1 ring-emerald-500/10'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>{t('staff.tabPurchases', 'Purchases Register')}</span>
        </button>

        <button
          onClick={() => setActiveTab('procurement')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'procurement'
              ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/90 ring-1 ring-emerald-500/10'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Wheat className="w-4 h-4 text-emerald-600" />
          <span>Farmer Procurement (Phase 4)</span>
        </button>
      </div>

      {/* Notifications Toast */}
      {notification && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between border shadow-xs transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
            : notification.type === 'error'
            ? 'bg-red-50 text-red-900 border-red-300'
            : 'bg-slate-100 text-slate-900 border-slate-300'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
            )}
            <span className="font-medium">{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="font-bold text-xs px-2 hover:underline cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================= TAB 1: OPERATIONAL QUEUE DESK ================= */}
      {activeTab === 'queue' && (
        <div className="space-y-5">
          {/* NOW SERVING / CURRENT DESK OPERATION */}
          <div className="bg-white border border-slate-300 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  COUNTER 0{counterNumber} • {user?.centre || 'Krishi Seva Kendra'}
                </div>
                {currentServingToken && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    currentServingToken.status === 'called'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {currentServingToken.status === 'called' ? 'Calling to Counter' : 'Currently Serving'}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {shiftStatus === 'active' ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                    Counter On Duty
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold">
                    Counter {shiftStatus === 'break' ? 'On Break' : 'Offline'}
                  </span>
                )}
              </div>
            </div>

            {currentServingToken ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                        {currentServingToken.tokenNumber}
                      </div>
                      <div className="space-y-1">
                        <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          currentServingToken.status === 'called'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-700 text-white'
                        }`}>
                          {currentServingToken.status === 'called' ? 'CALLED' : 'SERVING'}
                        </span>
                        {currentServingToken.recallCount && currentServingToken.recallCount > 1 ? (
                          <div className="text-[10px] font-bold text-amber-700">
                            (Call #{currentServingToken.recallCount})
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 mt-2 flex flex-wrap items-center gap-x-2">
                      <span className="font-semibold text-slate-500">Farmer:</span>
                      <span className="font-bold text-slate-900 text-sm">{currentServingToken.farmerName}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-700">{currentServingToken.farmerPhone || 'No phone'}</span>
                    </div>
                    <div className="text-xs text-emerald-800 font-semibold mt-1.5 flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span>Service: {currentServingToken.serviceName}</span>
                      </span>
                      {currentServingToken.slotString && (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-mono font-medium">
                          Slot: {currentServingToken.slotString}
                        </span>
                      )}
                      {currentServingToken.bookingReference && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          Ref: {currentServingToken.bookingReference}
                        </span>
                      )}
                      {/* Service Billing Badge */}
                      {checkRequiresBilling(currentServingToken) ? (
                        isTokenAlreadyBilled(currentServingToken.tokenNumber) ? (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-700" />
                            Billing Completed ({getCompletedSaleForToken(currentServingToken.tokenNumber)?.invoiceNumber})
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 animate-pulse">
                            <Receipt className="w-3 h-3 text-amber-700" />
                            Billing Required
                          </span>
                        )
                      ) : (
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium">
                          Billing Not Required
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    <button
                      onClick={handleRecall}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-300 cursor-pointer shadow-xs"
                      title="Recall and re-announce token over PA speaker"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Recall Voice</span>
                    </button>

                    {checkRequiresBilling(currentServingToken) && isTokenAlreadyBilled(currentServingToken.tokenNumber) ? (
                      <button
                        onClick={() => {
                          const s = getCompletedSaleForToken(currentServingToken.tokenNumber);
                          if (s) setSelectedReceiptSale(s);
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-emerald-300 cursor-pointer shadow-xs"
                        title="View completed bill receipt"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-700" />
                        <span>View Receipt</span>
                      </button>
                    ) : checkRequiresBilling(currentServingToken) ? (
                      <button
                        onClick={handleLoadServingToBilling}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs animate-pulse"
                        title="Open Billing POS with farmer details loaded (Billing Required)"
                      >
                        <Receipt className="w-3.5 h-3.5 text-white" />
                        <span>Open Billing (Required)</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleLoadServingToBilling}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-emerald-300 cursor-pointer shadow-xs"
                        title="Open Billing POS with farmer details loaded"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Open Billing</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Billing Required Prompt Banner if service requires billing and not yet billed */}
                {checkRequiresBilling(currentServingToken) && !isTokenAlreadyBilled(currentServingToken.tokenNumber) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <div>
                        <span className="font-bold text-amber-950">Billing Required: </span>
                        <span>This service requires completing POS billing before closing this token.</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadServingToBilling}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Open Billing POS</span>
                    </button>
                  </div>
                )}

                {/* Main Dynamic Operational Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {/* If status is 'called', primary action is Start Serving or Recall */}
                  {currentServingToken.status === 'called' && (
                    <button
                      id="staff-start-serving-btn"
                      onClick={handleStartServing}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Serving Farmer</span>
                    </button>
                  )}

                  {/* Complete Service Button */}
                  <button
                    id="staff-complete-btn"
                    onClick={() => {
                      if (checkRequiresBilling(currentServingToken) && !isTokenAlreadyBilled(currentServingToken.tokenNumber)) {
                        setNotification({
                          type: 'error',
                          text: 'Billing is required. Complete billing first.'
                        });
                        setShowBillingRequiredModal(true);
                        return;
                      }
                      setShowCompleteModal(true);
                    }}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Service</span>
                  </button>

                  {/* Hold Token Button */}
                  <button
                    id="staff-hold-btn"
                    onClick={() => setShowHoldModal(true)}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    title="Put current farmer on hold (e.g. document verification pending)"
                  >
                    <Pause className="w-4 h-4 text-amber-700" />
                    <span>Hold Token</span>
                  </button>

                  {/* Call Next Token in Line */}
                  <button
                    id="staff-call-next-btn"
                    onClick={handleCallNext}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Call Next ({waitingQueue.length})</span>
                  </button>

                  {/* Skip Token Button */}
                  <button
                    id="staff-skip-btn"
                    onClick={() => setShowSkipModal(true)}
                    disabled={actionLoading}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer border border-slate-300 ml-auto"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Skip Token</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <div className="text-sm font-medium text-slate-600">
                  Counter 0{counterNumber} is currently idle and ready to serve farmers.
                </div>
                {shiftStatus !== 'active' ? (
                  <div className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 inline-block px-3 py-1.5 rounded-lg">
                    Counter is currently {shiftStatus === 'break' ? 'On Break' : 'Offline'}. Switch to "On Duty" to call tokens.
                  </div>
                ) : (
                  <button
                    id="staff-call-next-idle-btn"
                    onClick={handleCallNext}
                    disabled={actionLoading || waitingQueue.length === 0}
                    className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-2 cursor-pointer shadow-xs"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Call Next Token ({waitingQueue.length} waiting in line)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* SEARCH FARMER / TOKEN SEARCH BAR */}
          <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="staff-farmer-token-search" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-700" />
                <span>Search Farmer Booking & Token History</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Search by name, phone number, or token # (e.g. A-101)
              </span>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="staff-farmer-token-search"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchFarmerToken(e.target.value)}
                placeholder="Type farmer name, mobile number, or token number..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {isSearching && (
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">Searching...</span>
              )}
            </div>

            {/* Search Results Preview */}
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden mt-2 bg-slate-50/60 divide-y divide-slate-200 text-xs">
                {searchResults.map((tok) => (
                  <div key={tok._id} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-100/80 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {tok.tokenNumber}
                        </span>
                        <span className="font-bold text-slate-900">{tok.farmerName}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{tok.farmerPhone}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.2 rounded-full ${
                          tok.status === 'serving' ? 'bg-emerald-100 text-emerald-800' :
                          tok.status === 'called' ? 'bg-amber-100 text-amber-800' :
                          tok.status === 'hold' ? 'bg-orange-100 text-orange-800' :
                          tok.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          tok.status === 'skipped' ? 'bg-slate-200 text-slate-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {tok.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center space-x-2">
                        <span>{tok.serviceName}</span>
                        {tok.slotString && <span>• Slot: <strong className="font-mono">{tok.slotString}</strong></span>}
                        {tok.bookingReference && <span>• Ref: <strong className="font-mono">{tok.bookingReference}</strong></span>}
                        {tok.centre && <span>• Kendra: {tok.centre}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      <button
                        onClick={() => setSelectedSearchToken(tok)}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-semibold cursor-pointer"
                      >
                        View Details
                      </button>
                      {tok.status === 'hold' && (
                        <button
                          onClick={() => handleResumeToken(tok._id)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          Resume to Desk
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HELD TOKENS SECTION (IF ANY TOKENS ON HOLD) */}
          {heldTokens.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center space-x-2">
                  <Pause className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Held Tokens ({heldTokens.length}) • Documents / Farmer Verification Pending
                  </h3>
                </div>
                <span className="text-[11px] text-amber-800">
                  Ready to resume when farmer returns
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {heldTokens.map((tok) => (
                  <div key={tok._id} className="bg-white border border-amber-200 rounded-lg p-3 shadow-2xs flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-base text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {tok.tokenNumber}
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                          ON HOLD
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1.5">{tok.farmerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{tok.farmerPhone || 'No phone'}</div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        <span>Service: <strong>{tok.serviceName}</strong></span>
                      </div>
                      {tok.holdReason && (
                        <div className="text-[11px] text-amber-900 mt-1 bg-amber-50 p-1.5 rounded border border-amber-200 font-medium">
                          Reason: {tok.holdReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">
                        Held {tok.holdAt ? new Date(tok.holdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      <button
                        onClick={() => handleResumeToken(tok._id)}
                        disabled={actionLoading}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>Resume to Counter 0{counterNumber}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WAITING QUEUE TABLE */}
          <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Waiting Queue Line</span>
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                {waitingQueue.length} farmers in waiting line
              </span>
            </div>

            {waitingQueue.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No farmers currently waiting in line.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-2.5 px-3">Pos & Token</th>
                      <th className="py-2.5 px-3">Farmer Details</th>
                      <th className="py-2.5 px-3">Service & Slot</th>
                      <th className="py-2.5 px-3">Queue ETA</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {waitingQueue.map((tok, index) => {
                      const waitMins = Math.max(
                        1,
                        Math.round((Date.now() - new Date(tok.issuedAt).getTime()) / 60000)
                      );
                      const isNext = index === 0;

                      return (
                        <tr key={tok._id} className={`hover:bg-slate-50/60 ${isNext ? 'bg-amber-50/30' : ''}`}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center space-x-1.5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                isNext 
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                #{index + 1}
                              </span>
                              <span className="font-mono font-bold text-slate-900">
                                {tok.tokenNumber}
                              </span>
                            </div>
                            {isNext && (
                              <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                                ★ Next in line
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{tok.farmerName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{tok.farmerPhone || 'No phone'}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <div className="font-medium text-slate-800">{tok.serviceName}</div>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              {tok.slotString ? (
                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 text-[10px] rounded font-mono font-medium">
                                  Slot: {tok.slotString}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">
                                  Walk-in Token
                                </span>
                              )}
                              {tok.bookingReference && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  Ref: {tok.bookingReference}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 font-mono">
                              {tok.estimatedWaitText ? tok.estimatedWaitText.replace('Estimated wait: ', '') : `~${(index + 1) * 8} min`}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {tok.peopleAhead !== undefined ? `${tok.peopleAhead} ahead` : `${index} ahead`} • in line {waitMins}m
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => setVerifyReference(tok.tokenNumber)}
                                className="text-slate-600 hover:text-slate-900 p-1 rounded hover:bg-slate-100 cursor-pointer"
                                title="Verify Authenticity"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                              </button>
                              <button
                                onClick={() => {
                                  if (currentServingToken) {
                                    setNotification({
                                      type: 'error',
                                      text: `Please complete or skip current token ${currentServingToken.tokenNumber} first.`
                                    });
                                    return;
                                  }
                                  handleCallNext();
                                }}
                                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                              >
                                Call to Desk
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: PROFESSIONAL KRISHI SEVA KENDRA POS ================= */}
      {activeTab === 'sales' && (
        <KrishiPosDesk
          products={products}
          currentServingToken={currentServingToken}
          waitingQueue={waitingQueue}
          salesHistory={salesHistory}
          counterNumber={counterNumber}
          staffToken={token}
          staffUser={user}
          onSaleCompleted={(sale) => {
            setSalesHistory((prev) => [sale, ...prev.filter(s => s._id !== sale._id)]);
            fetchInventoryData();
          }}
          onCompleteServingToken={async () => {
            if (currentServingToken) {
              await handleComplete();
            }
          }}
          onRefreshData={() => {
            fetchQueueData();
            fetchInventoryData();
          }}
          onOpenReceipt={(sale) => setSelectedReceiptSale(sale)}
        />
      )}

      {/* ================= TAB 3: SALES HISTORY ================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Today's Sales Count</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                {todaySalesMetrics.count}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Official invoices generated today</span>
            </div>

            <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Today's Total Revenue</span>
              <span className="text-2xl font-black text-emerald-800 font-mono mt-1 block">
                ₹{todaySalesMetrics.revenue.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Total collections across counters</span>
            </div>

            <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Total Items Dispatched</span>
              <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">
                {todaySalesMetrics.itemsCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Units of seeds/fertilizer delivered</span>
            </div>
          </div>

          <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-800" />
                <h2 className="text-base font-bold text-slate-900">Official Sales History</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Time Range Filter */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                  <button
                    onClick={() => setHistoryDateFilter('today')}
                    className={`px-3 py-1 rounded font-medium cursor-pointer ${
                      historyDateFilter === 'today' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setHistoryDateFilter('week')}
                    className={`px-3 py-1 rounded font-medium cursor-pointer ${
                      historyDateFilter === 'week' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => setHistoryDateFilter('all')}
                    className={`px-3 py-1 rounded font-medium cursor-pointer ${
                      historyDateFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    All Time
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Invoice / Farmer / Phone..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-60 bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                    <th className="py-2.5 px-3">Invoice</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Farmer Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Token</th>
                    <th className="py-2.5 px-3">Items Summary</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Staff</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        No sales records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(s.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{s.farmerName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{s.farmerPhone || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{s.tokenNumber || 'Walk-in'}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {s.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{s.total.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{s.staffName}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedReceiptSale(s)}
                            className="text-emerald-800 hover:text-emerald-950 font-semibold hover:underline cursor-pointer inline-flex items-center space-x-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Bill</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: STOCK REGISTER (INVENTORY) ================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Low Stock Alert Banner */}
          {lowStockCount > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-semibold">
                  Inventory Alert: {lowStockCount} agricultural products are low on stock or completely exhausted. Please replenish through Purchases Register.
                </span>
              </div>
              <button
                onClick={() => setStatusFilter('low_stock')}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded cursor-pointer shrink-0 ml-3"
              >
                View Low Stock
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-emerald-800" />
                <h2 className="text-base font-bold text-slate-900">Krishi Inventory Stock Register</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search product code or name..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="Fertilizer">Fertilizer</option>
                  <option value="Seeds">Seeds</option>
                  <option value="Micro-nutrients">Micro-nutrients</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Pesticides">Pesticides</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddProductModal(true)}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Code / SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Available Stock</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3 text-right">Purchase Rate</th>
                    <th className="py-2.5 px-3 text-right">Selling Rate</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        No products found. Use "+ Add Product" to register new agricultural supplies.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{p.code}</td>
                        <td className="py-2.5 px-3 text-slate-600">{p.category}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 text-sm">
                          {p.stock}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{p.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">₹{p.purchaseRate}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 text-sm">
                          ₹{p.sellingRate}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'in_stock'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : p.status === 'low_stock'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {p.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setEditingStockProduct(p)}
                            className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline cursor-pointer"
                          >
                            Update Stock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: PURCHASES REGISTER ================= */}
      {activeTab === 'purchases' && (
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-800" />
              <h2 className="text-base font-bold text-slate-900">Purchases & Inward Invoices Register</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search invoice or supplier..."
                  value={purchasesSearch}
                  onChange={(e) => setPurchasesSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none w-52"
                />
              </div>

              <button
                onClick={() => setShowNewPurchaseModal(true)}
                className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Record Inward Purchase</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-center">Items Count</th>
                  <th className="py-2.5 px-3 text-right">Total Invoice (₹)</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No purchase records found. Click "+ Record Inward Purchase" to log stock delivery.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-800 font-semibold">{p.supplier}</td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(p.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                        {p.itemsCount} items
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 text-sm">
                        ₹{p.total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{p.recordedBy}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedPurchaseDetails(p)}
                          className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 6: FARMER PROCUREMENT WORKFLOW DESK ================= */}
      {activeTab === 'procurement' && (
        <StaffProcurementTab
          token={token || ''}
          currentServingToken={currentServingToken}
          onNotification={(n) => setNotification({ type: n.type, text: n.text })}
        />
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Skip Token Modal */}
      {showSkipModal && currentServingToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-300 p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">
              Skip Token {currentServingToken.tokenNumber}
            </h3>
            <p className="text-xs text-slate-600">
              Select reason for skipping {currentServingToken.farmerName}:
            </p>
            <select
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:outline-none"
            >
              <option value="Farmer absent after 3 public announcements">
                Farmer absent after 3 public announcements
              </option>
              <option value="Required documents incomplete">
                Required documents incomplete
              </option>
              <option value="Farmer requested postponement">
                Farmer requested postponement
              </option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSkipModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add New Product Modal */}
      {showAddProductModal && token && (
        <AddProductModal
          token={token}
          onClose={() => setShowAddProductModal(false)}
          onSuccess={(newProd) => {
            setShowAddProductModal(false);
            setNotification({
              type: 'success',
              text: `Added "${newProd.name}" (${newProd.code}) to stock register.`
            });
            fetchInventoryData();
          }}
        />
      )}

      {/* 3. Edit Stock Modal */}
      {editingStockProduct && token && (
        <EditStockModal
          product={editingStockProduct}
          token={token}
          onClose={() => setEditingStockProduct(null)}
          onSuccess={(updated) => {
            setEditingStockProduct(null);
            setNotification({
              type: 'success',
              text: `Updated stock and rates for "${updated.name}".`
            });
            fetchInventoryData();
          }}
        />
      )}

      {/* 4. New Purchase Modal */}
      {showNewPurchaseModal && token && (
        <NewPurchaseModal
          products={products}
          token={token}
          onClose={() => setShowNewPurchaseModal(false)}
          onSuccess={(purchase) => {
            setShowNewPurchaseModal(false);
            setNotification({
              type: 'success',
              text: `Purchase recorded (${purchase.invoiceNumber})! Stock levels updated.`
            });
            fetchInventoryData();
          }}
        />
      )}

      {/* 5. Purchase Details Modal */}
      {selectedPurchaseDetails && (
        <PurchaseDetailsModal
          purchase={selectedPurchaseDetails}
          onClose={() => setSelectedPurchaseDetails(null)}
        />
      )}

      {/* 6. Printable Bill Receipt Modal */}
      {selectedReceiptSale && (
        <SaleReceiptModal
          sale={selectedReceiptSale}
          onClose={() => setSelectedReceiptSale(null)}
        />
      )}

      {/* 7. Token / QR Verification Modal */}
      {verifyReference && (
        <TokenVerifyModal
          reference={verifyReference.trim() || undefined}
          onClose={() => setVerifyReference(null)}
        />
      )}

      {/* 8. Hold Token Modal */}
      {showHoldModal && currentServingToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-300 p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-amber-900">
              <Pause className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold">
                Place Token {currentServingToken.tokenNumber} on HOLD
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Putting farmer <strong className="text-slate-900">{currentServingToken.farmerName}</strong> on hold will free up Counter 0{counterNumber} to call the next waiting farmer. You can resume this token anytime.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">Select Hold Reason:</label>
              <select
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:outline-none"
              >
                <option value="Document / Kisan card verification pending">
                  Document / Kisan card verification pending
                </option>
                <option value="Farmer stepped out for photocopying / stamp paper">
                  Farmer stepped out for photocopying / stamp paper
                </option>
                <option value="Online portal subsidy verification in progress">
                  Online portal subsidy verification in progress
                </option>
                <option value="Cash/Bank payment arrangement in progress">
                  Cash/Bank payment arrangement in progress
                </option>
                <option value="custom">Other / Custom Reason</option>
              </select>

              {holdReason === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter specific reason for hold..."
                  value={customHoldReason}
                  onChange={(e) => setCustomHoldReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowHoldModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleHold}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer shadow-xs transition-colors"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Complete Service Modal */}
      {showCompleteModal && currentServingToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-300 p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold">
                Complete Service for Token {currentServingToken.tokenNumber}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Farmer: <strong className="text-slate-900">{currentServingToken.farmerName}</strong> • Service: <strong className="text-slate-900">{currentServingToken.serviceName}</strong>
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Service Notes / Remarks:</label>
              <textarea
                rows={2}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Subsidized seeds dispatched, payment verified."
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg cursor-pointer shadow-xs transition-colors"
              >
                Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9b. Billing Required Alert Modal */}
      {showBillingRequiredModal && currentServingToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-amber-300 p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold">
                Billing Required: Complete POS Bill First
              </h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
              <p>
                Service <strong>{currentServingToken.serviceName}</strong> is configured as <strong>Billing Required</strong>.
              </p>
              <p className="text-amber-800">
                You cannot complete Token <strong>{currentServingToken.tokenNumber}</strong> until a sale bill is recorded in the POS system for this token.
              </p>
            </div>
            <div className="text-xs text-slate-600">
              Farmer: <strong className="text-slate-900">{currentServingToken.farmerName}</strong> • Counter: <strong className="text-slate-900">0{counterNumber}</strong>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBillingRequiredModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBillingRequiredModal(false);
                  handleLoadServingToBilling();
                }}
                className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Open POS Billing Desk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Farmer Booking & Slot Details Modal */}
      {selectedSearchToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-300 p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 font-mono">
                  Farmer Token & Slot Details
                </span>
                <h3 className="text-2xl font-black font-mono text-slate-900">
                  {selectedSearchToken.tokenNumber}
                </h3>
              </div>
              <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                selectedSearchToken.status === 'serving' ? 'bg-emerald-100 text-emerald-800' :
                selectedSearchToken.status === 'called' ? 'bg-amber-100 text-amber-800' :
                selectedSearchToken.status === 'hold' ? 'bg-orange-100 text-orange-800' :
                selectedSearchToken.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                selectedSearchToken.status === 'skipped' ? 'bg-slate-200 text-slate-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {selectedSearchToken.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Farmer Name</span>
                <strong className="text-slate-900 text-sm">{selectedSearchToken.farmerName}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Mobile Phone</span>
                <strong className="text-slate-900 font-mono">{selectedSearchToken.farmerPhone || 'N/A'}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Service Requested</span>
                <strong className="text-slate-900">{selectedSearchToken.serviceName}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Kendra Centre</span>
                <strong className="text-slate-900">{selectedSearchToken.centre || 'Main Centre'}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Booked Slot Window</span>
                <strong className="text-emerald-800 font-mono">{selectedSearchToken.slotString || 'Walk-in'}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Booking Reference</span>
                <strong className="text-slate-800 font-mono">{selectedSearchToken.bookingReference || 'Direct Token'}</strong>
              </div>
            </div>

            {selectedSearchToken.holdReason && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                <span className="font-bold block">Hold Reason:</span>
                <span>{selectedSearchToken.holdReason}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setSelectedSearchToken(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setVerifyReference(selectedSearchToken.tokenNumber);
                    setSelectedSearchToken(null);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl cursor-pointer flex items-center space-x-1"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Verify Authenticity</span>
                </button>
                {selectedSearchToken.status === 'hold' && (
                  <button
                    onClick={() => {
                      handleResumeToken(selectedSearchToken._id);
                      setSelectedSearchToken(null);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Resume to Counter 0{counterNumber}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. Centre Display Mode Fullscreen Overlay */}
      {showDisplayMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
          <PublicDisplayBoard
            centre={user?.centre || 'Krishi Seva Kendra - Main Centre'}
            onBack={() => setShowDisplayMode(false)}
          />
        </div>
      )}
    </div>
  );
};
