import React, { useState, useEffect } from 'react';
import { ProductItem } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { 
  Package, 
  Search, 
  Plus, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RotateCw, 
  X, 
  IndianRupee,
  Layers,
  Archive,
  Boxes,
  AlertCircle
} from 'lucide-react';

interface AdminProductsTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminProductsTab: React.FC<AdminProductsTabProps> = ({ token, onNotification }) => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCode, setAddCode] = useState('');
  const [addCategory, setAddCategory] = useState('Fertilizer');
  const [addUnit, setUnit] = useState('Bag');
  const [addStock, setAddStock] = useState<number>(50);
  const [addPurchaseRate, setAddPurchaseRate] = useState<number>(250);
  const [addSellingRate, setAddSellingRate] = useState<number>(280);
  const [addMinThreshold, setAddMinThreshold] = useState<number>(20);
  const [addSupplier, setAddSupplier] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editPurchaseRate, setEditPurchaseRate] = useState<number>(0);
  const [editSellingRate, setEditSellingRate] = useState<number>(0);
  const [editMinThreshold, setEditMinThreshold] = useState<number>(10);
  const [editSupplier, setEditSupplier] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await safeFetchJson<ProductItem[]>(`/api/admin/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && Array.isArray(res.data)) {
        setProducts(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to load products catalog.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error while loading products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter, statusFilter]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addName.trim() || !addCode.trim()) {
      setAddError('Product Name and SKU Code are required.');
      return;
    }

    try {
      setSubmittingAdd(true);
      const res = await safeFetchJson<{ message?: string; product?: ProductItem }>('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: addName.trim(),
          code: addCode.trim().toUpperCase(),
          category: addCategory,
          unit: addUnit,
          stock: Number(addStock),
          purchaseRate: Number(addPurchaseRate),
          sellingRate: Number(addSellingRate),
          minThreshold: Number(addMinThreshold),
          supplier: addSupplier.trim(),
          description: addDescription.trim(),
          isActive: true
        })
      });

      if (res.ok && res.data?.product) {
        onNotification({ type: 'success', text: `Product "${res.data.product.name}" added to catalog!` });
        setShowAddModal(false);
        setAddName('');
        setAddCode('');
        setAddStock(50);
        setAddPurchaseRate(250);
        setAddSellingRate(280);
        setAddMinThreshold(20);
        setAddSupplier('');
        setAddDescription('');
        fetchProducts();
      } else {
        setAddError(res.error || 'Failed to create product.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Network error.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('Product name is required.');
      return;
    }

    try {
      setSubmittingEdit(true);
      const res = await safeFetchJson<{ message?: string; product?: ProductItem }>(`/api/admin/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory,
          unit: editUnit,
          purchaseRate: Number(editPurchaseRate),
          sellingRate: Number(editSellingRate),
          minThreshold: Number(editMinThreshold),
          supplier: editSupplier.trim(),
          description: editDescription.trim(),
          isActive: editIsActive
        })
      });

      if (res.ok && res.data?.product) {
        onNotification({ type: 'success', text: `Product "${res.data.product.name}" updated successfully!` });
        setEditingProduct(null);
        fetchProducts();
      } else {
        setEditError(res.error || 'Failed to update product.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Network error.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async (prod: ProductItem) => {
    const targetStatus = !(prod.isActive !== false);

    try {
      const res = await safeFetchJson<{ message?: string }>(`/api/admin/products/${prod._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: targetStatus })
      });

      if (res.ok) {
        onNotification({
          type: 'success',
          text: `Product "${prod.name}" is now ${targetStatus ? 'Active' : 'Inactive'}`
        });
        fetchProducts();
      } else {
        onNotification({ type: 'error', text: res.error || 'Failed to toggle status' });
      }
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error updating status' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
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
            <option value="Fertilizer">Fertilizer</option>
            <option value="Seed">Seeds</option>
            <option value="Pesticide">Pesticide</option>
            <option value="Tool">Tools & Equipment</option>
            <option value="Bio-Inputs">Bio-Inputs</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Stock Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            setAddError(null);
          }}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Products Table */}
      {error && !loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-xs">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Loading Products</span>
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading products catalog...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No products found</p>
          <p className="text-slate-400 mt-1">Try clearing filters or add a new product.</p>
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
                  <th className="px-4 py-3 text-right">Available Stock</th>
                  <th className="px-4 py-3 text-right">Purchase (₹)</th>
                  <th className="px-4 py-3 text-right">Selling Rate (₹)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => {
                  const isActive = prod.isActive !== false;
                  return (
                    <tr key={prod._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{prod.code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div>
                          <span>{prod.name}</span>
                          {prod.supplier && (
                            <span className="block text-[10px] text-slate-400">Supplier: {prod.supplier}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {prod.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {prod.stock} {prod.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">₹{prod.purchaseRate}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">₹{prod.sellingRate}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            !isActive
                              ? 'bg-slate-100 text-slate-600'
                              : prod.status === 'out_of_stock'
                              ? 'bg-rose-100 text-rose-800'
                              : prod.status === 'low_stock'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {!isActive ? 'Inactive' : prod.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(prod);
                              setEditName(prod.name);
                              setEditCategory(prod.category);
                              setEditUnit(prod.unit);
                              setEditPurchaseRate(prod.purchaseRate);
                              setEditSellingRate(prod.sellingRate);
                              setEditMinThreshold(prod.minThreshold);
                              setEditSupplier(prod.supplier || '');
                              setEditDescription(prod.description || '');
                              setEditIsActive(prod.isActive !== false);
                              setEditError(null);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(prod)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              !isActive
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            }`}
                          >
                            {!isActive ? (
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden relative">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Add New Agricultural Product</h3>
                  <p className="text-[11px] text-slate-400">Include in official Kendra catalog & inventory</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Urea Nitrogen 46%"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UREA-46"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="Fertilizer">Fertilizer</option>
                    <option value="Seed">Seed</option>
                    <option value="Pesticide">Pesticide</option>
                    <option value="Tool">Tool / Equipment</option>
                    <option value="Bio-Inputs">Bio-Inputs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    placeholder="Bag, Kg, Liter, Packet"
                    value={addUnit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={addStock}
                    onChange={(e) => setAddStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={addPurchaseRate}
                    onChange={(e) => setAddPurchaseRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Rate (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={addSellingRate}
                    onChange={(e) => setAddSellingRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Threshold Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={addMinThreshold}
                    onChange={(e) => setAddMinThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Supplier / Agency</label>
                  <input
                    type="text"
                    placeholder="e.g. IFFCO / National Seeds"
                    value={addSupplier}
                    onChange={(e) => setAddSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Government approved subsidy specifications or crop usage..."
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {submittingAdd ? 'Saving Product...' : 'Add Product to Catalog'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden relative">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Edit Product</h3>
                  <p className="text-[11px] text-slate-400">{editingProduct.code} • {editingProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editPurchaseRate}
                    onChange={(e) => setEditPurchaseRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Rate (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editSellingRate}
                    onChange={(e) => setEditSellingRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Threshold Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={editMinThreshold}
                    onChange={(e) => setEditMinThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Active Status</label>
                  <select
                    value={editIsActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditIsActive(e.target.value === 'active')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
                <input
                  type="text"
                  value={editSupplier}
                  onChange={(e) => setEditSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {submittingEdit ? 'Saving...' : 'Update Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
