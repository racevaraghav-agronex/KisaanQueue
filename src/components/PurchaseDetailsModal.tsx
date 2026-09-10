import React from 'react';
import { PurchaseRecord } from '../types.ts';
import { X, ShoppingBag, Calendar, User, FileText } from 'lucide-react';

interface PurchaseDetailsModalProps {
  purchase: PurchaseRecord;
  onClose: () => void;
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({ purchase, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-300 max-w-lg w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-emerald-800" />
            <span className="text-sm font-bold text-slate-800">Purchase Invoice Details</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Metadata Card */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-slate-700">
            <div>
              <span className="text-slate-400 block text-[11px]">Supplier / Agency</span>
              <span className="font-bold text-slate-900 text-sm">{purchase.supplier}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Invoice Number</span>
              <span className="font-mono font-bold text-slate-900">{purchase.invoiceNumber}</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-500 pt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {new Date(purchase.date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="flex items-center justify-end space-x-1 text-slate-500 pt-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Recorded by: {purchase.recordedBy}</span>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="font-bold text-slate-800 mb-1.5 uppercase text-[11px] tracking-wider">
              Itemized Inventory Breakdown ({purchase.items?.length || 0} items)
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3 text-center">Quantity</th>
                    <th className="py-2 px-3 text-right">Purchase Rate</th>
                    <th className="py-2 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchase.items && purchase.items.length > 0 ? (
                    purchase.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium text-slate-800">{it.productName}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          ₹{it.purchaseRate}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{it.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-slate-400">
                        No line item details available for this record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="font-bold text-slate-600">Total Purchase Value:</span>
            <span className="text-lg font-mono font-black text-slate-900">
              ₹{purchase.total.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
