import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/api.ts';
import {
  ShieldAlert,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Users,
  Wheat,
  Boxes,
  IndianRupee,
  MessageSquare,
  Sparkles,
  Info,
  Clock,
  ExternalLink
} from 'lucide-react';

interface AnomalyDetectionCardProps {
  token: string;
  queryParams?: string;
  onNotification?: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AnomalyDetectionCard: React.FC<AnomalyDetectionCardProps> = ({
  token,
  queryParams = '',
  onNotification
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const fetchData = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const queryPrefix = queryParams ? `${queryParams}&` : '';
      const url = `/api/admin/anomalies?${queryPrefix}${force ? 'refresh=true' : ''}`;

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
          text: 'Operational anomaly audit refreshed across all 5 operational domains.'
        });
      }
    } catch (err: any) {
      console.error('Failed to load anomaly detection results:', err);
      setError(err.message || 'Unable to retrieve anomaly detection results');
      if (force && onNotification) {
        onNotification({
          type: 'error',
          text: 'Failed to refresh anomaly audit: ' + (err.message || 'Network error')
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
            <div className="w-10 h-10 bg-amber-100 rounded-2xl"></div>
            <div>
              <div className="w-48 h-4 bg-slate-200 rounded"></div>
              <div className="w-32 h-3 bg-slate-100 rounded mt-1.5"></div>
            </div>
          </div>
          <div className="w-24 h-8 bg-slate-100 rounded-2xl"></div>
        </div>
        <div className="h-32 bg-slate-50 rounded-2xl mt-6"></div>
      </div>
    );
  }

  const overallStatus = data?.overallStatus || 'normal';
  const anomalies = data?.anomalies || [];
  const severity = data?.severityBreakdown || { high: 0, medium: 0, low: 0 };
  const categories = data?.categoryBreakdown || { QUEUE: 0, PROCUREMENT: 0, INVENTORY: 0, SALES: 0, COMPLAINTS: 0 };

  const filteredAnomalies = selectedCategory === 'ALL'
    ? anomalies
    : anomalies.filter((a: any) => a.category === selectedCategory);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'QUEUE':
        return <Users className="w-4 h-4 text-sky-600" />;
      case 'PROCUREMENT':
        return <Wheat className="w-4 h-4 text-emerald-600" />;
      case 'INVENTORY':
        return <Boxes className="w-4 h-4 text-indigo-600" />;
      case 'SALES':
        return <IndianRupee className="w-4 h-4 text-teal-600" />;
      case 'COMPLAINTS':
        return <MessageSquare className="w-4 h-4 text-rose-600" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
            overallStatus === 'critical_attention'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : overallStatus === 'review_recommended'
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                AI Operational Anomaly Detection
              </h3>
              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${
                overallStatus === 'critical_attention'
                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                  : overallStatus === 'review_recommended'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {overallStatus === 'critical_attention'
                  ? 'Critical Attention'
                  : overallStatus === 'review_recommended'
                  ? 'Review Recommended'
                  : 'Operational Normal'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated pattern monitoring across Queue, Procurement, Inventory, Sales & Grievances
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
            <span>{refreshing ? 'Scanning...' : 'Scan Now'}</span>
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
        <div className={`mt-4 p-4 rounded-2xl border ${
          overallStatus === 'critical_attention'
            ? 'bg-rose-50/50 border-rose-100 text-rose-900'
            : overallStatus === 'review_recommended'
            ? 'bg-amber-50/50 border-amber-100 text-amber-900'
            : 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Operational Auditor Brief</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {data.executiveBrief}
          </p>
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
          <div className="text-[11px] font-semibold text-slate-500">Total Variances</div>
          <div className="text-lg font-black text-slate-900 mt-0.5">
            {data?.totalAnomaliesCount || 0}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/60 text-center">
          <div className="text-[11px] font-semibold text-rose-600">High Severity</div>
          <div className="text-lg font-black text-rose-700 mt-0.5">
            {severity.high}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-center">
          <div className="text-[11px] font-semibold text-amber-700">Medium Severity</div>
          <div className="text-lg font-black text-amber-800 mt-0.5">
            {severity.medium}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
          <div className="text-[11px] font-semibold text-slate-500">Low / Informational</div>
          <div className="text-lg font-black text-slate-700 mt-0.5">
            {severity.low}
          </div>
        </div>
      </div>

      {/* Domain Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-3 mt-3 border-b border-slate-100 scrollbar-none text-xs">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          All Domains ({anomalies.length})
        </button>

        {(['QUEUE', 'PROCUREMENT', 'INVENTORY', 'SALES', 'COMPLAINTS'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === cat
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <span>{cat}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedCategory === cat ? 'bg-emerald-950 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {categories[cat] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Anomalies List or Healthy State */}
      <div className="mt-4 space-y-3">
        {filteredAnomalies.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200/60">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-900">
              No Operational Variances Detected
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              All monitored metrics in {selectedCategory === 'ALL' ? 'all domains' : selectedCategory} are operating within expected baseline thresholds.
            </p>
          </div>
        ) : (
          filteredAnomalies.map((anom: any) => (
            <div
              key={anom.id}
              className={`p-4 rounded-2xl border transition-all ${
                anom.severity === 'high'
                  ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                  : anom.severity === 'medium'
                  ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-white rounded-xl shadow-xs shrink-0 mt-0.5">
                    {getCategoryIcon(anom.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900 tracking-tight">
                        {anom.title}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider bg-white border border-slate-200 text-slate-700">
                        {anom.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {anom.description}
                    </p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 self-start sm:self-auto ${
                  anom.severity === 'high'
                    ? 'bg-rose-200 text-rose-900 border border-rose-300'
                    : anom.severity === 'medium'
                    ? 'bg-amber-200 text-amber-900 border border-amber-300'
                    : 'bg-slate-200 text-slate-800 border border-slate-300'
                }`}>
                  {anom.severity} Priority
                </span>
              </div>

              {/* Observed vs Baseline Factual Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-black/5 text-xs">
                <div className="p-2 rounded-xl bg-white/80 border border-black/5">
                  <span className="text-[10px] text-slate-600 uppercase font-semibold block">
                    Observed Metric
                  </span>
                  <span className="font-bold text-slate-900">{anom.observedValue}</span>
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    Target: <span className="font-medium text-slate-700">{anom.affectedEntity}</span>
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white/80 border border-black/5">
                  <span className="text-[10px] text-slate-600 uppercase font-semibold block">
                    Established Baseline
                  </span>
                  <span className="font-medium text-slate-700">{anom.baseline}</span>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-white border border-slate-200/70 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900">Recommended Action: </span>
                  <span className="text-slate-700">{anom.recommendedAction}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Neutrality Directive Note */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>Operational variances are surfaced objectively to assist administrative review. Anomaly alerts indicate statistical or operational deviations, not confirmed misconduct.</span>
        </span>
        <span className="font-mono text-slate-600 shrink-0 ml-2">
          {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Live'}
        </span>
      </div>
    </div>
  );
};
