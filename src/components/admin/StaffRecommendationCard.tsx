import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/api.ts';
import {
  Users,
  Sparkles,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Activity,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface ServiceQueuePressure {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  waitingCount: number;
  servingCount: number;
  activeCountersCount: number;
  activeCounterNumbers: number[];
  assignedStaffNames: string[];
  oldestWaitingMinutes: number;
  pressureLevel: 'low' | 'moderate' | 'high';
  pressureReason: string;
}

interface CounterUtilization {
  counterNumber: number;
  staffId: string | null;
  staffName: string | null;
  assignedService: string | null;
  shiftStatus: 'active' | 'break' | 'offline' | 'unassigned';
  currentServingToken: string | null;
  utilizationStatus: 'busy' | 'idle' | 'on_break' | 'offline' | 'unstaffed';
  statusText: string;
}

interface StaffRecommendationItem {
  id: string;
  priority: 'urgent' | 'high' | 'moderate' | 'info';
  type: 'assign_counter' | 'reallocate_counter' | 'activate_auxiliary' | 'shift_break' | 'optimal_balance';
  title: string;
  description: string;
  suggestedAction: string;
  serviceName?: string;
  targetCounter?: number;
  suggestedStaffName?: string;
  rationale: string;
  impact: string;
}

interface StaffRecommendationData {
  hasSufficientData: boolean;
  status: 'optimal' | 'rebalance_suggested' | 'high_pressure_alert' | 'insufficient_data';
  overallAssessment: string;
  executiveSummary: string;
  source: 'gemini' | 'deterministic_synthesis';
  totalStaffOnShift: number;
  activeStaffOnDuty: number;
  staffOnBreak: number;
  staffOffline: number;
  activeCountersCount: number;
  totalCountersConfigured: number;
  queuePressureByService: ServiceQueuePressure[];
  counterUtilization: CounterUtilization[];
  recommendations: StaffRecommendationItem[];
  disclaimer: string;
  generatedAt: string;
}

interface StaffRecommendationCardProps {
  token: string;
  onNotification?: (notif: { type: 'success' | 'error'; text: string }) => void;
  onNavigateToStaffTab?: () => void;
}

export const StaffRecommendationCard: React.FC<StaffRecommendationCardProps> = ({
  token,
  onNotification,
  onNavigateToStaffTab
}) => {
  const [data, setData] = useState<StaffRecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const url = `/api/admin/recommendations/staff${force ? '?refresh=true' : ''}`;
      const res = await safeFetchJson<StaffRecommendationData>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.error && !res.data) {
        throw new Error(res.error);
      }

      setData(res.data || null);

      if (force && onNotification) {
        onNotification({
          type: 'success',
          text: 'Smart Staff & Counter recommendations updated with live queue metrics.'
        });
      }
    } catch (err: any) {
      console.error('Error fetching staff recommendations:', err);
      setError(err.message || 'Failed to load staff recommendations.');
      if (force && onNotification) {
        onNotification({
          type: 'error',
          text: 'Failed to refresh recommendations: ' + (err.message || 'Network error')
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations(false);
  }, [token]);

  const getPriorityBadge = (priority: StaffRecommendationItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> High Priority
          </span>
        );
      case 'moderate':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-200">
            Moderate
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Info
          </span>
        );
    }
  };

  const getPressureBadge = (level: ServiceQueuePressure['pressureLevel']) => {
    switch (level) {
      case 'high':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">High Pressure</span>;
      case 'moderate':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Moderate Load</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Optimal</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Smart Staff & Counter Recommendation
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                Phase 8C
              </span>
              {data?.source === 'gemini' && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Gemini 3.8 Flash
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live queue demand vs active counter capacity • Non-destructive advisory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToStaffTab && (
            <button
              onClick={onNavigateToStaffTab}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Manage Staff</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => fetchRecommendations(true)}
            disabled={loading || refreshing}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Evaluating...' : 'Refresh AI'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Non-Destructive Advisory Notice */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-semibold text-amber-950">Advisory Recommendation Only: </strong>
          Recommendations analyze real queue load and available staff. System never automatically modifies staff shifts, counter assignments, or RBAC permissions. Any reallocation requires manual Admin authorization.
        </div>
      </div>

      {loading && !data ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <RotateCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700">Analyzing live queue load and counter throughput...</p>
          <p className="text-xs text-slate-400 mt-1">Cross-referencing staff shifts with waiting tokens in MongoDB</p>
        </div>
      ) : error && !data ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Unable to generate recommendations
          </p>
          <p className="mt-1">{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Executive Overview & Quick Counts */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Overall Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                  data.status === 'high_pressure_alert'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : data.status === 'rebalance_suggested'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {data.overallAssessment}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Calculated {new Date(data.generatedAt).toLocaleTimeString('en-IN')}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
              {data.executiveSummary}
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <div className="text-[11px] text-slate-500 font-medium">Active Staff on Duty</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{data.activeStaffOnDuty} / {data.totalStaffOnShift}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <div className="text-[11px] text-slate-500 font-medium">Counters Serving</div>
                <div className="text-base font-bold text-indigo-700 mt-0.5">{data.activeCountersCount} of {data.totalCountersConfigured}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <div className="text-[11px] text-slate-500 font-medium">Staff on Break</div>
                <div className="text-base font-bold text-amber-600 mt-0.5">{data.staffOnBreak}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <div className="text-[11px] text-slate-500 font-medium">Staff Offline</div>
                <div className="text-base font-bold text-slate-500 mt-0.5">{data.staffOffline}</div>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Actionable Recommendations ({data.recommendations.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400">Strictly grounded in real queue load</span>
            </div>

            <div className="space-y-3">
              {data.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    rec.priority === 'urgent'
                      ? 'bg-rose-50/40 border-rose-200'
                      : rec.priority === 'high'
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getPriorityBadge(rec.priority)}
                        <h5 className="text-sm font-bold text-slate-900">{rec.title}</h5>
                      </div>
                      <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>

                    {rec.targetCounter && (
                      <span className="shrink-0 text-xs font-extrabold px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl">
                        Target: Counter 0{rec.targetCounter}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-bold text-indigo-800 block mb-0.5">Suggested Action:</span>
                      <p className="text-slate-800 font-medium">{rec.suggestedAction}</p>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-bold text-emerald-800 block mb-0.5">Expected Impact:</span>
                      <p className="text-slate-700">{rec.impact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real Queue Pressure by Service */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Service Queue Demand & Counter Alignment</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3 text-center">Waiting</th>
                    <th className="py-2.5 px-3 text-center">Serving</th>
                    <th className="py-2.5 px-3 text-center">Active Counters</th>
                    <th className="py-2.5 px-3">Assigned Staff</th>
                    <th className="py-2.5 px-3">Oldest Wait</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.queuePressureByService.map((srv) => (
                    <tr key={srv.serviceId} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{srv.serviceName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{srv.serviceCode}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                        <span className={`px-2 py-0.5 rounded-full ${srv.waitingCount >= 4 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                          {srv.waitingCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                        {srv.servingCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {srv.activeCounterNumbers.length > 0 ? (
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {srv.activeCounterNumbers.map(c => (
                              <span key={c} className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 font-extrabold rounded-md text-[10px]">
                                C0{c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None active</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {srv.assignedStaffNames.length > 0 ? (
                          srv.assignedStaffNames.join(', ')
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {srv.waitingCount > 0 ? `~${srv.oldestWaitingMinutes} min` : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {getPressureBadge(srv.pressureLevel)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Counter Utilization Matrix */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span>Counter Station Status (Physical Desks 1 – 6)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.counterUtilization.map((c) => (
                <div
                  key={c.counterNumber}
                  className={`p-3.5 rounded-2xl border text-xs ${
                    c.utilizationStatus === 'busy'
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : c.utilizationStatus === 'idle'
                      ? 'bg-amber-50/30 border-amber-200'
                      : c.utilizationStatus === 'on_break'
                      ? 'bg-blue-50/30 border-blue-200'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-slate-900 text-sm">
                      Counter 0{c.counterNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      c.utilizationStatus === 'busy'
                        ? 'bg-emerald-100 text-emerald-800'
                        : c.utilizationStatus === 'idle'
                        ? 'bg-amber-100 text-amber-800'
                        : c.utilizationStatus === 'on_break'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {c.utilizationStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Staff:</span>
                      <strong className="text-slate-800 font-semibold">{c.staffName || 'Unassigned'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Desk Service:</span>
                      <span className="text-slate-800 font-medium truncate max-w-[140px]">{c.assignedService || 'General'}</span>
                    </div>
                    {c.currentServingToken && (
                      <div className="flex justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-emerald-700 font-bold">Serving Now:</span>
                        <span className="font-mono font-bold text-emerald-900">{c.currentServingToken}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
