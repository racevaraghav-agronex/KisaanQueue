import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/api.ts';
import {
  Boxes,
  RotateCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  PackageX,
  PackageCheck,
  History,
  Sparkles,
  Info,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';

interface InventoryIntelligenceCardProps {
  token: string;
  queryParams?: string;
  onNotification?: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const InventoryIntelligenceCard: React.FC<InventoryIntelligenceCardProps> = ({
  token,
  queryParams = '',
  onNotification
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const queryPrefix = queryParams ? `${queryParams}&` : '';
      const url = `/api/admin/inventory-intelligence?${queryPrefix}${force ? 'refresh=true' : ''}`;

      const res = await safeFetchJson(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.error && !res.data) {
        throw new Error(res.error);
      }

      setData(res.data || null);

      if (force && onNotification) {
        onNotification({
          type: 'success',
          text: 'Inventory intelligence refreshed with verified MongoDB product records.'
        });
      }
    } catch (err: any) {
      console.error('Failed to load inventory intelligence:', err);
      setError(err.message || 'Unable to retrieve inventory intelligence');
      if (force && onNotification) {
        onNotification({
          type: 'error',
          text: 'Failed to refresh inventory intelligence: ' + (err.message || 'Network error')
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, [token, queryParams]);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl"></div>
            <div>
              <div className="w-48 h-4 bg-slate-200 rounded"></div>
              <div className="w-32 h-3 bg-slate-100 rounded mt-1.5"></div>
            </div>
          </div>
          <div className="w-24 h-8 bg-slate-100 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="h-20 bg-slate-50 rounded-2xl"></div>
          <div className="h-20 bg-slate-50 rounded-2xl"></div>
          <div className="h-20 bg-slate-50 rounded-2xl"></div>
          <div className="h-20 bg-slate-50 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;
  const fastMoving = data?.fastMovingProducts || [];
  const slowMoving = data?.slowMovingProducts || [];
  const stockRisks = data?.stockRiskAlerts || [];
  const recommendations = data?.advisoryRecommendations || [];
  const adjustments = data?.recentManualAdjustments || [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                AI Inventory & Turnover Intelligence
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Phase 8B Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Stock velocities, replenishment risk, and manual adjustment audits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-[11px] text-slate-500 font-mono hidden md:block">
            {data?.source === 'gemini' ? 'Gemini 3.8 Flash' : 'Deterministic Synthesis'}
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-xs font-semibold text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Executive Brief Banner */}
      {data?.executiveBrief && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Inventory Executive Synthesis</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {data.executiveBrief}
          </p>
        </div>
      )}

      {/* 4-Card Summary Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500">Catalog Inventory</div>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {metrics.totalCatalogItems} <span className="text-xs font-bold text-slate-600">items</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {metrics.totalStockUnits} units in stock
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500">Depletion / Shortage</div>
            <div className={`text-base sm:text-lg font-black mt-0.5 ${metrics.stockOutCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {metrics.stockOutCount} <span className="text-xs font-bold text-slate-600">out of stock</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {metrics.lowStockCount} below minimum threshold
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500">Retail Sales Turnover</div>
            <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
              {metrics.totalSalesUnits} <span className="text-xs font-bold text-slate-600">units sold</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              ₹{metrics.totalSalesRevenue.toLocaleString('en-IN')} revenue
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500">Restock vs Sales Delta</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-base sm:text-lg font-black ${metrics.netStockMovementUnits >= 0 ? 'text-emerald-700' : 'text-amber-600'}`}>
                {metrics.netStockMovementUnits >= 0 ? `+${metrics.netStockMovementUnits}` : metrics.netStockMovementUnits}
              </span>
              {metrics.netStockMovementUnits >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {metrics.totalPurchasedUnits} purchased vs {metrics.totalSalesUnits} sold
            </div>
          </div>
        </div>
      )}

      {/* Stock Risk & Reorder Alerts */}
      {stockRisks.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Critical Stock Shortage & Reorder Warnings</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">
              Threshold benchmarks from catalog
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {stockRisks.slice(0, 6).map((risk: any, idx: number) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border transition-all ${
                  risk.urgency === 'critical_out_of_stock'
                    ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                    : risk.urgency === 'below_threshold'
                    ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs truncate">{risk.name}</div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                    risk.urgency === 'critical_out_of_stock'
                      ? 'bg-rose-200 text-rose-900'
                      : risk.urgency === 'below_threshold'
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-slate-200 text-slate-800'
                  }`}>
                    {risk.urgency.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-black/5">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Current Stock</span>
                    <span className="font-black text-sm">{risk.currentStock} {risk.unit}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Min Threshold</span>
                    <span className="font-semibold text-xs text-slate-600">{risk.minThreshold} {risk.unit}</span>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-slate-500">
                  Target replenishment: <span className="font-bold text-slate-700">{risk.recommendedReorderTarget} {risk.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fast-Moving vs Slow-Moving Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Fast Moving */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fast-Moving Products (High Velocity)</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Velocity/Day</span>
          </div>

          {fastMoving.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-3 text-center">
              No product sales recorded in the selected period.
            </div>
          ) : (
            <div className="space-y-2">
              {fastMoving.map((item: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-[11px] text-slate-500">
                      Stock: <span className="font-semibold text-slate-700">{item.currentStock} {item.unit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-700">{item.salesQuantity} {item.unit} sold</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ~{item.salesVelocityPerDay} units/day
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slow Moving */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <PackageX className="w-3.5 h-3.5 text-slate-500" />
              <span>Slow-Moving / Low Turnover Items</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Stock Held</span>
          </div>

          {slowMoving.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-3 text-center">
              All catalog items have recorded active turnover.
            </div>
          ) : (
            <div className="space-y-2">
              {slowMoving.map((item: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-[11px] text-slate-500">
                      Category: <span className="text-slate-600">{item.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-700">{item.currentStock} {item.unit}</div>
                    <div className="text-[10px] text-amber-600 font-medium">
                      {item.salesQuantity === 0 ? '0 sales in period' : `${item.salesQuantity} sold`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Stock Adjustments Audit */}
      {adjustments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Recent Manual Stock Register Adjustments</span>
            </h4>
            <span className="text-[10px] text-slate-400">
              Audit log from StockMovement
            </span>
          </div>

          <div className="space-y-1.5">
            {adjustments.slice(0, 3).map((adj: any, idx: number) => (
              <div key={idx} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{adj.productName}: </span>
                  <span className={`font-mono font-bold ${adj.quantity >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {adj.quantity >= 0 ? `+${adj.quantity}` : adj.quantity}
                  </span>
                  <span className="text-slate-500 ml-2">by {adj.performedBy}</span>
                  {adj.notes && <span className="text-slate-400 italic ml-2 text-[11px]">({adj.notes})</span>}
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{adj.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advisory Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Inventory Advisory & Actions</span>
            </h4>
            <span className="text-[10px] text-slate-500 italic">
              Advisory only • Purchase orders require staff submission
            </span>
          </div>

          <div className="space-y-2">
            {recommendations.map((rec: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 mt-0.5 ${
                    rec.priority === 'high'
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : rec.priority === 'medium'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {rec.category}
                  </span>
                  <span className="text-slate-700 font-medium">
                    {rec.recommendation}
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold shrink-0">
                  {rec.priority} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety & Compliance Disclaimer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>AI generates replenishment suggestions only. The system never automatically creates purchase orders, modifies quantities, or alters pricing.</span>
        </span>
        <span className="font-mono text-slate-600 shrink-0 ml-2">
          {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Live'}
        </span>
      </div>
    </div>
  );
};
