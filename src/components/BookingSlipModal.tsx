import React from 'react';
import { BookingItem } from '../types.ts';
import { Printer, X, Calendar, Clock, MapPin, CheckCircle2, ShieldCheck, Ticket } from 'lucide-react';

interface BookingSlipModalProps {
  booking: BookingItem;
  onClose: () => void;
}

export const BookingSlipModal: React.FC<BookingSlipModalProps> = ({ booking, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = (() => {
    try {
      const parts = booking.date.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
      return booking.date;
    } catch {
      return booking.date;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-emerald-800 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="text-sm font-bold tracking-wide">Krishi Seva Kendra</h3>
              <p className="text-[10px] text-emerald-200 font-medium">Official Appointment Slip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Slip Content */}
        <div id="printable-booking-slip" className="p-6 space-y-4 overflow-y-auto text-slate-800">
          {/* Reference Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Booking Reference</span>
            <div className="text-2xl font-black font-mono text-emerald-900 tracking-wider">
              {booking.bookingReference}
            </div>
            <div className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="uppercase">{booking.status}</span>
            </div>
          </div>

          {/* Linked Token Badge if available */}
          {booking.tokenNumber && (
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Ticket className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="text-[10px] font-bold text-emerald-900 uppercase">Queue Token Issued</span>
                  <p className="text-xs text-emerald-700 font-medium">Valid for service desk queue</p>
                </div>
              </div>
              <div className="text-xl font-black font-mono text-emerald-950 bg-white px-3 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                {booking.tokenNumber}
              </div>
            </div>
          )}

          {/* Core Appointment Details */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Farmer Name</span>
              <span className="font-bold text-slate-900">{booking.farmerName}</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Contact Phone</span>
              <span className="font-mono text-slate-800">{booking.farmerPhone || '—'}</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Service</span>
              <span className="font-bold text-emerald-800 text-right">{booking.serviceName}</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Date
              </span>
              <span className="font-semibold text-slate-900">{formattedDate}</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Slot Timing
              </span>
              <span className="font-bold font-mono text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {booking.slotString}
              </span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" /> Centre
              </span>
              <span className="font-medium text-slate-700 text-right">{booking.centre}</span>
            </div>

            {booking.rescheduledFrom && (
              <div className="p-3 bg-amber-50/60 text-amber-900 text-[11px]">
                <span className="font-semibold">Rescheduled from:</span> {booking.rescheduledFrom}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-slate-50 rounded-xl p-3.5 text-[11px] text-slate-600 space-y-1 border border-slate-200/80">
            <p className="font-bold text-slate-800">Important Instructions for Farmer:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
              <li>Please arrive 10 minutes before your scheduled slot.</li>
              <li>Carry valid photo ID (Aadhaar / Kisan Passbook / 7/12 extract).</li>
              <li>Show this booking reference or token at the verification desk.</li>
            </ul>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Appointment Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
