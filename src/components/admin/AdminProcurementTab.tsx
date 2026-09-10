import React, { useState, useEffect } from 'react';
import {
  Wheat,
  Scale,
  Award,
  IndianRupee,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  FileText,
  Building2,
  TrendingUp,
  Download,
  Calendar
} from 'lucide-react';
import { ProcurementRecord, ProcurementStats } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { ProcurementReceiptModal } from '../ProcurementReceiptModal.tsx';

interface AdminProcurementTabProps {
  token: string;
  onNotification?: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminProcurementTab: React.FC<AdminProcurementTabProps> = ({
  token,
  onNotification
}) => {
  const [procurements, setProcurements] = useState<ProcurementRecord[]>([]);
  const [stats, setStats] = useState<ProcurementStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<ProcurementRecord | null>(null);
  const [auditRecord, setAuditRecord] = useState<ProcurementRecord | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);

      // Fetch summary stats
      const statsRes = await safeFetchJson<ProcurementStats>('/api/procurement/stats/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok && statsRes.data) {
        setStats(statsRes.data);
      }

      // Fetch list with filters
      let url = '/api/procurement?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (paymentFilter !== 'ALL') url += `paymentStatus=${paymentFilter}&`;
      if (dateFilter !== 'all') url += `dateRange=${dateFilter}&`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;

      const listRes = await safeFetchJson<ProcurementRecord[]>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (listRes.ok && listRes.data) {
        setProcurements(listRes.data);
      }
    } catch (err: any) {
      console.warn('Error loading admin procurement data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, statusFilter, paymentFilter, dateFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          text: 'COMPLETED'
        };
      case 'ACCEPTED':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          text: 'ACCEPTED'
        };
      case 'PARTIALLY_ACCEPTED':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          text: 'PARTIAL'
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          text: 'REJECTED'
        };
      case 'QUALITY_CHECKED':
        return {
          bg: 'bg-sky-100 text-sky-800 border-sky-300',
          text: 'INSPECTED'
        };
      case 'WEIGHED':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          text: 'WEIGHED'
        };
      case 'ARRIVED':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          text: 'ARRIVED'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          text: 'PENDING'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Lots Procured</span>
            <Wheat className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.totalLots || procurements.length}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.completedLots || 0} completed • {stats?.inInspection || 0} in progress
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Procured Net Weight</span>
            <Scale className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.totalAcceptedQuintals || 0}{' '}
            <span className="text-xs font-normal text-slate-500">Qtl</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            Accepted: {stats?.totalAcceptedQuintals || 0} Qtl • Rej: {stats?.totalRejectedQuintals || 0} Qtl
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Valuation</span>
            <IndianRupee className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{stats?.totalValuation?.toLocaleString('en-IN') || 0}
          </div>
          <div className="text-[11px] text-slate-500">
            Based on govt MSP / Kendra rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Disbursement Status</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono">
            ₹{stats?.totalPaidAmount?.toLocaleString('en-IN') || 0}
          </div>
          <div className="text-[11px] text-amber-700 font-medium">
            Pending: ₹{stats?.pendingPaymentAmount?.toLocaleString('en-IN') || 0}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PR No, Farmer, Mobile, Crop, Vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => fetchData()}
            className="px-3 py-2 bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer"
          >
            Search
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden"
          >
            <option value="ALL">All Workflow Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="ARRIVED">ARRIVED</option>
            <option value="WEIGHED">WEIGHED</option>
            <option value="QUALITY_CHECKED">QUALITY_CHECKED</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="PARTIALLY_ACCEPTED">PARTIALLY_ACCEPTED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="PARTIAL">PARTIAL</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">This Month</option>
          </select>

          <button
            onClick={() => fetchData()}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-600"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Procurement Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">PR Number</th>
                <th className="p-3.5">Farmer Details</th>
                <th className="p-3.5">Produce & Lot</th>
                <th className="p-3.5 text-center">Net Wt</th>
                <th className="p-3.5 text-center">Grade</th>
                <th className="p-3.5 text-right">Valuation (₹)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Payment</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {procurements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No procurement records matching selected filters.
                  </td>
                </tr>
              ) : (
                procurements.map((item) => {
                  const badge = getStatusBadge(item.status);
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {item.procurementNumber}
                        <div className="text-[10px] font-normal text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short'
                          })}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{item.farmerName}</div>
                        <div className="text-[10px] text-slate-500">{item.farmerPhone}</div>
                      </td>

                      <td className="p-3.5">
                        <strong className="text-slate-900">{item.produce.cropName}</strong>
                        {item.produce.variety && (
                          <span className="text-[10px] text-slate-500 block">
                            {item.produce.variety}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold">
                        {item.weighment?.netWeight > 0
                          ? `${item.weighment.netWeight} ${item.weighment.unit}`
                          : `${item.produce.declaredQuantity} ${item.produce.unit}`}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {item.quality?.grade || 'FAQ'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-emerald-900">
                        ₹{item.pricing?.netPayable?.toLocaleString('en-IN') || 0}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.text}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.payment?.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.payment?.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.payment?.status || 'PENDING'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedReceipt(item)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="View Digital Slip"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          </button>
                          <button
                            onClick={() => setAuditRecord(item)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Audit Trail / History"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Modal */}
      {auditRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Procurement Audit Trail: {auditRecord.procurementNumber}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Farmer: {auditRecord.farmerName} • Crop: {auditRecord.produce.cropName}
                </p>
              </div>
              <button
                onClick={() => setAuditRecord(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {auditRecord.statusHistory?.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900">{step.status}</strong>
                    <span className="text-[10px] text-slate-400">
                      {new Date(step.timestamp).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-slate-600">{step.notes}</div>
                  <div className="text-[10px] text-slate-400">
                    Operator: <span className="font-semibold text-slate-600">{step.changedBy}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setAuditRecord(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-semibold cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <ProcurementReceiptModal
          procurement={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
