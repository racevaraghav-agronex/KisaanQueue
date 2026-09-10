import React, { useState, useEffect } from 'react';
import { ProductItem, PriceHistoryItem } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { 
  IndianRupee, 
  Search, 
  History, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  X, 
  Calendar, 
  User, 
  TrendingUp, 
  TrendingDown,
  Tag
} from 'lucide-react';

interface AdminRateListTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminRateListTab: React.FC<AdminRateListTabProps> = ({ token, onNotification }) => {
  const [rates, setRates] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Rate change modal
  const [editingRateItem, setEditingRateItem] = useState<ProductItem | null>(null);
  const [newSellingRate, setNewSellingRate] = useState<number>(0);
  const [savingRate, setSavingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  // Price history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<PriceHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<ProductItem | null>(null);

  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const res = await safeFetchJson<ProductItem[]>(`/api/admin/rates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && Array.isArray(res.data)) {
        setRates(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to load rate list.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error while loading rates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [search, categoryFilter]);

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRateItem) return;
    setRateError(null);

    const rateNum = Number(newSellingRate);
    if (isNaN(rateNum) || rateNum < 0) {
      setRateError('Rate must be a positive number.');
      return;
    }

    try {
      setSavingRate(true);
      const res = await safeFetchJson<{ message?: string; product?: ProductItem }>(`/api/admin/rates/${editingRateItem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sellingRate: rateNum })
      });

      if (res.ok && res.data?.product) {
        onNotification({
          type: 'success',
          text: `Selling rate for ${res.data.product.name} updated to ₹${rateNum}. Previous invoices retain original rates.`
        });
        setEditingRateItem(null);
        fetchRates();
      } else {
        setRateError(res.error || 'Failed to update rate.');
      }
    } catch (err: any) {
      setRateError(err.message || 'Network error.');
    } finally {
      setSavingRate(false);
    }
  };

  const openHistoryModal = async (product?: ProductItem) => {
    setSelectedProductForHistory(product || null);
    setShowHistoryModal(true);
    setLoadingHistory(true);

    try {
      const url = product
        ? `/api/admin/rates/history?productId=${product._id}`
        : '/api/admin/rates/history';

      const res = await safeFetchJson<PriceHistoryItem[]>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err: any) {
      console.warn('Error fetching rate audit history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Fertilizer">Fertilizers</option>
            <option value="Seed">Seeds</option>
            <option value="Pesticide">Pesticides</option>
            <option value="Tool">Tools</option>
            <option value="Bio-Inputs">Bio-Inputs</option>
          </select>
        </div>

        <button
          onClick={() => openHistoryModal()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <History className="w-4 h-4 text-emerald-700" />
          <span>View Audit History</span>
        </button>
      </div>

      {/* Rates Table */}
      {error && !loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-xs">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchRates}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Loading Rates</span>
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading rate list...</span>
        </div>
      ) : rates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Tag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No rate entries found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Cost Price (₹)</th>
                  <th className="px-4 py-3 text-right font-bold text-emerald-800">Official Selling Rate (₹)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.map((prod) => (
                  <tr key={prod._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{prod.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{prod.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {prod.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{prod.unit}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">₹{prod.purchaseRate}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 text-sm">
                      ₹{prod.sellingRate}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        prod.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {prod.isActive !== false ? 'Active Rate' : 'Discontinued'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingRateItem(prod);
                            setNewSellingRate(prod.sellingRate);
                            setRateError(null);
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Update Rate</span>
                        </button>

                        <button
                          onClick={() => openHistoryModal(prod)}
                          title="View price history for this product"
                          className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
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

      {/* Edit Rate Modal */}
      {editingRateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden relative">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Update Official Rate</h3>
                  <p className="text-[11px] text-slate-400">{editingRateItem.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRateItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRate} className="p-5 space-y-4">
              {rateError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{rateError}</span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Current Selling Rate:</span>
                  <span className="font-bold text-slate-800 font-mono">₹{editingRateItem.sellingRate}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Procurement Cost:</span>
                  <span className="font-mono">₹{editingRateItem.purchaseRate}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Selling Rate (₹ / {editingRateItem.unit}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newSellingRate}
                    onChange={(e) => setNewSellingRate(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold font-mono text-emerald-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Updating will record an audit trail in MongoDB. Previous customer receipts remain intact.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={savingRate}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {savingRate ? 'Updating Rate...' : 'Confirm Rate Update'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRateItem(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price History Audit Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden relative">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {selectedProductForHistory ? `Price Audit: ${selectedProductForHistory.name}` : 'Rate Change Audit Log'}
                  </h3>
                  <p className="text-[11px] text-slate-400">All price changes recorded in MongoDB with timestamp and admin actor</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto">
              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Loading audit records...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <p className="font-semibold text-slate-600">No price changes recorded yet</p>
                  <p className="mt-1">When an administrator alters a product's selling price, it will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyList.map((entry) => {
                    const isIncrease = entry.newPrice > entry.oldPrice;
                    return (
                      <div
                        key={entry._id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{entry.productName}</span>
                            <span className="font-mono text-[11px] text-slate-400 font-medium">({entry.productCode})</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(entry.changedAt).toLocaleString('en-IN')}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Changed by: <strong className="text-slate-700">{entry.changedBy}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right font-mono">
                            <span className="text-slate-400 line-through text-[11px]">₹{entry.oldPrice}</span>
                            <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                              {isIncrease ? (
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                              )}
                              <span>₹{entry.newPrice}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
