import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/api.ts';
import {
  Wheat,
  RotateCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  IndianRupee,
  ShieldCheck,
  BarChart2,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';

interface ProcurementIntelligenceCardProps {
  token: string;
  queryParams?: string;
  onNotification?: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const ProcurementIntelligenceCard: React.FC<ProcurementIntelligenceCardProps> = ({
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
      const url = `/api/admin/procurement-intelligence?${queryPrefix}${force ? 'refresh=true' : ''}`;

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
          text: 'Procurement intelligence refreshed with verified MongoDB records.'
        });
      }
    } catch (err: any) {
      console.error('Failed to load procurement intelligence:', err);
      setError(err.message || 'Unable to retrieve procurement intelligence');
      if (force && onNotification) {
        onNotification({
          type: 'error',
          text: 'Failed to refresh procurement intelligence: ' + (err.message || 'Network error')
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

  const summary = data?.summaryMetrics;
  const crops = data?.cropBreakdown || [];
  const grades = data?.gradeDistribution || [];
  const trend = data?.trendAnalysis;
  const recommendations = data?.actionableRecommendations || [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Wheat className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                AI Procurement Intelligence
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Phase 8B Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crop volumes, quality distribution, and settlement progress grounded in MongoDB
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
            <span>Procurement Executive Synthesis</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {data.executiveBrief}
          </p>
        </div>
      )}

      {/* 4-Card Summary Metrics */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500">Accepted Produce</div>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {summary.acceptedQuantity} <span className="text-xs font-bold text-slate-600">Qtl</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary.totalLots} total lots received
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500">Total Value</div>
            <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
              ₹{summary.totalProcurementValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Net payable amount
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500">Rejection Rate</div>
            <div className={`text-base sm:text-lg font-black mt-0.5 ${summary.rejectionRatePercentage > 15 ? 'text-rose-600' : 'text-slate-900'}`}>
              {summary.rejectionRatePercentage}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary.rejectedQuantity} Qtl rejected
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500">Settlements Pending</div>
            <div className={`text-base sm:text-lg font-black mt-0.5 ${summary.pendingLotsCount > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
              ₹{summary.pendingAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary.pendingLotsCount} lots awaiting payout
            </div>
          </div>
        </div>
      )}

      {/* Trend Analysis Callout */}
      {trend && (
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-start gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            trend.direction === 'increasing'
              ? 'bg-emerald-100 text-emerald-800'
              : trend.direction === 'decreasing'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-slate-200 text-slate-700'
          }`}>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>Historical Trend Analysis</span>
              {trend.volumeChangePercentage !== null && trend.volumeChangePercentage !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-black ${
                  trend.volumeChangePercentage > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {trend.volumeChangePercentage > 0 ? `+${trend.volumeChangePercentage}%` : `${trend.volumeChangePercentage}%`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {trend.trendDescription}
            </p>
          </div>
        </div>
      )}

      {/* Crop-wise Breakdown */}
      {crops.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Crop-wise Volume & Value Breakdown</span>
            </h4>
            <span className="text-[11px] text-slate-600 font-medium">
              Derived from recorded weighments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3 rounded-l-xl">Crop Name</th>
                  <th className="py-2.5 px-3">Volume (Share)</th>
                  <th className="py-2.5 px-3">Total Value</th>
                  <th className="py-2.5 px-3">Avg Rate</th>
                  <th className="py-2.5 px-3">Avg Moisture</th>
                  <th className="py-2.5 px-3 rounded-r-xl">Rejection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {crops.map((crop: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>{crop.cropName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <span className="font-semibold">{crop.volume} {crop.unit}</span>
                      <span className="text-slate-600 ml-1.5 text-[11px]">({crop.percentageShare}%)</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">
                      ₹{crop.value.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono">
                      ₹{crop.averageRate}/{crop.unit}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {crop.avgMoisture !== null ? `${crop.avgMoisture}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        crop.rejectionRatePercentage > 15
                          ? 'bg-rose-100 text-rose-700'
                          : crop.rejectionRatePercentage > 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {crop.rejectionRatePercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quality Grades */}
      {grades.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Quality Inspection Grade Distribution</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {grades.map((g: any, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2"
              >
                <span className="font-bold text-slate-900">{g.grade}:</span>
                <span className="text-slate-600">{g.lotsCount} lots ({g.acceptedQuantity} Qtl)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Procurement Recommendations</span>
            </h4>
            <span className="text-[10px] text-slate-600 italic">
              Advisory only • Staff authorization required
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

      {/* Compliance Disclaimer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>Rates derived from actual recorded pricing. Official government MSP is never predicted or declared autonomously.</span>
        </span>
        <span className="font-mono text-slate-600 shrink-0 ml-2">
          {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Live'}
        </span>
      </div>
    </div>
  );
};
