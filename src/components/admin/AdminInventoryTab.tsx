import React, { useState, useEffect } from 'react';
import { ProductItem } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { EditStockModal } from '../EditStockModal.tsx';
import { 
  Boxes, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  RotateCw, 
  Package, 
  Layers, 
  IndianRupee,
  CheckCircle2,
  XCircle,
  Sliders,
  AlertCircle
} from 'lucide-react';

interface AdminInventoryTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminInventoryTab: React.FC<AdminInventoryTabProps> = ({ token, onNotification }) => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all');

  // Stock edit modal
  const [editingStockProduct, setEditingStockProduct] = useState<ProductItem | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await safeFetchJson<ProductItem[]>('/api/inventory/products', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && Array.isArray(res.data)) {
        setProducts(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to load inventory.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error while loading inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filtered list
  const filteredProducts = products.filter((p) => {
    const matchesSearch = !search.trim() || 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.code.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    return p.status === filter;
  });

  // Calculate metrics
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalValuation = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.purchaseRate || 0)), 0);
  const lowStockCount = products.filter((p) => p.status === 'low_stock').length;
  const outOfStockCount = products.filter((p) => p.status === 'out_of_stock').length;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Catalog Products</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{products.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">{totalStockUnits.toLocaleString('en-IN')} total units in warehouse</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Stock Valuation</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            ₹{totalValuation.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Based on procurement cost</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-2">{lowStockCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Below minimum reorder threshold</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Out of Stock</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600 mt-2">{outOfStockCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Immediate procurement needed</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Items ({products.length})
            </button>
            <button
              onClick={() => setFilter('low_stock')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'low_stock' ? 'bg-amber-100 text-amber-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Low Stock ({lowStockCount})
            </button>
            <button
              onClick={() => setFilter('out_of_stock')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'out_of_stock' ? 'bg-rose-100 text-rose-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Out of Stock ({outOfStockCount})
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Grid */}
      {error && !loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-xs">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchInventory}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Loading Inventory</span>
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading live warehouse inventory...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No items match criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const pct = Math.min(100, Math.round((prod.stock / (prod.minThreshold * 3 || 30)) * 100));
            const isLow = prod.status === 'low_stock';
            const isOut = prod.status === 'out_of_stock';

            return (
              <div
                key={prod._id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {prod.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{prod.name}</h4>
                      <p className="text-[11px] text-slate-400">{prod.category} • {prod.supplier || 'Kendra Depot'}</p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isOut
                        ? 'bg-rose-100 text-rose-800'
                        : isLow
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {prod.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono text-slate-900">
                      {prod.stock} <span className="text-xs font-sans font-normal text-slate-500">{prod.unit}</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      Threshold: <strong className="text-slate-600 font-mono">{prod.minThreshold}</strong>
                    </span>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Valuation: <strong className="text-slate-800 font-mono">₹{(prod.stock * prod.purchaseRate).toLocaleString('en-IN')}</strong>
                  </div>

                  <button
                    onClick={() => setEditingStockProduct(prod)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Adjust Stock</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Stock Modal */}
      {editingStockProduct && (
        <EditStockModal
          product={editingStockProduct}
          token={token}
          onClose={() => setEditingStockProduct(null)}
          onSuccess={(updated) => {
            onNotification({
              type: 'success',
              text: `Stock for ${updated.name} updated to ${updated.stock} ${updated.unit}.`
            });
            setEditingStockProduct(null);
            fetchInventory();
          }}
        />
      )}
    </div>
  );
};
