import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/api.ts';
import {
  Sparkles,
  RotateCw,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Wheat,
  IndianRupee,
  Boxes,
  Users,
  Activity,
  Info,
  ShieldAlert,
  ArrowRight,
  MapPin
} from 'lucide-react';
import { ProcurementIntelligenceCard } from './ProcurementIntelligenceCard.tsx';
import { InventoryIntelligenceCard } from './InventoryIntelligenceCard.tsx';
import { AnomalyDetectionCard } from './AnomalyDetectionCard.tsx';
import { StaffRecommendationCard } from './StaffRecommendationCard.tsx';
import { KendraRecommendationCard } from './KendraRecommendationCard.tsx';

interface AdminAiInsightsCardProps {
  token: string;
  queryParams?: string;
  initialSubTab?: 'overview' | 'procurement' | 'inventory' | 'anomalies' | 'staff_rec' | 'kendra_rec';
  onNotification?: (notif: { type: 'success' | 'error'; text: string }) => void;
  onNavigateToStaffTab?: () => void;
}

export const AdminAiInsightsCard: React.FC<AdminAiInsightsCardProps> = ({
  token,
  queryParams = '',
  initialSubTab = 'overview',
  onNotification,
  onNavigateToStaffTab
}) => {
  const [subTab, setSubTab] = useState<'overview' | 'procurement' | 'inventory' | 'anomalies' | 'staff_rec' | 'kendra_rec'>(initialSubTab);
  const [insights, setInsights] = useState<any>(null);
  const [crowd, setCrowd] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const urlSuffix = force ? '?refresh=true' : '';
      const [insightsRes, crowdRes] = await Promise.all([
        safeFetchJson(`/api/admin/ai-insights${urlSuffix}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        safeFetchJson(`/api/admin/crowd-intelligence${urlSuffix}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (insightsRes.error && !insightsRes.data) {
        throw new Error(insightsRes.error);
      }

      setInsights(insightsRes.data || null);
      setCrowd(crowdRes.data || null);

      if (force && onNotification) {
        onNotification({
          type: 'success',
          text: 'AI Operational Insights refreshed with latest MongoDB records.'
        });
      }
    } catch (err: any) {
      console.error('Failed to load AI insights:', err);
      setError(err.message || 'Unable to retrieve AI insights');
      if (force && onNotification) {
        onNotification({
          type: 'error',
          text: 'Failed to refresh AI insights: ' + (err.message || 'Network error')
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, [token]);

  const getPressureBadge = (pressure: string) => {
    switch (pressure) {
      case 'High':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">High Pressure</span>;
      case 'Moderate':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Moderate Load</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Optimal / Low</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation Tabs for AI Intelligence Suite */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSubTab('overview')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            subTab === 'overview'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Operational & Crowd AI</span>
        </button>

        <button
          onClick={() => setSubTab('procurement')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            subTab === 'procurement'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Wheat className="w-3.5 h-3.5 text-emerald-600" />
          <span>Procurement Intelligence</span>
          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">8B</span>
        </button>

        <button
          onClick={() => setSubTab('inventory')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            subTab === 'inventory'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Boxes className="w-3.5 h-3.5 text-indigo-600" />
          <span>Inventory & Turnover AI</span>
          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">8B</span>
        </button>

        <button
          onClick={() => setSubTab('anomalies')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            subTab === 'anomalies'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          <span>Operational Anomaly Audit</span>
          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold bg-rose-100 text-rose-800 border border-rose-200">8B</span>
        </button>

        <button
          onClick={() => setSubTab('staff_rec')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            subTab === 'staff_rec'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>Smart Staff / Counter</span>
          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">8C</span>
        </button>

        <button
          onClick={() => setSubTab('kendra_rec')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            subTab === 'kendra_rec'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-teal-600" />
          <span>Smart Kendra Rec</span>
          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold bg-teal-100 text-teal-800 border border-teal-200">8C</span>
        </button>
      </div>

      {/* VIEW 1: Overview & Crowd (Batch 8A + Quick Jump Links) */}
      {subTab === 'overview' && (
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-3xl p-6 shadow-md border border-emerald-800/40">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-emerald-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Kisan AI Operational Intelligence
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Phase 8 Live
                  </span>
                </div>
                <p className="text-xs text-emerald-200/70 mt-0.5">
                  Strictly grounded analysis generated from real MongoDB center metrics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="text-[11px] text-emerald-300/80 font-mono hidden md:block">
                {insights?.source === 'gemini' ? 'Gemini 3.8 Flash' : 'Deterministic Synthesis'}
              </div>
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-emerald-100 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Analyzing...' : 'Refresh AI'}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3.5 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-xs text-rose-200 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Executive Summary */}
          {insights?.executiveSummary && (
            <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1">
                <Activity className="w-3.5 h-3.5" />
                <span>Executive Operational Brief</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                {insights.executiveSummary}
              </p>
            </div>
          )}

          {/* Crowd & Footfall Intelligence Section */}
          {crowd && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300/90 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Crowd & Footfall Intelligence</span>
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-300">Live Pressure:</span>
                  {getPressureBadge(crowd.currentQueuePressure)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Busy Hours */}
                <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5">
                  <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Peak Traffic Window
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium mt-1">
                    {crowd.busyHoursText}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {crowd.lowTrafficHoursText}
                  </p>
                </div>

                {/* 2. Top Demand & Trend */}
                <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5">
                  <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                      Demand & Traffic Trend
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium mt-1">
                    {crowd.topDemandedService
                      ? `${crowd.topDemandedService.name} (${crowd.topDemandedService.percentage}% volume)`
                      : 'Standard distribution across services'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {crowd.recentFootfallTrend?.trendDescription}
                  </p>
                </div>

                {/* 3. Upcoming Rush Forecast */}
                <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5">
                  <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Slot Bookings & Rush Alert
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium mt-1">
                    {crowd.upcomingRushForecast}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Grounding: {crowd.dataPointsAnalyzed} historical tokens evaluated
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Operational Domain Insights Cards with Jump Links */}
          {insights && (
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300/90 mb-3 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" />
                <span>Cross-Functional Center Intelligence</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Queue */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Queue Flow
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">{insights.queueInsight?.metricHighlight}</span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 line-clamp-3">
                    {insights.queueInsight?.summary}
                  </p>
                </div>

                {/* Procurement */}
                <div
                  onClick={() => setSubTab('procurement')}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-400/40 hover:bg-white/10 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Wheat className="w-3.5 h-3.5" />
                      Procurement
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">{insights.procurementInsight?.metricHighlight}</span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 line-clamp-3">
                    {insights.procurementInsight?.summary}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold mt-2 group-hover:translate-x-0.5 transition-transform">
                    <span>View Procurement AI</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Settlements */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5" />
                      Settlements
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">{insights.paymentInsight?.metricHighlight}</span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 line-clamp-3">
                    {insights.paymentInsight?.summary}
                  </p>
                </div>

                {/* Inventory */}
                <div
                  onClick={() => setSubTab('inventory')}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-400/40 hover:bg-white/10 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-rose-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5" />
                      Stock Health
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">{insights.inventoryInsight?.metricHighlight}</span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 line-clamp-3">
                    {insights.inventoryInsight?.summary}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-indigo-300 font-bold mt-2 group-hover:translate-x-0.5 transition-transform">
                    <span>View Inventory AI</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actionable Recommendations (Advisory Only) */}
          {insights?.recommendedActions && insights.recommendedActions.length > 0 && (
            <div className="mt-5 pt-4 border-t border-emerald-800/50">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300/90 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recommended Administrative Actions</span>
                </h4>
                <span className="text-[10px] text-emerald-300/70 italic">
                  Advisory only • Staff authorization required
                </span>
              </div>

              <div className="space-y-2">
                {insights.recommendedActions.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 mt-0.5 ${
                        rec.priority === 'high'
                          ? 'bg-rose-500/30 text-rose-200 border border-rose-400/30'
                          : rec.priority === 'medium'
                          ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30'
                          : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                      }`}>
                        {rec.category}
                      </span>
                      <span className="text-slate-200 font-medium">
                        {rec.action}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold shrink-0">
                      {rec.priority} Priority
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety & Compliance Footnote */}
          <div className="mt-4 pt-3 border-t border-emerald-800/30 flex items-center justify-between text-[11px] text-emerald-300/60">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Numbers derived from verified MongoDB collections. AI recommendations do not modify system settings autonomously.
            </span>
            <span className="font-mono">
              Last computed: {insights?.generatedAt ? new Date(insights.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Live'}
            </span>
          </div>
        </div>
      )}

      {/* VIEW 2: Procurement Intelligence (Batch 8B) */}
      {subTab === 'procurement' && (
        <ProcurementIntelligenceCard
          token={token}
          queryParams={queryParams}
          onNotification={onNotification}
        />
      )}

      {/* VIEW 3: Inventory Intelligence (Batch 8B) */}
      {subTab === 'inventory' && (
        <InventoryIntelligenceCard
          token={token}
          queryParams={queryParams}
          onNotification={onNotification}
        />
      )}

      {/* VIEW 4: Anomaly Detection (Batch 8B) */}
      {subTab === 'anomalies' && (
        <AnomalyDetectionCard
          token={token}
          queryParams={queryParams}
          onNotification={onNotification}
        />
      )}

      {/* VIEW 5: Smart Staff / Counter Recommendation (Batch 8C) */}
      {subTab === 'staff_rec' && (
        <StaffRecommendationCard
          token={token}
          onNotification={onNotification}
          onNavigateToStaffTab={onNavigateToStaffTab}
        />
      )}

      {/* VIEW 6: Smart Kendra Recommendation (Batch 8C) */}
      {subTab === 'kendra_rec' && (
        <KendraRecommendationCard
          token={token}
          onNotification={onNotification}
        />
      )}
    </div>
  );
};
