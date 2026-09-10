import React, { useState } from 'react';
import { ProductItem } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { X, PackagePlus } from 'lucide-react';

interface AddProductModalProps {
  token: string;
  onClose: () => void;
  onSuccess: (product: ProductItem) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ token, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Fertilizer');
  const [unit, setUnit] = useState('Bag');
  const [stock, setStock] = useState<number>(50);
  const [purchaseRate, setPurchaseRate] = useState<number>(250);
  const [sellingRate, setSellingRate] = useState<number>(280);
  const [minThreshold, setMinThreshold] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Product Name and Item Code are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await safeFetchJson<{ product: ProductItem }>('/api/inventory/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          category,
          unit,
          stock: Number(stock),
          purchaseRate: Number(purchaseRate),
          sellingRate: Number(sellingRate),
          minThreshold: Number(minThreshold)
        })
      });

      if (res.ok && res.data?.product) {
        onSuccess(res.data.product);
      } else {
        setError(res.error || 'Failed to add product to catalog.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-300 max-w-md w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PackagePlus className="w-4 h-4 text-emerald-800" />
            <span className="text-sm font-bold text-slate-800">Add New Agricultural Product</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Zinc Sulphate 21% (5kg)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Item Code / SKU *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ZN-21-5KG"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              >
                <option value="Fertilizer">Fertilizer</option>
                <option value="Seeds">Seeds</option>
                <option value="Equipment">Equipment</option>
                <option value="Micro-nutrients">Micro-nutrients</option>
                <option value="Pesticides">Pesticides</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              >
                <option value="Bag">Bag</option>
                <option value="Packet">Packet</option>
                <option value="Bottle">Bottle</option>
                <option value="Kg">Kg</option>
                <option value="Litre">Litre</option>
                <option value="Unit">Unit</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Opening Stock
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

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

            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Triggers warning badge when stock drops to or below this level.
              </span>
            </div>
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
              {loading ? 'Adding Product...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
