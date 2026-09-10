import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { safeFetchJson } from '../utils/api.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { AdminStaffTab } from './admin/AdminStaffTab.tsx';
import { AdminFarmersTab } from './admin/AdminFarmersTab.tsx';
import { AdminServicesTab } from './admin/AdminServicesTab.tsx';
import { AdminProductsTab } from './admin/AdminProductsTab.tsx';
import { AdminRateListTab } from './admin/AdminRateListTab.tsx';
import { AdminInventoryTab } from './admin/AdminInventoryTab.tsx';
import { AdminQueueTab } from './admin/AdminQueueTab.tsx';
import { AdminSalesTab } from './admin/AdminSalesTab.tsx';
import { AdminPaymentsTab } from './admin/AdminPaymentsTab.tsx';
import { AdminReportsTab } from './admin/AdminReportsTab.tsx';
import { AdminProcurementTab } from './admin/AdminProcurementTab.tsx';
import { 
  LayoutDashboard,
  Users,
  Tractor,
  Layers,
  Package,
  IndianRupee,
  Boxes,
  Clock,
  Receipt,
  CreditCard,
  FileText,
  RotateCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  ArrowRight,
  Database,
  Sparkles,
  Wheat
} from 'lucide-react';

export type AdminTab = 
  | 'dashboard'
  | 'staff'
  | 'farmers'
  | 'services'
  | 'products'
  | 'rates'
  | 'inventory'
  | 'queue'
  | 'sales'
  | 'payments'
  | 'procurement'
  | 'reports';

interface AdminStats {
  totalFarmers: number;
  totalStaff: number;
  activeStaff: number;
  totalTokens: number;
  waitingTokens: number;
  servingTokens: number;
  completedTokens: number;
  skippedTokens: number;
  todayTokens: number;
  totalProducts: number;
  lowStockProducts: number;
  todaySalesTotal: number;
  todaySalesCount: number;
  serviceDistribution?: Array<{ name: string; count: number }>;
  dbStatus?: {
    connected: boolean;
    type: string;
    message: string;
  };
}

export const AdminDashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await safeFetchJson<AdminStats>('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok && res.data) {
        setStats(res.data);
        setStatsError(null);
      } else {
        setStatsError(res.error || 'Failed to load live metrics from MongoDB.');
      }
    } catch (err: any) {
      console.warn('Admin stats sync error:', err);
      setStatsError(err?.message || 'Connection error while loading stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, [token]);

  const showNotification = (notif: { type: 'success' | 'error'; text: string }) => {
    setNotification(notif);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const navTabs: Array<{ id: AdminTab; label: string; icon: any; badge?: number | string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'staff', label: 'Staff', icon: Users, badge: stats?.totalStaff },
    { id: 'farmers', label: 'Farmers', icon: Tractor, badge: stats?.totalFarmers },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'products', label: 'Products', icon: Package, badge: stats?.totalProducts },
    { id: 'rates', label: 'Rate List', icon: IndianRupee },
    { id: 'inventory', label: 'Inventory', icon: Boxes, badge: stats?.lowStockProducts ? `${stats.lowStockProducts} alert` : undefined },
    { id: 'queue', label: 'Queue', icon: Clock, badge: stats?.waitingTokens ? `${stats.waitingTokens} waiting` : undefined },
    { id: 'sales', label: 'Sales', icon: Receipt },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'procurement', label: 'Procurement (Phase 4)', icon: Wheat },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Admin Panel Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-heading">Kisan Kendra Administration</h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                Full Control
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Logged in as <strong className="text-white">{user?.name || 'Administrator'}</strong> • Authorized Kendra Manager
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-[11px] text-emerald-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>MongoDB Atlas Active</span>
          </div>

          <button
            onClick={() => {
              fetchStats();
              showNotification({ type: 'success', text: 'Dashboard metrics refreshed from MongoDB' });
            }}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
            title="Refresh All Statistics"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto">
        <nav className="flex items-center gap-1 min-w-max">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                    isSelected
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {statsError && !stats && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{statsError}</span>
                </div>
                <button
                  onClick={() => {
                    setLoading(true);
                    fetchStats();
                  }}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {loading && !stats && (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Synchronizing live operational metrics from MongoDB Atlas...</span>
              </div>
            )}

            {/* Quick Live Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => setActiveTab('queue')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span>Waiting Tokens</span>
                  <Clock className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-3xl font-extrabold font-mono text-blue-900 mt-2">
                  {stats?.waitingTokens || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {stats?.servingTokens || 0} currently at counter desks
                </p>
              </div>

              <div 
                onClick={() => setActiveTab('sales')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span>Today's Sales</span>
                  <IndianRupee className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-3xl font-extrabold font-mono text-emerald-900 mt-2">
                  ₹{(stats?.todaySalesTotal || 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {stats?.todaySalesCount || 0} invoices billed today
                </p>
              </div>

              <div 
                onClick={() => setActiveTab('farmers')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span>Registered Farmers</span>
                  <Tractor className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-3xl font-extrabold font-mono text-slate-900 mt-2">
                  {stats?.totalFarmers || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Verified with 10-digit mobile
                </p>
              </div>

              <div 
                onClick={() => setActiveTab('inventory')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span>Low Stock Warnings</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-3xl font-extrabold font-mono text-amber-700 mt-2">
                  {stats?.lowStockProducts || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Out of {stats?.totalProducts || 0} catalog products
                </p>
              </div>
            </div>

            {/* Quick Management Shortcuts */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 font-heading">
                Kendra Administrative Modules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab('staff')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mt-3">Staff Management</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Manage {stats?.totalStaff || 0} staff members, assign counters 1-6, and toggle status.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('farmers')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Tractor className="w-4 h-4" />
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mt-3">Farmer Directory</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Review {stats?.totalFarmers || 0} registered farmers, view token and purchase histories.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('rates')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <IndianRupee className="w-4 h-4" />
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mt-3">Official Rate List</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Update product selling rates with recorded audit logs and previous invoice protection.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('inventory')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Boxes className="w-4 h-4" />
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mt-3">Warehouse Inventory</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Stock health monitors, reorder thresholds, and quick stock adjustment controls.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('payments')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mt-3">Payments & Settlement</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cash drawer reconciliation, UPI digital collections breakdown, and daily totals.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mt-3">Official Daily Report</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Generate, export, or print daily operational summaries for government records.
                  </p>
                </button>
              </div>
            </div>

            {/* Service Distribution Bar */}
            {stats?.serviceDistribution && stats.serviceDistribution.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3 font-heading">
                  Service Request Distribution
                </h3>
                <div className="space-y-3">
                  {stats.serviceDistribution.map((item, idx) => {
                    const totalT = stats.totalTokens || 1;
                    const pct = Math.round((item.count / totalT) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-800">{item.name}</span>
                          <span className="font-mono text-slate-500">{item.count} tokens ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <ErrorBoundary fallbackTitle="Staff Management View Error" fallbackMessage="An error occurred while loading the Staff directory. Click retry to refresh.">
            <AdminStaffTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}

        {activeTab === 'farmers' && (
          <ErrorBoundary fallbackTitle="Farmers Directory View Error" fallbackMessage="An error occurred while loading the Farmers directory. Click retry to refresh.">
            <AdminFarmersTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}

        {activeTab === 'services' && (
          <ErrorBoundary fallbackTitle="Services Configuration Error" fallbackMessage="An error occurred while loading Kendra services. Click retry to refresh.">
            <AdminServicesTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}

        {activeTab === 'products' && (
          <ErrorBoundary fallbackTitle="Products Catalog Error" fallbackMessage="An error occurred while loading products. Click retry to refresh.">
            <AdminProductsTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}

        {activeTab === 'rates' && (
          <ErrorBoundary fallbackTitle="Rate List Error" fallbackMessage="An error occurred while loading the rate list. Click retry to refresh.">
            <AdminRateListTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}

        {activeTab === 'inventory' && (
          <ErrorBoundary fallbackTitle="Inventory Register Error" fallbackMessage="An error occurred while loading inventory stock. Click retry to refresh.">
            <AdminInventoryTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}

        {activeTab === 'queue' && (
          <ErrorBoundary fallbackTitle="Queue Monitor Error" fallbackMessage="An error occurred while loading the queue monitor. Click retry to refresh.">
            <AdminQueueTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}

        {activeTab === 'sales' && (
          <ErrorBoundary fallbackTitle="Sales Audit Error" fallbackMessage="An error occurred while loading sales audit. Click retry to refresh.">
            <AdminSalesTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}

        {activeTab === 'payments' && (
          <ErrorBoundary fallbackTitle="Payments Settlement Error" fallbackMessage="An error occurred while loading payments. Click retry to refresh.">
            <AdminPaymentsTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}

        {activeTab === 'procurement' && (
          <ErrorBoundary fallbackTitle="Farmer Procurement Error" fallbackMessage="An error occurred while loading the procurement desk. Click retry to refresh.">
            <AdminProcurementTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}

        {activeTab === 'reports' && (
          <ErrorBoundary fallbackTitle="Daily Reports Error" fallbackMessage="An error occurred while generating daily reports. Click retry to refresh.">
            <AdminReportsTab token={token || ''} onNotification={showNotification} />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};
