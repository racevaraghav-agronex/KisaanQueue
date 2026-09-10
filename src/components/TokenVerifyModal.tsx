import React, { useEffect, useState } from 'react';
import { TokenVerificationResult } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { QrCodeView } from './QrCodeView.tsx';
import { 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Building2, 
  Layers, 
  RotateCw, 
  ExternalLink 
} from 'lucide-react';

interface TokenVerifyModalProps {
  reference: string;
  onClose: () => void;
}

export const TokenVerifyModal: React.FC<TokenVerifyModalProps> = ({ reference, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<TokenVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await safeFetchJson<TokenVerificationResult>(`/api/tokens/verify/${encodeURIComponent(reference)}`);
      if (res.ok && res.data && res.data.valid) {
        setData(res.data);
      } else {
        setError(res.error || res.data?.error || 'Verification reference not found or expired.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to verification registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reference) {
      fetchVerification();
    }
  }, [reference]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white px-5 py-4 border-b border-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold font-heading uppercase tracking-wide">
                Token Authentication & Status
              </h3>
              <p className="text-[11px] text-emerald-300">
                Official Kisan Queue Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-800/80 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-600 font-medium">Verifying reference with MongoDB Atlas registry...</p>
            </div>
          ) : error || !data ? (
            <div className="py-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <div className="font-bold text-slate-900 text-sm">Verification Failed</div>
              <p className="text-slate-600 max-w-xs mx-auto">
                {error || 'No genuine record found for reference: ' + reference}
              </p>
              <button
                onClick={fetchVerification}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry Verification</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Authenticity Badge */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center space-x-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-xs uppercase tracking-wide">
                    Authentic AgroNex Record
                  </div>
                  <div className="text-[11px] text-emerald-700 font-mono">
                    Seal: {data.verificationSeal || 'AN-KQ-AUTHENTIC'}
                  </div>
                </div>
              </div>

              {/* Token Display with QR */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    Token Reference
                  </div>
                  <div className="text-3xl font-black text-slate-950 font-mono">
                    {data.tokenNumber}
                  </div>
                  {data.bookingReference && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      Booking: <span className="font-bold text-slate-800">{data.bookingReference}</span>
                    </div>
                  )}
                  <div className="inline-block mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      data.status === 'SERVING'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse'
                        : data.status === 'WAITING'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : data.status === 'COMPLETED'
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {data.status}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center">
                  <QrCodeView value={data.tokenNumber || data.reference} size={90} />
                  <span className="text-[9px] text-slate-400 mt-1 font-mono">Safe QR</span>
                </div>
              </div>

              {/* Verified Metadata */}
              <div className="space-y-2 border-y border-slate-100 py-3 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Agricultural Service:</span>
                  <span className="font-bold text-slate-900 text-right">{data.serviceName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Service Center:</span>
                  <span className="font-medium text-slate-800 text-right">{data.centre || 'Krishi Seva Kendra - Main Centre'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Date / Slot:</span>
                  <span className="font-mono text-slate-800">
                    {data.date} {data.slotString ? `• ${data.slotString}` : ''}
                  </span>
                </div>
                {data.counterNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Assigned Desk:</span>
                    <span className="font-bold text-emerald-800">Counter 0{data.counterNumber}</span>
                  </div>
                )}
                {data.issuedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Issued Timestamp:</span>
                    <span className="font-mono text-slate-600">
                      {new Date(data.issuedAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Privacy protection notice */}
              <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                <span className="font-semibold text-slate-700">Privacy Guarantee: </span>
                This public verification view safeguards farmer data. Sensitive details such as passwords, Aadhaar, and phone numbers are never transmitted over public verification endpoints.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={fetchVerification}
            disabled={loading}
            className="text-emerald-800 hover:text-emerald-950 font-semibold text-xs flex items-center space-x-1 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
