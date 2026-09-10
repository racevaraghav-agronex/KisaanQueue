import React, { useState, useEffect } from 'react';
import { User, TokenItem, SaleRecord } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { 
  Tractor, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Receipt, 
  Phone, 
  Mail, 
  Calendar, 
  X, 
  RotateCw,
  Eye,
  AlertCircle
} from 'lucide-react';

interface AdminFarmersTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminFarmersTab: React.FC<AdminFarmersTabProps> = ({ token, onNotification }) => {
  const [farmers, setFarmers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Selected Farmer details modal
  const [selectedFarmer, setSelectedFarmer] = useState<User | null>(null);
  const [farmerTokens, setFarmerTokens] = useState<TokenItem[]>([]);
  const [farmerSales, setFarmerSales] = useState<SaleRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'tokens' | 'sales'>('tokens');

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await safeFetchJson<User[]>(`/api/admin/farmers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && Array.isArray(res.data)) {
        setFarmers(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to load farmers directory.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error while loading farmers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, [search, statusFilter]);

  const handleToggleStatus = async (farmer: User) => {
    const targetStatus = farmer.status === 'inactive' ? 'active' : 'inactive';
    try {
      const res = await safeFetchJson<{ message?: string }>(`/api/admin/farmers/${farmer._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });

      if (res.ok) {
        onNotification({
          type: 'success',
          text: `Farmer ${farmer.name} is now ${targetStatus}.`
        });
        fetchFarmers();
        if (selectedFarmer?._id === farmer._id) {
          setSelectedFarmer({ ...selectedFarmer, status: targetStatus });
        }
      } else {
        onNotification({ type: 'error', text: res.error || 'Failed to update farmer status' });
      }
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error updating status' });
    }
  };

  const openFarmerHistory = async (farmer: User) => {
    setSelectedFarmer(farmer);
    setLoadingHistory(true);
    setHistoryTab('tokens');

    try {
      const [tokensRes, salesRes] = await Promise.all([
        safeFetchJson<TokenItem[]>(`/api/admin/farmers/${farmer._id}/tokens`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        safeFetchJson<SaleRecord[]>(`/api/admin/farmers/${farmer._id}/sales`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (tokensRes.ok && Array.isArray(tokensRes.data)) {
        setFarmerTokens(tokensRes.data);
      }
      if (salesRes.ok && Array.isArray(salesRes.data)) {
        setFarmerSales(salesRes.data);
      }
    } catch (err: any) {
      console.warn('Error loading farmer history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by farmer name, mobile number or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Farmers</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Inactive Accounts</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-semibold px-2">
          Total Registered: <span className="text-slate-900 font-bold font-mono">{farmers.length}</span>
        </div>
      </div>

      {/* Farmers List */}
      {error && !loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-xs">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchFarmers}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Loading Farmers</span>
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading farmers directory...</span>
        </div>
      ) : farmers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Tractor className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No farmers found</p>
          <p className="text-slate-400 mt-1">Adjust your search query or filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Farmer Name</th>
                  <th className="px-4 py-3">Mobile Contact</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {farmers.map((farmer) => (
                  <tr key={farmer._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs">
                          {farmer.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{farmer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{farmer.phone}</td>
                    <td className="px-4 py-3 text-slate-500">{farmer.email}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {farmer.createdAt ? new Date(farmer.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        farmer.status === 'inactive'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {farmer.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openFarmerHistory(farmer)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>History</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(farmer)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            farmer.status === 'inactive'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          {farmer.status === 'inactive' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Deactivate</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Farmer History Modal */}
      {selectedFarmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden relative">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Tractor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{selectedFarmer.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1 font-mono"><Phone className="w-3 h-3" /> {selectedFarmer.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedFarmer.email}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFarmer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* History Tabs */}
            <div className="border-b border-slate-200 bg-slate-50 px-5 flex gap-4 text-xs font-bold">
              <button
                onClick={() => setHistoryTab('tokens')}
                className={`py-3 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  historyTab === 'tokens' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Tokens Issued ({farmerTokens.length})</span>
              </button>
              <button
                onClick={() => setHistoryTab('sales')}
                className={`py-3 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  historyTab === 'sales' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Purchases & Billing ({farmerSales.length})</span>
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto">
              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Loading farmer history...</span>
                </div>
              ) : historyTab === 'tokens' ? (
                farmerTokens.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400">No token history found for this farmer.</p>
                ) : (
                  <div className="space-y-2.5">
                    {farmerTokens.map((t) => (
                      <div key={t._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-700 font-mono text-sm">{t.tokenNumber}</span>
                            <span className="font-semibold text-slate-800">{t.serviceName}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Issued: {new Date(t.issuedAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'serving'
                            ? 'bg-amber-100 text-amber-800'
                            : t.status === 'waiting'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                farmerSales.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400">No purchase records found for this farmer.</p>
                ) : (
                  <div className="space-y-2.5">
                    {farmerSales.map((sale) => (
                      <div key={sale._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono">{sale.invoiceNumber}</span>
                            <span className="text-slate-500 font-medium">
                              ({sale.items?.length || 0} items)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(sale.date).toLocaleString('en-IN')} • Paid via {sale.paymentMethod}
                          </p>
                        </div>
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          ₹{(sale.total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedFarmer(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
