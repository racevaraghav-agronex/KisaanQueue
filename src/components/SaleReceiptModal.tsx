import React, { useState } from 'react';
import { SaleRecord } from '../types.ts';
import { Printer, X, Receipt, Check, Copy, ShieldCheck, IndianRupee } from 'lucide-react';
import { numberToWordsRupees } from '../utils/numberToWords.ts';

interface SaleReceiptModalProps {
  sale: SaleRecord;
  onClose: () => void;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({ sale, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Print not supported in this environment:', e);
    }
  };

  const handleCopySummary = () => {
    const lines = [
      `*** KRISHI SEVA KENDRA - RETAIL CASH MEMO ***`,
      `Invoice: ${sale.invoiceNumber}`,
      `Date: ${new Date(sale.date).toLocaleString('en-IN')}`,
      `Farmer: ${sale.farmerName} (${sale.farmerPhone || 'N/A'})`,
      `Token: ${sale.tokenNumber || 'Walk-in'}`,
      `Items:`,
      ...(sale.items || []).map(
        (it, idx) => `  ${idx + 1}. ${it.productName} (${it.productCode}) - ${it.quantity} ${it.unit} @ ₹${it.rate} = ₹${it.amount}`
      ),
      `Subtotal: ₹${(sale.subtotal || 0).toLocaleString('en-IN')}`,
      sale.discount ? `Discount / Subsidy: -₹${sale.discount.toLocaleString('en-IN')}` : null,
      `Total Payable: ₹${(sale.total || 0).toLocaleString('en-IN')}`,
      `Payment Mode: ${sale.paymentMethod || 'Cash'}`,
      sale.paymentReference ? `Payment Ref: ${sale.paymentReference}` : null,
      sale.paymentStatus === 'pending' ? `Status: PENDING / PAY LATER` : `Status: PAID`,
      `Operator: ${sale.staffName}`,
      `*** THANK YOU - KISAN SEVA KENDRA ***`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const items = Array.isArray(sale.items) ? sale.items : [];
  const saleDate = sale.date ? new Date(sale.date) : new Date();
  const isPayLater = sale.paymentStatus === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden relative my-6">
        
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white px-5 py-3.5 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <span className="text-xs font-bold font-heading uppercase tracking-wider block">Krishi Seva Kendra</span>
              <span className="text-[10px] text-emerald-300">Official Retail Cash Memo / Tax Invoice</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopySummary}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer border border-slate-700"
              title="Copy bill summary to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Bill Paper */}
        <div className="p-5 sm:p-6 text-slate-900 font-mono text-xs space-y-3.5 bg-white print:p-0">
          
          {/* Kendra Header */}
          <div className="text-center space-y-0.5 border-b-2 border-dashed border-slate-300 pb-3">
            <div className="flex items-center justify-center space-x-1.5 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 inline" />
              <span>GOVT. APPROVED INPUT DISTRIBUTION CENTRE</span>
            </div>
            <div className="text-lg font-black tracking-tight font-heading text-slate-950">
              KRISHI SEVA KENDRA
            </div>
            <div className="text-[11px] font-semibold text-slate-700">
              कृषि सेवा केंद्र • Authorized Retail Center
            </div>
            <div className="text-[10px] text-slate-500 font-sans">
              Fertilizers, Certified Seeds, Bio-Nutrients & Farm Supplies
            </div>
            <div className="text-[9px] text-slate-400 font-sans flex items-center justify-center gap-2 pt-0.5">
              <span>Lic: DL-AGRI/2026/08892</span>
              <span>•</span>
              <span>GSTIN: 07AAAKK1234F1Z8</span>
              <span>•</span>
              <span>Kendra ID: KSK-NORTH-01</span>
            </div>
          </div>

          {/* Invoice & Farmer Metadata */}
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 text-[11px] space-y-1.5">
            <div className="flex justify-between items-center border-b border-slate-200/80 pb-1">
              <div>
                <span className="text-slate-500">Invoice No: </span>
                <span className="font-bold font-mono text-slate-950">{sale.invoiceNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Date: </span>
                <span className="font-medium">
                  {saleDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                  {saleDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 pt-0.5">
              <div>
                <span className="text-slate-500">Farmer: </span>
                <span className="font-bold text-slate-900">{sale.farmerName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Queue Token: </span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                  {sale.tokenNumber || 'Walk-in'}
                </span>
              </div>
              {sale.farmerPhone && (
                <div>
                  <span className="text-slate-500">Mobile: </span>
                  <span className="font-mono text-slate-800">{sale.farmerPhone}</span>
                </div>
              )}
              <div className="text-right">
                <span className="text-slate-500">POS Counter: </span>
                <span className="font-medium text-slate-800">Counter Desk</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border-t-2 border-b-2 border-dashed border-slate-300 py-2">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <th className="pb-1.5 w-6">#</th>
                  <th className="pb-1.5">Item & SKU</th>
                  <th className="pb-1.5 text-center">Qty</th>
                  <th className="pb-1.5 text-right">Govt Rate</th>
                  <th className="pb-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1.5 text-slate-400 text-[10px]">{idx + 1}</td>
                    <td className="py-1.5 pr-2">
                      <div className="font-sans font-semibold text-[11px] text-slate-900 leading-tight">
                        {it.productName}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        SKU: {it.productCode} • {it.unit}
                      </div>
                    </td>
                    <td className="py-1.5 text-center font-bold text-slate-800">
                      {it.quantity} <span className="text-[9px] font-normal text-slate-500">{it.unit}</span>
                    </td>
                    <td className="py-1.5 text-right font-mono text-slate-600">
                      ₹{it.rate}
                    </td>
                    <td className="py-1.5 text-right font-mono font-bold text-slate-900">
                      ₹{it.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown & Totals */}
          <div className="space-y-1 text-right text-xs pt-1">
            <div className="flex justify-between items-center text-slate-600 text-[11px]">
              <span>Subtotal:</span>
              <span className="font-mono">₹{(sale.subtotal || 0).toLocaleString('en-IN')}</span>
            </div>

            {Boolean(sale.discount && sale.discount > 0) && (
              <div className="flex justify-between items-center text-emerald-700 text-[11px]">
                <span>Subsidy / Special Concession:</span>
                <span className="font-mono">-₹{(sale.discount || 0).toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-slate-500 text-[10px]">
              <span>GST / Agri Taxes (Exempted):</span>
              <span className="font-mono">₹0.00</span>
            </div>

            <div className="flex justify-between items-center font-black text-base border-t-2 border-slate-900 pt-2 font-heading">
              <span className="text-slate-900">Grand Total Payable:</span>
              <span className="text-emerald-800 font-mono text-lg">
                ₹{(sale.total || 0).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Amount in words */}
            <div className="text-left text-[10px] text-slate-600 font-sans italic pt-1 border-t border-slate-100">
              <span className="font-bold text-slate-700 not-italic">In Words: </span>
              {numberToWordsRupees(sale.total || 0)}
            </div>
          </div>

          {/* Payment Details Box */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-bold uppercase text-slate-900">{sale.paymentMethod || 'Cash'}</span>
            </div>

            {sale.paymentReference && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ref / UTR / Txn ID:</span>
                <span className="font-mono font-bold text-slate-800">{sale.paymentReference}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment Status:</span>
              <span className={`font-bold px-1.5 py-0.2 rounded text-[9px] uppercase ${
                isPayLater ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
              }`}>
                {isPayLater ? 'PAY LATER (CREDIT / UDHAR)' : 'PAID IN FULL'}
              </span>
            </div>

            {sale.amountReceived !== undefined && sale.amountReceived > 0 && sale.paymentMethod === 'Cash' && (
              <div className="flex justify-between items-center text-slate-600 pt-0.5 border-t border-slate-200/60">
                <span>Cash Received: ₹{sale.amountReceived}</span>
                {Boolean(sale.changeGiven && sale.changeGiven > 0) && (
                  <span className="text-emerald-700 font-bold">Change Returned: ₹{sale.changeGiven}</span>
                )}
              </div>
            )}

            {sale.notes && (
              <div className="text-left text-[9px] text-slate-500 pt-1 border-t border-slate-200/60">
                <strong>Note: </strong>{sale.notes}
              </div>
            )}
          </div>

          {/* Statutory Declaration & Signatures */}
          <div className="pt-2 text-[9px] text-slate-500 font-sans space-y-3">
            <p className="leading-tight text-justify text-[8.5px] text-slate-400">
              * Declaration: Certified that the agricultural inputs supplied above comply with the Fertilizer (Control) Order & Seeds Act regulations. Goods sold at official admin rates. Keep away from children and store in a dry, ventilated area.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-slate-300 text-center text-[10px]">
              <div>
                <div className="h-7"></div>
                <div className="border-t border-slate-400 pt-0.5 font-semibold text-slate-700">
                  Farmer Signature / अंगूठा
                </div>
              </div>
              <div>
                <div className="h-7 flex items-center justify-center text-[9px] text-emerald-700 font-bold">
                  [Verified KSK Operator]
                </div>
                <div className="border-t border-slate-400 pt-0.5 font-semibold text-slate-900">
                  {sale.staffName || 'Authorized Staff'}
                </div>
              </div>
            </div>

            <div className="text-center pt-2 text-[9px] text-slate-400">
              Thank you for visiting Krishi Seva Kendra • Powered by Kisan Queue System
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
