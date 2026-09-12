import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/api.ts';
import {
  MapPin,
  RotateCw,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Sparkles,
  Users,
  ShieldCheck,
  Info,
  Building2,
  Ticket
} from 'lucide-react';

interface KendraMetrics {
  centreName: string;
  isPrimary: boolean;
  operationalStatus: 'Open & Operational' | 'High Footfall / Elevated Queue' | 'Limited Staff / High Wait' | 'Unattended / Standby';
  activeStaffOnDuty: number;
  totalWaitingTokens: number;
  totalServingTokens: number;
  serviceQueueWaiting: number;
  estimatedWaitMinutes: number;
  estimatedWaitText: string;
  availableSlotsToday: number;
  totalSlotsToday: number;
  slotAvailabilityRate: string;
  isServiceAvailable: boolean;
  locationDistance: number | null;
  distanceLabel: string;
  distanceNotice: string;
  suitabilityScore: number;
  reasons: string[];
}

interface SmartKendraRecommendationData {
  hasSufficientData: boolean;
  isSingleCentre: boolean;
  comparisonAvailable: boolean;
  insufficientDataReason?: string;
  serviceRequested: {
    code: string;
    name: string;
    isActive: boolean;
  };
  recommendedCentre: KendraMetrics | null;
  allCentres: KendraMetrics[];
  recommendationHeadline: string;
  evaluationSummary: string;
  criteriaUsed: string[];
  disclaimer: string;
  generatedAt: string;
}

interface KendraRecommendationCardProps {
  token: string;
  onNotification?: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const KendraRecommendationCard: React.FC<KendraRecommendationCardProps> = ({
  token,
  onNotification
}) => {
  const [data, setData] = useState<SmartKendraRecommendationData | null>(null);
  const [selectedServiceCode, setSelectedServiceCode] = useState<string>('FS');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const availableServices = [
    { code: 'FS', name: 'Fertilizer & Seed Distribution' },
    { code: 'PROC', name: 'Produce Procurement & Weighment' },
    { code: 'SCH', name: 'Government Scheme Enrollment' },
    { code: 'SHC', name: 'Soil Health Card Consultation' },
    { code: 'REV', name: 'Revenue & Billing Clearance' }
  ];

  const fetchKendraRecommendation = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const url = `/api/admin/recommendations/kendra?serviceCode=${encodeURIComponent(selectedServiceCode)}${force ? '&refresh=true' : ''}`;
      const res = await safeFetchJson<SmartKendraRecommendationData>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.error && !res.data) {
        throw new Error(res.error);
      }

      setData(res.data || null);

      if (force && onNotification) {
        onNotification({
          type: 'success',
          text: 'Smart Kendra evaluation updated with real-time queue & slot availability.'
        });
      }
    } catch (err: any) {
      console.error('Error loading Kendra recommendations:', err);
      setError(err.message || 'Failed to load Kendra recommendations.');
      if (force && onNotification) {
        onNotification({
          type: 'error',
          text: 'Failed to refresh Kendra data: ' + (err.message || 'Network error')
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKendraRecommendation(false);
  }, [selectedServiceCode, token]);

  const getStatusBadge = (status: KendraMetrics['operationalStatus']) => {
    switch (status) {
      case 'Open & Operational':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {status}
          </span>
        );
      case 'High Footfall / Elevated Queue':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Smart Kendra Recommendation
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                Phase 8C
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Centre selection based on live queue, ETA, service status & slot capacity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Service Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium hidden sm:inline">Evaluating for:</span>
            <select
              value={selectedServiceCode}
              onChange={(e) => setSelectedServiceCode(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {availableServices.map((srv) => (
                <option key={srv.code} value={srv.code}>
                  {srv.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchKendraRecommendation(true)}
            disabled={loading || refreshing}
            className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Evaluating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Strict Grounding & No-Hallucinated-Distance Notice */}
      <div className="bg-teal-50/50 border border-teal-200/70 rounded-2xl p-3.5 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-950 leading-relaxed">
          <strong className="font-semibold">Truthful Evaluation Guarantee: </strong>
          Recommendations are evaluated strictly using verified queue sizes, empirical service ETAs, and confirmed slot bookings. Location distance is omitted because physical GPS coordinates are not recorded in the database—the system never invents fake distances or centre availability.
        </div>
      </div>

      {loading && !data ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <RotateCw className="w-8 h-8 text-teal-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700">Evaluating centre queues and appointment slots...</p>
          <p className="text-xs text-slate-400 mt-1">Cross-referencing live Token and Slot collections</p>
        </div>
      ) : error && !data ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Kendra Evaluation Unavailable
          </p>
          <p className="mt-1">{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Insufficient Data Check */}
          {!data.hasSufficientData && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                Insufficient Centre Data
              </div>
              <p>{data.insufficientDataReason || 'Insufficient operational data exists to generate a Kendra recommendation.'}</p>
            </div>
          )}

          {/* Single Centre Registered Notice */}
          {data.isSingleCentre && (
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold text-blue-950">Single Kendra Registered in Cluster: </strong>
                All regional tokens and appointments are currently served through <strong>{data.recommendedCentre?.centreName}</strong>. Multi-centre comparative balancing will activate automatically when additional Kendras are provisioned in the database.
              </div>
            </div>
          )}

          {/* Recommendation Headline & Assessment */}
          {data.recommendedCentre && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                    Recommended Centre
                  </span>
                  <h4 className="text-base font-bold text-slate-900">
                    {data.recommendedCentre.centreName}
                  </h4>
                </div>
                {getStatusBadge(data.recommendedCentre.operationalStatus)}
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {data.evaluationSummary}
              </p>

              {/* Verified Metrics for Recommended Centre */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-center text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Queue for {data.serviceRequested.code}</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {data.recommendedCentre.serviceQueueWaiting} waiting
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Smart ETA</div>
                  <div className="text-base font-bold text-teal-700 mt-0.5">
                    {data.recommendedCentre.estimatedWaitText}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Available Slots Today</div>
                  <div className="text-base font-bold text-indigo-700 mt-0.5">
                    {data.recommendedCentre.availableSlotsToday} seats
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Counter Staff on Shift</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {data.recommendedCentre.activeStaffOnDuty} staff
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Evaluated Kendras Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>Kendra Profiles Evaluated ({data.allCentres.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400">Comparing real operational metrics</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {data.allCentres.map((centre) => (
                <div
                  key={centre.centreName}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="text-sm font-bold text-slate-900">{centre.centreName}</h5>
                      {centre.isPrimary && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          Main Centre
                        </span>
                      )}
                    </div>
                    {getStatusBadge(centre.operationalStatus)}
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[11px] text-slate-500 block">Service Queue</span>
                      <strong className="text-slate-900">{centre.serviceQueueWaiting} waiting</strong>
                      <span className="text-[10px] text-slate-400 block">({centre.totalWaitingTokens} total in Kendra)</span>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[11px] text-slate-500 block">Estimated Wait</span>
                      <strong className="text-teal-800">{centre.estimatedWaitText}</strong>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[11px] text-slate-500 block">Slot Availability</span>
                      <strong className="text-indigo-800">{centre.slotAvailabilityRate}</strong>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[11px] text-slate-500 block">Distance (GPS)</span>
                      <strong className="text-slate-600 block text-[11px]">Not Stored</strong>
                      <span className="text-[9px] text-slate-400 italic">Never hallucinated</span>
                    </div>
                  </div>

                  {/* Grounded Decision Factors */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Decision Factors:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {centre.reasons.map((r, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-700 font-medium">
                          • {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Criteria Used Transparency */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <span className="font-bold text-slate-800 block">Grounded Evaluation Criteria:</span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600">
              {data.criteriaUsed.map((crit, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" />
                  <span>{crit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
};
