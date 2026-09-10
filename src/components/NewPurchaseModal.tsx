import React, { useState } from 'react';
import { ProductItem, PurchaseRecord } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { X, Plus, Trash2, ShoppingBag, AlertCircle } from 'lucide-react';

interface NewPurchaseModalProps {
  products: ProductItem[];
  token: string;
  onClose: () => void;
  onSuccess: (purchase: PurchaseRecord) => void;
}

interface PurchaseLineItem {
  productId?: string;
  productName: string;
  productCode?: string;
  category?: string;
  unit?: string;
  quantity: number;
  purchaseRate: number;
  amount: number;
  isCustom?: boolean;
}

const COMMON_SUPPLIERS = [
  'National Fertilizers Ltd (NFL)',
  'IFFCO Agro Supplies',
  'State Seeds Corporation',
  'Krishi Rasayan Exports Pvt Ltd',
  'Hindustan Insecticides Ltd',
  'KRIBHCO Cooperative Society'
];

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  products,
  token,
  onClose,
  onSuccess
}) => {
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<PurchaseLineItem[]>([
    {
      productId: products[0]?._id || '',
      productName: products[0]?.name || '',
      productCode: products[0]?.code || '',
      quantity: 50,
      purchaseRate: products[0]?.purchaseRate || 250,
      amount: 50 * (products[0]?.purchaseRate || 250),
      isCustom: false
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Line item change handlers
  const handleItemSelect = (index: number, prodId: string) => {
    const updated = [...items];
    if (prodId === '__NEW_ITEM__') {
      updated[index] = {
        productName: '',
        productCode: '',
        category: 'Fertilizer',
        unit: 'Bag',
        quantity: 50,
        purchaseRate: 200,
        amount: 10000,
        isCustom: true
      };
    } else {
      const prod = products.find(p => p._id === prodId);
      if (prod) {
        updated[index] = {
          productId: prod._id,
          productName: prod.name,
          productCode: prod.code,
          unit: prod.unit,
          quantity: updated[index].quantity || 50,
          purchaseRate: prod.purchaseRate,
          amount: (updated[index].quantity || 50) * prod.purchaseRate,
          isCustom: false
        };
      }
    }
    setItems(updated);
  };

  const handleUpdateItem = (index: number, field: keyof PurchaseLineItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'purchaseRate') {
      const q = Math.max(1, Number(current.quantity || 0));
      const r = Math.max(0, Number(current.purchaseRate || 0));
      current.amount = q * r;
    }
    updated[index] = current;
    setItems(updated);
  };

  const handleAddNewLine = () => {
    const defaultProd = products[0];
    setItems([
      ...items,
      {
        productId: defaultProd?._id,
        productName: defaultProd?.name || 'Supply Item',
        productCode: defaultProd?.code,
        quantity: 25,
        purchaseRate: defaultProd?.purchaseRate || 200,
        amount: 25 * (defaultProd?.purchaseRate || 200),
        isCustom: false
      }
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((acc, it) => acc + (it.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim()) {
      setError('Please provide Supplier Name.');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productName.trim()) {
        setError(`Please select or name product for item #${i + 1}`);
        return;
      }
      if (it.quantity <= 0) {
        setError(`Quantity for item #${i + 1} must be greater than 0.`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await safeFetchJson<{ purchase: PurchaseRecord }>('/api/inventory/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          supplier: supplier.trim(),
          invoiceNumber: invoiceNumber.trim() || undefined,
          items: items.map(it => ({
            productId: it.productId,
            productName: it.productName.trim(),
            productCode: it.productCode?.trim().toUpperCase(),
            category: it.category || 'Fertilizer',
            unit: it.unit || 'Bag',
            quantity: Number(it.quantity),
            purchaseRate: Number(it.purchaseRate)
          }))
        })
      });

      if (res.ok && res.data?.purchase) {
        onSuccess(res.data.purchase);
      } else {
        setError(res.error || 'Failed to record purchase invoice.');
      }
    } catch (err: any) {
      setError(err.message || 'Error recording purchase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-300 max-w-2xl w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-emerald-800" />
            <span className="text-sm font-bold text-slate-800">Record Inward Stock Purchase</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier & Invoice No. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supplier Name / Agency *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. National Fertilizers Ltd"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                list="supplier-suggestions"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
              <datalist id="supplier-suggestions">
                {COMMON_SUPPLIERS.map((s, i) => (
                  <option key={i} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supplier Invoice Number
              </label>
              <input
                type="text"
                placeholder="e.g. PUR-2026-9812 (Auto if blank)"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono uppercase focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Purchased Line Items ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddNewLine}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer border border-slate-300"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-800" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-xs">
                      Item #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Remove line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    {/* Product Selection */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-500 mb-0.5 font-medium">
                        Product
                      </label>
                      {!item.isCustom ? (
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                        >
                          <option value="">Choose existing product...</option>
                          {products.map(p => (
                            <option key={p._id} value={p._id}>
                              {p.name} ({p.code}) — Current Stock: {p.stock}
                            </option>
                          ))}
                          <option value="__NEW_ITEM__">+ Enter New / Uncatalogued Product...</option>
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            required
                            placeholder="Enter product name (e.g. Zinc Sulphate 21%)"
                            value={item.productName}
                            onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleItemSelect(idx, products[0]?._id || '')}
                            className="text-[10px] text-emerald-800 hover:underline font-medium"
                          >
                            ← Switch back to existing catalog product
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5 font-medium">
                        Quantity ({item.unit || 'Units'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                      />
                    </div>

                    {/* Rate */}
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5 font-medium">
                        Purchase Rate (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        value={item.purchaseRate}
                        onChange={(e) => handleUpdateItem(idx, 'purchaseRate', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-slate-600 font-semibold pt-1">
                    Line Total: ₹{(item.amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer & Grand Total */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div>
              <span className="text-slate-500 text-xs">Total Inward Value:</span>
              <span className="text-base font-mono font-bold text-slate-900 ml-2">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || items.length === 0}
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                {loading ? 'Recording Purchase...' : 'Save & Increment Stock'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
