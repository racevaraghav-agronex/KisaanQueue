import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/api.ts';
import { 
  FileText, 
  Printer, 
  RotateCw, 
  Calendar, 
  Download, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  Package,
  Building2,
  Wheat,
  Boxes,
  CreditCard,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

interface AdminReportsTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export type ReportType = 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'queue' 
  | 'procurement' 
  | 'sales' 
  | 'inventory' 
  | 'purchases' 
  | 'complaints';

interface ReportDataResponse {
  reportType: string;
  title: string;
  summaryText: string;
  generatedAt: string;
  rangeLabel: string;
  headers: string[];
  rows: any[][];
  totalRows: number;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({ token, onNotification }) => {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  
  const [reportData, setReportData] = useState<ReportDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.set('type', reportType);
      params.set('range', dateRange);
      if (dateRange === 'custom') {
        if (customStart) params.set('startDate', customStart);
        if (customEnd) params.set('endDate', customEnd);
      }
      if (serviceFilter !== 'ALL') params.set('service', serviceFilter);
      if (staffFilter !== 'ALL') params.set('staff', staffFilter);
      params.set('format', 'json');

      const res = await safeFetchJson<ReportDataResponse>(`/api/admin/reports/data?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && res.data) {
        setReportData(res.data);
        setCurrentPage(1);
        setError(null);
      } else {
        setError(res.error || 'Failed to generate official report from MongoDB.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error while generating report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, dateRange, serviceFilter, staffFilter]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (e: any) {
      console.warn('Print blocked by browser context:', e);
      onNotification({ 
        type: 'error', 
        text: 'Printing is restricted in this preview frame. Please open the portal in a full browser tab to print.' 
      });
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    params.set('type', reportType);
    params.set('range', dateRange);
    if (dateRange === 'custom') {
      if (customStart) params.set('startDate', customStart);
      if (customEnd) params.set('endDate', customEnd);
    }
    if (serviceFilter !== 'ALL') params.set('service', serviceFilter);
    if (staffFilter !== 'ALL') params.set('staff', staffFilter);
    params.set('format', 'csv');

    // Trigger CSV download via authenticated fetch
    fetch(`/api/admin/reports/data?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to generate CSV export');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `kendra_report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        onNotification({ type: 'success', text: `Exported ${reportType.toUpperCase()} report as CSV successfully!` });
      })
      .catch(err => {
        onNotification({ type: 'error', text: 'Failed to download CSV: ' + err.message });
      });
  };

  const reportPills: Array<{ id: ReportType; label: string; icon: any }> = [
    { id: 'daily', label: 'Daily Operations', icon: Calendar },
    { id: 'weekly', label: 'Weekly Summary', icon: TrendingUp },
    { id: 'monthly', label: 'Monthly Executive', icon: Building2 },
    { id: 'queue', label: 'Queue & Service', icon: Clock },
    { id: 'procurement', label: 'Procurement', icon: Wheat },
    { id: 'sales', label: 'Sales Register', icon: CreditCard },
    { id: 'inventory', label: 'Warehouse Stock', icon: Boxes },
    { id: 'purchases', label: 'Inward Purchases', icon: Package },
    { id: 'complaints', label: 'Farmer Grievances', icon: MessageSquare }
  ];

  // In-memory filter on displayed rows
  const filteredRows = (reportData?.rows || []).filter(row => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return row.some(cell => String(cell).toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-6">
      {/* 1. Header controls (hidden on print) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs print:hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Krishi Seva Kendra Official Reports Center
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Government compliant reports with clean RFC CSV exports and print-ready operational registers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={loading}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Report Type Selector Pills */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-[11px] font-bold text-slate-500 mb-2">
            Select Report Type:
          </label>
          <div className="flex flex-wrap gap-2">
            {reportPills.map(pill => {
              const Icon = pill.icon;
              const isSelected = reportType === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    setReportType(pill.id);
                    // Adjust default date range for weekly/monthly
                    if (pill.id === 'weekly') setDateRange('last7days');
                    else if (pill.id === 'monthly') setDateRange('last30days');
                    else if (pill.id === 'daily') setDateRange('today');
                  }}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Report Date Period
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Search Inside Report
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter farmer name, phone, code..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Records Count
            </label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono text-xs">
              Showing {filteredRows.length} of {reportData?.totalRows || 0} rows
            </div>
          </div>
        </div>

        {dateRange === 'custom' && (
          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-900">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-slate-800 text-xs font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-900">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-slate-800 text-xs font-medium"
              />
            </div>
            <button
              onClick={fetchReport}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="p-8 text-center bg-white rounded-3xl border border-rose-200 text-xs">
          <AlertTriangle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchReport}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Generating Report</span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-700" />
          <span>Generating {reportType.toUpperCase()} operational report from MongoDB...</span>
        </div>
      )}

      {/* 2. Official Printable Report Document */}
      {!loading && reportData && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 print:p-0 print:border-none print:shadow-none">
          {/* Official Report Header Banner */}
          <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-extrabold text-xl shadow-xs print:border print:border-slate-800">
                KQ
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                  KRISHI SEVA KENDRA
                </h2>
                <p className="text-xs text-slate-500">
                  Department of Agriculture & Farmer Welfare • Kendra Operations Center
                </p>
                <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                  Official Register: {reportData.title}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs space-y-0.5 text-slate-600">
              <p>
                <strong className="text-slate-800">Generated:</strong>{' '}
                {new Date(reportData.generatedAt).toLocaleString('en-IN')}
              </p>
              <p>
                <strong className="text-slate-800">Period:</strong> {reportData.rangeLabel}
              </p>
              <p className="font-mono text-[11px] text-slate-500">
                Source: MongoDB Atlas Kendra Node
              </p>
            </div>
          </div>

          {/* Report Summary Callout */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Summary Metric
              </span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {reportData.summaryText}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                {reportData.rows.length} Total Records Recorded
              </span>
            </div>
          </div>

          {/* Report Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 border-y border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  {reportData.headers.map((h, i) => (
                    <th key={i} className="py-3 px-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/70 transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="py-2.5 px-3 text-slate-800 font-medium">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={reportData.headers.length} className="py-8 text-center text-slate-400">
                      No records match the active search or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (hidden on print) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-600 print:hidden">
              <span>
                Page {currentPage} of {totalPages} ({filteredRows.length} items)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Official Sign-off Footer (visible on print and screen) */}
          <div className="border-t border-slate-200 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Official Krishi Seva Kendra Operations</p>
              <p className="text-[11px] text-slate-400">
                This document is generated directly from live verified MongoDB transaction ledgers.
              </p>
            </div>

            <div className="text-right space-y-8 pt-4">
              <div className="w-48 border-b border-dashed border-slate-400 pb-1 text-center font-serif text-slate-700 italic">
                Authorized Officer
              </div>
              <p className="text-[10px] text-slate-400">Kendra In-charge Signature & Official Stamp</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
