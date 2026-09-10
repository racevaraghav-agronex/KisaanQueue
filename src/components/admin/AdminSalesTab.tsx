import React, { useState, useEffect } from 'react';
import { SaleRecord } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { SaleReceiptModal } from '../SaleReceiptModal.tsx';
import { 
  Receipt, 
  Search, 
  IndianRupee, 
  Calendar, 
  RotateCw, 
  Printer, 
  Eye, 
  ShoppingBag,
  CreditCard,
  AlertCircle
} from 'lucide-react';

interface AdminSalesTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminSalesTab: React.FC<AdminSalesTabProps> = ({ token, onNotification }) => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'all'>('today');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Selected sale for receipt modal
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      if (paymentMethod !== 'all') params.append('paymentMethod', paymentMethod);

      const res = await safeFetchJson<{ sales: SaleRecord[]; totalRevenue: number }>(`/api/admin/sales?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && res.data) {
        setSales(res.data.sales || []);
        setTotalRevenue(res.data.totalRevenue || 0);
        setError(null);
      } else {
        setError(res.error || 'Failed to load sales ledger.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error while loading sales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [search, dateRange, paymentMethod]);

  return (
    <div className="space-y-6">
      {/* Revenue Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
            <Receipt className="w-4 h-4" />
            <span>Kendra Sales & Revenue Summary</span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-emerald-200 text-xs">
              from {sales.length} verified invoices
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setDateRange('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateRange === 'today' ? 'bg-white text-emerald-900' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Today's Sales
          </button>
          <button
            onClick={() => setDateRange('week')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateRange === 'week' ? 'bg-white text-emerald-900' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Past 7 Days
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateRange === 'all' ? 'bg-white text-emerald-900' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice #, farmer name, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="Cash">Cash Only</option>
            <option value="UPI">UPI Only</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Card">Card</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-semibold px-2">
          Invoices Listed: <span className="text-slate-900 font-bold font-mono">{sales.length}</span>
        </div>
      </div>

      {/* Sales Table */}
      {error && !loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-xs">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchSales}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Loading Sales</span>
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading sales ledger...</span>
        </div>
      ) : sales.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No sales transactions found</p>
          <p className="text-slate-400 mt-1">Adjust filters or date range.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Farmer Details</th>
                  <th className="px-4 py-3">Items Purchased</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Billed By</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-900">Total Amount</th>
                  <th className="px-4 py-3 text-right">View / Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{sale.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] font-mono">
                      {new Date(sale.date).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>
                        <span>{sale.farmerName}</span>
                        <span className="block text-[10px] font-mono text-slate-400">{sale.farmerPhone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[11px]">
                        <span className="font-semibold text-slate-700">{sale.items?.length || 0} item(s)</span>
                        <span className="text-slate-400 block truncate max-w-[160px]" title={sale.items?.map(i => `${i.productName} (${i.quantity})`).join(', ')}>
                          {sale.items?.map(i => i.productName).join(', ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        sale.paymentMethod === 'UPI'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {sale.paymentMethod || 'Cash'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">{sale.staffName || 'Staff'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-sm text-slate-900">
                      ₹{(sale.total || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto cursor-pointer transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Bill</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sale Receipt Modal */}
      {selectedSale && (
        <SaleReceiptModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
};
