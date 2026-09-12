import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/api.ts';
import { 
  BarChart3, 
  TrendingUp, 
  Filter, 
  Calendar, 
  RotateCw, 
  Clock, 
  Users, 
  Tractor, 
  Wheat, 
  IndianRupee, 
  CreditCard, 
  Boxes, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  Star, 
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { AdminAiInsightsCard } from './AdminAiInsightsCard.tsx';
import { ProcurementIntelligenceCard } from './ProcurementIntelligenceCard.tsx';
import { InventoryIntelligenceCard } from './InventoryIntelligenceCard.tsx';

interface AdminAnalyticsTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

interface AnalyticsData {
  filtersApplied: {
    range: string;
    rangeLabel: string;
    fromDate: string;
    toDate: string;
    service: string;
    staff: string;
    centre: string;
  };
  summary: {
    totalFarmers: number;
    todayTokens: number;
    totalTokens: number;
    completedTokens: number;
    waitingTokens: number;
    filteredWaitingTokens: number;
    cancelledTokens: number;
    servingTokens: number;
    avgWaitingTime: number;
    avgServiceTime: number;
    peakHours: string;
    procurementQuantity: number;
    procurementNetWeight: number;
    procurementValue: number;
    pendingPaymentsCount: number;
    pendingPaymentsValue: number;
    paidPaymentsCount: number;
    paidPaymentsValue: number;
    salesRevenue: number;
    salesCount: number;
    cashRevenue: number;
    upiRevenue: number;
    purchaseValue: number;
    purchasesCount: number;
    currentStockTotal: number;
    lowStockCount: number;
    totalProducts: number;
    openComplaints: number;
    resolvedComplaints: number;
    totalComplaints: number;
  };
  queueAnalytics: {
    dailyTokenVolume: Array<{ date: string; label: string; count: number; completed: number; cancelled: number }>;
    serviceDemand: Array<{ serviceName: string; count: number; percentage: number }>;
    peakHours: Array<{ hour: number; label: string; count: number }>;
    avgWaitingTimeMinutes: number;
    avgServiceTimeMinutes: number;
    completionRate: number;
    cancellationRate: number;
  };
  procurementAnalytics: {
    produceWise: Array<{
      cropName: string;
      declaredQuantity: number;
      netWeight: number;
      acceptedQuantity: number;
      rejectedQuantity: number;
      totalValue: number;
      unit: string;
      count: number;
    }>;
    procurementValue: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    qualityGrades: Array<{ grade: string; count: number; quantity: number }>;
    avgMoisture: number;
    paymentStatus: {
      pendingCount: number;
      pendingAmount: number;
      paidCount: number;
      paidAmount: number;
    };
  };
  salesAndInventory: {
    salesTrend: Array<{ date: string; label: string; revenue: number; count: number }>;
    topSellingProducts: Array<{ name: string; code: string; quantity: number; revenue: number }>;
    lowStockProducts: Array<{ name: string; code: string; stock: number; minThreshold: number; unit: string; category: string }>;
    purchaseVsSales: {
      purchaseTotal: number;
      salesTotal: number;
      purchaseCount: number;
      salesCount: number;
      netMargin: number;
    };
    stockMovementSummary: {
      purchases: number;
      purchaseQty: number;
      sales: number;
      saleQty: number;
      adjustments: number;
      adjustmentQty: number;
      totalMovements: number;
    };
  };
  complaintAnalytics: {
    totalVolume: number;
    openCount: number;
    inProgressCount: number;
    resolvedCount: number;
    categoryDistribution: Array<{ category: string; count: number }>;
    priorityBreakdown: Array<{ priority: string; count: number }>;
    avgFarmerRating: number;
    ratedCount: number;
  };
  filterOptions: {
    services: Array<{ id: string; name: string }>;
    staff: Array<{ id: string; name: string }>;
    centres: string[];
  };
}

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({ token, onNotification }) => {
  // Filter States
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'>('last7days');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [selectedStaff, setSelectedStaff] = useState<string>('ALL');
  const [selectedCentre, setSelectedCentre] = useState<string>('ALL');

  // Sub-section tab: 'overview' | 'ai' | 'queue' | 'procurement' | 'sales' | 'complaints'
  const [activeSection, setActiveSection] = useState<'overview' | 'ai' | 'queue' | 'procurement' | 'sales' | 'complaints'>('overview');

  // Data State
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentQueryParams = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set('range', dateRange);
    if (dateRange === 'custom') {
      if (customStart) params.set('startDate', customStart);
      if (customEnd) params.set('endDate', customEnd);
    }
    if (selectedService !== 'ALL') params.set('service', selectedService);
    if (selectedStaff !== 'ALL') params.set('staff', selectedStaff);
    if (selectedCentre !== 'ALL') params.set('centre', selectedCentre);
    return params.toString();
  }, [dateRange, customStart, customEnd, selectedService, selectedStaff, selectedCentre]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('range', dateRange);
      if (dateRange === 'custom') {
        if (customStart) params.set('startDate', customStart);
        if (customEnd) params.set('endDate', customEnd);
      }
      if (selectedService !== 'ALL') params.set('service', selectedService);
      if (selectedStaff !== 'ALL') params.set('staff', selectedStaff);
      if (selectedCentre !== 'ALL') params.set('centre', selectedCentre);

      const res = await safeFetchJson<AnalyticsData>(`/api/admin/analytics/overview?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to fetch analytics from MongoDB.');
      }
    } catch (err: any) {
      setError(err?.message || 'Connection error while fetching analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedService, selectedStaff, selectedCentre]);

  const handleApplyCustomDate = () => {
    if (!customStart || !customEnd) {
      onNotification({ type: 'error', text: 'Please select both start and end date for custom range.' });
      return;
    }
    fetchAnalytics();
  };

  const s = data?.summary;
  const q = data?.queueAnalytics;
  const p = data?.procurementAnalytics;
  const si = data?.salesAndInventory;
  const ca = data?.complaintAnalytics;

  return (
    <div className="space-y-6">
      {/* 1. Header & Unified Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Kendra Analytics & Intelligence Center
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real MongoDB operational intelligence, queue service metrics, procurement volume, and sales trends.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Date Range Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-700" />
              <span>Date Filter</span>
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-700" />
              <span>Service</span>
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Services (Entire Kendra)</option>
              {data?.filterOptions?.services?.map((srv) => (
                <option key={srv.id} value={srv.name}>{srv.name}</option>
              ))}
            </select>
          </div>

          {/* Staff Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-700" />
              <span>Staff Desk</span>
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Staff Members</option>
              {data?.filterOptions?.staff?.map((st) => (
                <option key={st.id} value={st.name}>{st.name}</option>
              ))}
            </select>
          </div>

          {/* Centre Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Tractor className="w-3 h-3 text-emerald-700" />
              <span>Centre</span>
            </label>
            <select
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Centres</option>
              {data?.filterOptions?.centres?.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Inputs (when 'custom' selected) */}
        {dateRange === 'custom' && (
          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-900">Start Date:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-slate-800 font-medium text-xs focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-900">End Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-slate-800 font-medium text-xs focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <button
              onClick={handleApplyCustomDate}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}

        {/* Period Badge */}
        {data?.filtersApplied && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>
              Active Filter: <strong className="text-emerald-800 font-semibold">{data.filtersApplied.rangeLabel}</strong>
              {selectedService !== 'ALL' && ` • Service: ${selectedService}`}
              {selectedStaff !== 'ALL' && ` • Staff: ${selectedStaff}`}
            </span>
            <span className="text-slate-400">Updates live from MongoDB collection aggregations</span>
          </div>
        )}
      </div>

      {/* 2. Navigation Pills for Specialized Analytics Views */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSection('overview')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'overview'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Executive Overview</span>
        </button>

        <button
          onClick={() => setActiveSection('ai')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'ai'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>AI Insights & Crowd</span>
        </button>

        <button
          onClick={() => setActiveSection('queue')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'queue'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Queue & Delivery Analytics</span>
        </button>

        <button
          onClick={() => setActiveSection('procurement')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'procurement'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Wheat className="w-3.5 h-3.5" />
          <span>Procurement Analytics</span>
        </button>

        <button
          onClick={() => setActiveSection('sales')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'sales'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Sales & Inventory Analytics</span>
        </button>

        <button
          onClick={() => setActiveSection('complaints')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'complaints'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Grievances & Farmer Rating</span>
        </button>
      </div>

      {/* Loading & Error Indicators */}
      {loading && !data && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <RotateCw className="w-8 h-8 mx-auto text-emerald-700 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-800">Calculating MongoDB Analytics Aggregations...</p>
          <p className="text-xs text-slate-500 mt-1">Compiling queue volume, sales invoices, stock levels, and procurement records.</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-xs text-rose-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-bold">Analytics Aggregation Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 3. SECTION CONTENT */}
      {data && (
        <>
          {/* SECTION 0: DEDICATED AI INSIGHTS & CROWD INTELLIGENCE */}
          {activeSection === 'ai' && (
            <div className="space-y-6">
              <AdminAiInsightsCard token={token} queryParams={currentQueryParams} onNotification={onNotification} />
            </div>
          )}

          {/* SECTION 1: EXECUTIVE OVERVIEW (ALL 12 METRICS FROM USER REQUIREMENT 1) */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* AI Operational Intelligence Summary Card */}
              <AdminAiInsightsCard token={token} queryParams={currentQueryParams} onNotification={onNotification} />

              {/* Primary 12-Card Grid covering:
                  - Total Farmers
                  - Today's Tokens
                  - Completed / Waiting / Cancelled
                  - Average Waiting Time
                  - Average Service Time
                  - Peak Hours
                  - Procurement Quantity & Value
                  - Pending / Paid Payments
                  - Sales Revenue
                  - Purchase Value
                  - Current / Low Stock
                  - Open / Resolved Complaints
              */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* 1. Total Farmers */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Total Farmers</span>
                    <Tractor className="w-4 h-4 text-emerald-700" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-2">
                    {s?.totalFarmers || 0}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Verified registered farmers
                  </p>
                </div>

                {/* 2. Today's Tokens */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Today's Tokens</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-900 mt-2">
                    {s?.todayTokens || 0}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Issued today ({s?.totalTokens || 0} in filter)
                  </p>
                </div>

                {/* 3. Completed / Waiting / Cancelled */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Token Statuses</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold text-emerald-700 font-mono" title="Completed">
                      {s?.completedTokens || 0}
                    </span>
                    <span className="text-xs text-slate-400">/</span>
                    <span className="text-lg font-bold text-amber-600 font-mono" title="Waiting">
                      {s?.waitingTokens || 0}
                    </span>
                    <span className="text-xs text-slate-400">/</span>
                    <span className="text-lg font-bold text-rose-600 font-mono" title="Cancelled">
                      {s?.cancelledTokens || 0}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Completed / Waiting / Cancelled
                  </p>
                </div>

                {/* 4. Average Waiting Time */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Avg Waiting Time</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-900 mt-2">
                    {s?.avgWaitingTime || 0} <span className="text-sm font-normal text-slate-500">min</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    From token issue to counter call
                  </p>
                </div>

                {/* 5. Average Service Time */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Avg Service Time</span>
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-900 mt-2">
                    {s?.avgServiceTime || 0} <span className="text-sm font-normal text-slate-500">min</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Counter resolution duration
                  </p>
                </div>

                {/* 6. Peak Hours */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Peak Hours</span>
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-purple-900 mt-2 truncate">
                    {s?.peakHours || 'N/A'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Highest farmer footfall window
                  </p>
                </div>

                {/* 7. Procurement Quantity & Value */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Procurement Intake</span>
                    <Wheat className="w-4 h-4 text-amber-700" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-2">
                    {s?.procurementQuantity || 0} <span className="text-sm font-normal text-slate-500">Qtl</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                    Value: ₹{(s?.procurementValue || 0).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* 8. Pending / Paid Payments */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Procurement Payments</span>
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-bold text-emerald-800">
                      Paid: ₹{(s?.paidPaymentsValue || 0).toLocaleString('en-IN')} ({s?.paidPaymentsCount || 0})
                    </p>
                    <p className="text-xs font-semibold text-amber-700 mt-0.5">
                      Pending: ₹{(s?.pendingPaymentsValue || 0).toLocaleString('en-IN')} ({s?.pendingPaymentsCount || 0})
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    MSP Direct DBT settlements
                  </p>
                </div>

                {/* 9. Sales Revenue */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Sales Revenue</span>
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-900 mt-2">
                    ₹{(s?.salesRevenue || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {s?.salesCount || 0} cash/UPI invoices billed
                  </p>
                </div>

                {/* 10. Purchase Value */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Inward Purchases</span>
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-900 mt-2">
                    ₹{(s?.purchaseValue || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {s?.purchasesCount || 0} wholesale supply lots
                  </p>
                </div>

                {/* 11. Current / Low Stock */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Warehouse Inventory</span>
                    <Boxes className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-2">
                    {s?.currentStockTotal || 0} <span className="text-sm font-normal text-slate-500">units</span>
                  </p>
                  <p className="text-[11px] text-amber-700 font-semibold mt-1">
                    {s?.lowStockCount || 0} low stock warnings ({s?.totalProducts || 0} catalog SKUs)
                  </p>
                </div>

                {/* 12. Open / Resolved Complaints */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Farmer Grievances</span>
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold text-amber-700 font-mono" title="Open Grievances">
                      {s?.openComplaints || 0} Open
                    </span>
                    <span className="text-xs text-slate-400">/</span>
                    <span className="text-lg font-bold text-emerald-700 font-mono" title="Resolved">
                      {s?.resolvedComplaints || 0} Solved
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Avg rating: {ca?.avgFarmerRating || 5.0} ★ ({ca?.totalVolume || 0} total)
                  </p>
                </div>
              </div>

              {/* Overview Visual Strip: Peak Hours & Service Demand */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly Footfall Meter */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-heading">
                        Peak Hour Footfall Distribution
                      </h3>
                      <p className="text-xs text-slate-500">
                        Hourly token generation across active Kendra hours (08:00 to 18:00)
                      </p>
                    </div>
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                      {s?.peakHours}
                    </span>
                  </div>

                  <div className="h-44 flex items-end justify-between gap-1.5 pt-4 border-b border-slate-100">
                    {q?.peakHours?.map((item) => {
                      const maxCount = Math.max(...(q.peakHours.map(x => x.count) || [1]), 1);
                      const heightPct = Math.max(8, Math.round((item.count / maxCount) * 100));
                      const isPeak = item.count === maxCount && item.count > 0;
                      return (
                        <div key={item.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
                            {item.count} tokens ({item.label})
                          </div>
                          <div
                            className={`w-full rounded-t-lg transition-all ${
                              isPeak 
                                ? 'bg-purple-600 shadow-xs' 
                                : item.count > 0 
                                ? 'bg-emerald-600/80 hover:bg-emerald-600' 
                                : 'bg-slate-100'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[10px] font-medium text-slate-500 rotate-45 origin-left sm:rotate-0 mt-1">
                            {item.label.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Service Demand Breakdown */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-heading">
                        Service Demand Distribution
                      </h3>
                      <p className="text-xs text-slate-500">
                        Farmer volume share by government & Kendra agriculture services
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {q?.serviceDemand && q.serviceDemand.length > 0 ? (
                      q.serviceDemand.map((srv, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-800">{srv.serviceName}</span>
                            <span className="font-mono text-slate-500">{srv.count} tokens ({srv.percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.max(4, srv.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No token records found for selected filter.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: QUEUE ANALYTICS (USER REQUIREMENT 3) */}
          {activeSection === 'queue' && (
            <div className="space-y-6">
              {/* Top Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Average Waiting Time</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-3xl font-extrabold font-mono text-amber-800 mt-2">
                    {q?.avgWaitingTimeMinutes || 0} <span className="text-sm font-normal text-slate-500">minutes</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Average time in queue before call</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Average Service Time</span>
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-extrabold font-mono text-emerald-800 mt-2">
                    {q?.avgServiceTimeMinutes || 0} <span className="text-sm font-normal text-slate-500">minutes</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Time spent at counter desk</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Completion Rate</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-extrabold font-mono text-emerald-700 mt-2">
                    {q?.completionRate || 0}%
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{s?.completedTokens || 0} out of {s?.totalTokens || 0} completed</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Cancellation / Skip Rate</span>
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  </div>
                  <p className="text-3xl font-extrabold font-mono text-rose-700 mt-2">
                    {q?.cancellationRate || 0}%
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{s?.cancelledTokens || 0} tokens cancelled or skipped</p>
                </div>
              </div>

              {/* Daily Token Volume Table & Chart */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      Daily Token Volume & Resolution
                    </h3>
                    <p className="text-xs text-slate-500">
                      Day-by-day distribution of farmer tokens created, completed, and skipped
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                    Total: {s?.totalTokens || 0} tokens in range
                  </span>
                </div>

                {q?.dailyTokenVolume && q.dailyTokenVolume.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Total Tokens</th>
                          <th className="py-2.5 px-3 text-right">Completed</th>
                          <th className="py-2.5 px-3 text-right">Cancelled / Skipped</th>
                          <th className="py-2.5 px-3">Resolution Ratio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {q.dailyTokenVolume.map((row, i) => {
                          const pct = row.count > 0 ? Math.round((row.completed / row.count) * 100) : 0;
                          return (
                            <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{row.label} ({row.date})</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{row.count}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">{row.completed}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">{row.cancelled}</td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[11px] font-mono text-slate-600">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No token history found for selected date filter.</p>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: PROCUREMENT ANALYTICS (USER REQUIREMENT 4) */}
          {activeSection === 'procurement' && (
            <div className="space-y-6">
              {/* AI Procurement Intelligence Card */}
              <ProcurementIntelligenceCard token={token} queryParams={currentQueryParams} onNotification={onNotification} />

              {/* Metric Highlights */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Accepted Quantity</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-extrabold font-mono text-emerald-800 mt-2">
                    {p?.acceptedQuantity || 0} <span className="text-sm font-normal text-slate-500">Qtl</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Rejected: {p?.rejectedQuantity || 0} Qtl
                  </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Total Procurement Value</span>
                    <IndianRupee className="w-4 h-4 text-emerald-700" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-2">
                    ₹{(p?.procurementValue || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">MSP calculated purchase amount</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Average Moisture</span>
                    <Percent className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-3xl font-extrabold font-mono text-blue-800 mt-2">
                    {p?.avgMoisture || 0}%
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Government limit: 12% - 14%</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>DBT Payment Status</span>
                    <CreditCard className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-bold text-emerald-800">
                      Paid: ₹{(p?.paymentStatus?.paidAmount || 0).toLocaleString('en-IN')} ({p?.paymentStatus?.paidCount || 0})
                    </p>
                    <p className="text-xs font-bold text-amber-700 mt-0.5">
                      Pending: ₹{(p?.paymentStatus?.pendingAmount || 0).toLocaleString('en-IN')} ({p?.paymentStatus?.pendingCount || 0})
                    </p>
                  </div>
                </div>
              </div>

              {/* Produce-wise Table */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Produce-wise Intake & Quality Valuation
                </h3>
                {p?.produceWise && p.produceWise.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Crop / Produce</th>
                          <th className="py-2.5 px-3 text-right">Lots</th>
                          <th className="py-2.5 px-3 text-right">Net Wt (Qtl)</th>
                          <th className="py-2.5 px-3 text-right">Accepted (Qtl)</th>
                          <th className="py-2.5 px-3 text-right">Rejected (Qtl)</th>
                          <th className="py-2.5 px-3 text-right">Total Payable (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {p.produceWise.map((crop, i) => (
                          <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{crop.cropName}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">{crop.count}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{crop.netWeight}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">{crop.acceptedQuantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">{crop.rejectedQuantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-900">₹{crop.totalValue.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No procurement records found for selected period.</p>
                )}
              </div>

              {/* Quality Grades Strip */}
              {p?.qualityGrades && p.qualityGrades.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    Quality Inspection Grades Distribution
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {p.qualityGrades.map((g, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">{g.grade}</span>
                        <p className="text-xl font-extrabold text-slate-900 font-mono mt-1">{g.count} <span className="text-xs font-normal text-slate-500">lots</span></p>
                        <p className="text-[11px] text-emerald-700 font-semibold">{g.quantity} Qtl accepted</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: SALES & INVENTORY (USER REQUIREMENT 5) */}
          {activeSection === 'sales' && (
            <div className="space-y-6">
              {/* AI Inventory & Turnover Intelligence Card */}
              <InventoryIntelligenceCard token={token} queryParams={currentQueryParams} onNotification={onNotification} />

              {/* Purchase vs Sales Comparison Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      Purchase vs Sales Performance
                    </h3>
                    <p className="text-xs text-slate-500">
                      Wholesale input procurement expenditure compared against retail sales revenue
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                    (si?.purchaseVsSales?.netMargin || 0) >= 0 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    Net Margin: ₹{(si?.purchaseVsSales?.netMargin || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80">
                    <span className="text-xs text-blue-700 font-semibold">Wholesale Inward Purchases</span>
                    <p className="text-2xl font-extrabold font-mono text-blue-950 mt-1">
                      ₹{(si?.purchaseVsSales?.purchaseTotal || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-blue-600 mt-0.5">{si?.purchaseVsSales?.purchaseCount || 0} purchase invoices</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80">
                    <span className="text-xs text-emerald-700 font-semibold">Farmer Retail Sales</span>
                    <p className="text-2xl font-extrabold font-mono text-emerald-950 mt-1">
                      ₹{(si?.purchaseVsSales?.salesTotal || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">{si?.purchaseVsSales?.salesCount || 0} POS cash memos</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80">
                    <span className="text-xs text-purple-700 font-semibold">Inventory Movements Recorded</span>
                    <p className="text-2xl font-extrabold font-mono text-purple-950 mt-1">
                      {si?.stockMovementSummary?.totalMovements || 0} <span className="text-xs font-normal text-slate-500">events</span>
                    </p>
                    <p className="text-[11px] text-purple-600 mt-0.5">
                      {si?.stockMovementSummary?.purchases || 0} Inward / {si?.stockMovementSummary?.sales || 0} Outward
                    </p>
                  </div>
                </div>
              </div>

              {/* Two Column Strip: Top Selling Products & Low Stock Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling Products */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    Top-Selling Agricultural Products
                  </h3>
                  {si?.topSellingProducts && si.topSellingProducts.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {si.topSellingProducts.map((p, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{p.name}</p>
                            <span className="text-[11px] font-mono text-slate-400">SKU: {p.code} • {p.quantity} units sold</span>
                          </div>
                          <span className="font-bold font-mono text-emerald-800">
                            ₹{p.revenue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">No sales records in selected period.</p>
                  )}
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      Critical Low-Stock Watchlist
                    </h3>
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                      {s?.lowStockCount || 0} items below threshold
                    </span>
                  </div>

                  {si?.lowStockProducts && si.lowStockProducts.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {si.lowStockProducts.map((p, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{p.name}</p>
                            <span className="text-[11px] text-slate-500">Threshold: {p.minThreshold} {p.unit}</span>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold rounded-lg text-[11px]">
                              {p.stock} {p.unit} remaining
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">All catalog items have healthy stock levels.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: COMPLAINT ANALYTICS (USER REQUIREMENT 6) */}
          {activeSection === 'complaints' && (
            <div className="space-y-6">
              {/* Highlight Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Total Grievances</span>
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-3xl font-extrabold font-mono text-slate-900 mt-2">
                    {ca?.totalVolume || 0}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Logged in MongoDB</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Open / Pending</span>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-3xl font-extrabold font-mono text-amber-800 mt-2">
                    {ca?.openCount || 0}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Requires Kendra officer action</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Resolved / Closed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-extrabold font-mono text-emerald-800 mt-2">
                    {ca?.resolvedCount || 0}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Successfully redressed</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Average Farmer Rating</span>
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  </div>
                  <p className="text-3xl font-extrabold font-mono text-slate-900 mt-2 flex items-center gap-1.5">
                    {ca?.avgFarmerRating || 5.0} <span className="text-sm font-normal text-amber-600">/ 5.0</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Based on farmer service feedback</p>
                </div>
              </div>

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    Grievance Category Distribution
                  </h3>
                  <div className="space-y-3">
                    {ca?.categoryDistribution?.map((cat, idx) => {
                      const pct = ca.totalVolume > 0 ? Math.round((cat.count / ca.totalVolume) * 100) : 0;
                      return (
                        <div key={idx} className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-800">{cat.category}</span>
                            <span className="font-mono text-slate-500">{cat.count} cases ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.max(5, pct)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Breakdown */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    Grievance Urgency & Priority Breakdown
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {ca?.priorityBreakdown?.map((p, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <span className={`text-[11px] font-bold uppercase ${
                          p.priority === 'urgent' ? 'text-rose-700' :
                          p.priority === 'high' ? 'text-amber-700' :
                          'text-slate-600'
                        }`}>
                          {p.priority} Priority
                        </span>
                        <p className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
                          {p.count}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Reported by farmers</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
