import React, { useState, useEffect } from 'react';
import { DailyReport } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { 
  FileText, 
  Printer, 
  RotateCw, 
  Calendar, 
  IndianRupee, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  Package,
  Building2
} from 'lucide-react';

interface AdminReportsTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({ token, onNotification }) => {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await safeFetchJson<DailyReport>('/api/admin/reports/daily', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && res.data) {
        setReport(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to generate daily report.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error while generating daily report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Daily Kendra Operational Report</h3>
          <p className="text-xs text-slate-500">
            Official daily summary of queue service delivery, stock alerts, and financial settlements
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchReport}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Report</span>
          </button>
        </div>
      </div>

      {error && !loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-xs">
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
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Generating Kendra operational report from MongoDB...</span>
        </div>
      ) : !report ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No report data generated</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          {/* Official Report Header */}
          <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">
                  Krishi Kendra Seva & Queue Center
                </h2>
                <p className="text-xs text-slate-500">Government Agricultural Services & Distribution Portal</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Daily Closing Report
              </span>
              <p className="text-xs text-slate-500 font-mono mt-1.5 flex items-center sm:justify-end gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(report.reportDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Key Metrics Section */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Queue Tokens</div>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{report.tokens.issued}</p>
              <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                <p>• {report.tokens.served} Served</p>
                <p>• {report.tokens.waiting} In Queue</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Revenue Today</div>
              <p className="text-2xl font-bold font-mono text-emerald-800 mt-1">
                ₹{report.sales.totalRevenue.toLocaleString('en-IN')}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">{report.sales.invoicesCount} Cash memos issued</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cash Collection</div>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                ₹{report.sales.cashRevenue.toLocaleString('en-IN')}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">Verified cash in drawer</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Digital / UPI</div>
              <p className="text-2xl font-bold font-mono text-blue-900 mt-1">
                ₹{report.sales.upiRevenue.toLocaleString('en-IN')}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">Bank settlement pending</p>
            </div>
          </div>

          {/* Top Selling Products & Low Stock Warnings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Top Items Sold */}
            <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Top Products Distributed Today</span>
              </h4>

              {report.topSoldItems.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No sales logged today yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {report.topSoldItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{item.quantity} units</span>
                        <span className="text-[10px] text-slate-400 block font-mono">₹{item.amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Stock Items */}
            <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Inventory Requiring Replenishment</span>
              </h4>

              {report.lowStockItems.length === 0 ? (
                <div className="text-xs text-emerald-700 py-4 text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All warehouse stock levels are healthy.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {report.lowStockItems.map((item) => (
                    <div key={item.code} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        <span className="block text-[10px] font-mono text-slate-400">{item.code}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-700">
                          {item.stock} {item.unit}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Min: {item.minThreshold}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Signature Section for Print */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div>
              <p className="text-slate-400 text-[11px]">Compiled By:</p>
              <p className="font-bold text-slate-800 mt-1">Kisan Kendra Digital System</p>
              <p className="text-[10px] text-slate-400">Database: MongoDB Atlas Verified</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-[11px]">Center Officer In-Charge:</p>
              <div className="mt-6 border-b border-dashed border-slate-400 w-48 ml-auto" />
              <p className="text-[10px] text-slate-400 mt-1">Signature & Official Stamp</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
