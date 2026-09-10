import React, { useState } from 'react';
import { ProductItem } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { X, Layers } from 'lucide-react';

interface EditStockModalProps {
  product: ProductItem;
  token: string;
  onClose: () => void;
  onSuccess: (updated: ProductItem) => void;
}

export const EditStockModal: React.FC<EditStockModalProps> = ({
  product,
  token,
  onClose,
  onSuccess
}) => {
  const [stock, setStock] = useState<number>(product.stock);
  const [sellingRate, setSellingRate] = useState<number>(product.sellingRate);
  const [purchaseRate, setPurchaseRate] = useState<number>(product.purchaseRate);
  const [minThreshold, setMinThreshold] = useState<number>(product.minThreshold || 10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stock < 0) {
      setError('Stock cannot be negative.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await safeFetchJson<{ product: ProductItem }>(`/api/inventory/products/${product._id}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stock: Number(stock),
          sellingRate: Number(sellingRate),
          purchaseRate: Number(purchaseRate),
          minThreshold: Number(minThreshold)
        })
      });

      if (res.ok && res.data?.product) {
        onSuccess(res.data.product);
      } else {
        setError(res.error || 'Failed to update stock.');
      }
    } catch (err: any) {
      setError(err.message || 'Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-300 max-w-sm w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-800" />
            <span className="text-sm font-bold text-slate-800">Update Stock & Rates</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="font-bold text-slate-800 text-sm">{product.name}</div>
            <div className="text-slate-500 font-mono mt-0.5 flex items-center space-x-2">
              <span>Code: {product.code}</span>
              <span>•</span>
              <span>Category: {product.category}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Stock Quantity ({product.unit})
            </label>
            <input
              type="number"
              min="0"
              required
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-sm focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Purchase Rate (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={purchaseRate}
                onChange={(e) => setPurchaseRate(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Selling Rate (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={sellingRate}
                onChange={(e) => setSellingRate(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-emerald-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Low Stock Alert Limit
            </label>
            <input
              type="number"
              min="1"
              value={minThreshold}
              onChange={(e) => setMinThreshold(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              {loading ? 'Saving...' : 'Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
