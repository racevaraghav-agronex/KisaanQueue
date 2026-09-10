import React, { useState } from 'react';
import { TokenItem } from '../types.ts';
import { Printer, X, CheckCircle2, QrCode, ShieldCheck } from 'lucide-react';
import { QrCodeView } from './QrCodeView.tsx';
import { TokenVerifyModal } from './TokenVerifyModal.tsx';

interface TokenReceiptModalProps {
  token: TokenItem;
  onClose: () => void;
  isNew?: boolean;
}

export const TokenReceiptModal: React.FC<TokenReceiptModalProps> = ({ token, onClose, isNew }) => {
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Print not supported in iframe:', e);
    }
  };

  const tokenDate = token.issuedAt ? new Date(token.issuedAt) : new Date();
  const formattedDate = tokenDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = tokenDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-sm overflow-hidden shadow-2xl relative">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white px-5 py-3 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider font-heading">Digital Token Slip</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Slip */}
        <div className="p-6 font-mono text-xs text-slate-900 space-y-4 bg-white relative">
          {isNew && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center text-xs font-bold text-emerald-800 flex items-center justify-center space-x-1.5 print:hidden">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Token Generated Successfully!</span>
            </div>
          )}

          {/* Header */}
          <div className="text-center space-y-0.5 border-b-2 border-dashed border-slate-300 pb-3">
            <div className="text-base font-black tracking-tight font-heading text-slate-950">
              KISAN QUEUE
            </div>
            <div className="text-xs font-bold text-emerald-800">KRISHI SEVA KENDRA</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">
              Official Token Receipt • टोकन पर्ची
            </div>
          </div>

          {/* Big Token Number */}
          <div className="text-center py-2.5 border-b-2 border-dashed border-slate-300 bg-slate-50/70 rounded-xl">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Your Token Number</div>
            <div className="text-5xl font-black tracking-tight my-1 text-slate-950 font-heading">
              {token.tokenNumber}
            </div>
            <div className="text-xs font-bold font-sans text-emerald-800 mt-1">
              {token.serviceName}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 font-bold">
              Designated Desk: Counter 0{token.counterNumber || 1}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-[11px] border-b-2 border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Farmer Name:</span>
              <span className="font-bold text-slate-900">{token.farmerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mobile No:</span>
              <span className="font-semibold">{token.farmerPhone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Issued On:</span>
              <span>{formattedDate} • {formattedTime}</span>
            </div>
            {token.bookingReference && (
              <div className="flex justify-between">
                <span className="text-slate-500">Booking Ref:</span>
                <span className="font-bold text-slate-800">{token.bookingReference}</span>
              </div>
            )}
            {token.slotString && (
              <div className="flex justify-between">
                <span className="text-slate-500">Reserved Slot:</span>
                <span className="font-semibold text-slate-700">{token.slotString}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Est. Wait:</span>
              <span className="font-bold text-amber-600 font-mono">
                {token.estimatedWaitText || `~${token.estimatedWaitMinutes || 10} min`}
              </span>
            </div>
          </div>

          {/* Genuine QR Code & Verification Block */}
          <div className="text-center pt-2 flex flex-col items-center justify-center space-y-1.5">
            <QrCodeView value={token.tokenNumber} size={110} alt={`QR for ${token.tokenNumber}`} />
            <div className="text-[10px] text-slate-500 font-mono">
              Scan to verify token • {token.tokenNumber}
            </div>
            <button
              onClick={() => setShowVerifyModal(true)}
              className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold hover:underline inline-flex items-center space-x-1 cursor-pointer print:hidden"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-700" />
              <span>Verify Official Authenticity</span>
            </button>
          </div>

          {/* Simple footer note */}
          <div className="text-center text-[10px] text-slate-500 pt-2 leading-normal border-t border-slate-100">
            Please proceed to Counter 0{token.counterNumber || 1} when your token is announced on the Live Display.
          </div>
        </div>
      </div>

      {showVerifyModal && (
        <TokenVerifyModal
          reference={token.tokenNumber}
          onClose={() => setShowVerifyModal(false)}
        />
      )}
    </div>
  );
};
