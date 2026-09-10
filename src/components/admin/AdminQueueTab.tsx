import React, { useState, useEffect } from 'react';
import { TokenItem } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { TokenReceiptModal } from '../TokenReceiptModal.tsx';
import { 
  Clock, 
  Search, 
  Printer, 
  RotateCw, 
  User, 
  Phone, 
  Monitor, 
  CheckCircle2, 
  AlertCircle,
  Filter
} from 'lucide-react';

interface AdminQueueTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminQueueTab: React.FC<AdminQueueTabProps> = ({ token, onNotification }) => {
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [receiptToken, setReceiptToken] = useState<TokenItem | null>(null);

  const fetchQueue = async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await safeFetchJson<TokenItem[]>(`/api/admin/queue?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && Array.isArray(res.data)) {
        setTokens(res.data);
        setError(null);
      } else if (!res.ok) {
        setError(res.error || 'Failed to load queue tokens.');
      }
    } catch (err: any) {
      console.warn('Queue sync error:', err);
      setError(err?.message || 'Connection error while updating queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [search, statusFilter]);

  const waitingCount = tokens.filter(t => t.status === 'waiting').length;
  const servingCount = tokens.filter(t => t.status === 'serving').length;
  const completedCount = tokens.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Live queue status banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Waiting in Line</p>
            <p className="text-2xl font-bold font-mono text-blue-950 mt-1">{waitingCount}</p>
          </div>
          <Clock className="w-6 h-6 text-blue-600" />
        </div>

        <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">At Active Counters</p>
            <p className="text-2xl font-bold font-mono text-amber-950 mt-1">{servingCount}</p>
          </div>
          <Monitor className="w-6 h-6 text-amber-600" />
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Served Today</p>
            <p className="text-2xl font-bold font-mono text-emerald-950 mt-1">{completedCount}</p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search token #, farmer name, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Tokens</option>
            <option value="waiting">Waiting Only</option>
            <option value="serving">Serving Only</option>
            <option value="completed">Completed Only</option>
            <option value="skipped">Skipped Only</option>
          </select>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Sync Active</span>
        </div>
      </div>

      {/* Tokens List */}
      {error && !loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-xs">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchQueue}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Loading Queue</span>
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading queue tokens...</span>
        </div>
      ) : tokens.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No tokens found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Token #</th>
                  <th className="px-4 py-3">Farmer Details</th>
                  <th className="px-4 py-3">Requested Service</th>
                  <th className="px-4 py-3">Desk / Counter</th>
                  <th className="px-4 py-3">Issued Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tokens.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-base text-emerald-800">
                      {t.tokenNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>
                        <span>{t.farmerName}</span>
                        <span className="block text-[11px] font-mono text-slate-400 font-normal">{t.farmerPhone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{t.serviceName}</td>
                    <td className="px-4 py-3">
                      {t.counterNumber ? (
                        <span className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                          Counter 0{t.counterNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(t.issuedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'serving'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : t.status === 'waiting'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setReceiptToken(t)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Print / View Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Token Receipt Modal */}
      {receiptToken && (
        <TokenReceiptModal
          token={receiptToken}
          onClose={() => setReceiptToken(null)}
        />
      )}
    </div>
  );
};
