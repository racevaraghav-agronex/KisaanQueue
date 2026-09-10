import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/api.ts';
import { 
  CreditCard, 
  Wallet, 
  IndianRupee, 
  RotateCw, 
  CheckCircle2, 
  ArrowUpRight, 
  Receipt,
  Smartphone,
  Banknote,
  Building
} from 'lucide-react';

interface PaymentBreakdownItem {
  method: string;
  amount: number;
  count: number;
}

interface PaymentsData {
  breakdown: PaymentBreakdownItem[];
  totalCollected: number;
  totalTransactions: number;
}

interface AdminPaymentsTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminPaymentsTab: React.FC<AdminPaymentsTabProps> = ({ token, onNotification }) => {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await safeFetchJson<PaymentsData>('/api/admin/payments', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && res.data) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to load payments overview.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error while loading payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalCollected = data?.totalCollected || 0;
  const totalTransactions = data?.totalTransactions || 0;
  const breakdown = data?.breakdown || [];

  const getMethodIcon = (method: string) => {
    if (method.toLowerCase().includes('upi')) return <Smartphone className="w-5 h-5 text-blue-600" />;
    if (method.toLowerCase().includes('bank')) return <Building className="w-5 h-5 text-purple-600" />;
    return <Banknote className="w-5 h-5 text-emerald-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Wallet className="w-4 h-4" />
            <span>Kendra Financial Collections & Settlements</span>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold font-mono text-white mt-2">
            ₹{totalCollected.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Total verified collections across {totalTransactions} successful transactions in MongoDB
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Accounts</span>
        </button>
      </div>

      {/* Payment Methods Cards */}
      {error && !loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-xs">
          <CreditCard className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchPayments}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Loading Payments</span>
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Calculating payment breakdowns...</span>
        </div>
      ) : breakdown.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No payment records found yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {breakdown.map((item) => {
            const percentage = totalCollected > 0 ? Math.round((item.amount / totalCollected) * 100) : 0;
            return (
              <div
                key={item.method}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                        {getMethodIcon(item.method)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.method}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">{item.count} bills issued</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-slate-100 text-slate-700">
                      {percentage}%
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-2xl font-bold font-mono text-slate-900">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </p>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Reconciliation Status</span>
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified in DB</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reconciliation Guidelines */}
      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 text-xs text-emerald-900 space-y-2">
        <h4 className="font-bold flex items-center gap-1.5 text-emerald-950">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>Daily Cash & UPI Settlement Policy</span>
        </h4>
        <p className="text-emerald-800 leading-relaxed">
          All counter sales are directly recorded into MongoDB Atlas with official sequential invoice numbers. Cash collected at desks 1 through 6 should match the Cash Collections figure above at daily Kendra closing.
        </p>
      </div>
    </div>
  );
};
