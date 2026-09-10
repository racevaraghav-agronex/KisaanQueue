import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { BookingItem, SlotItem } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { Calendar, Clock, AlertCircle, X, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';

interface RescheduleBookingModalProps {
  booking: BookingItem;
  onClose: () => void;
  onSuccess: (updatedBooking: BookingItem) => void;
}

export const RescheduleBookingModal: React.FC<RescheduleBookingModalProps> = ({
  booking,
  onClose,
  onSuccess
}) => {
  const { token } = useAuth();

  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const [newDate, setNewDate] = useState<string>(booking.date >= todayStr ? booking.date : todayStr);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Quick dates for next 7 days
  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateVal = `${y}-${m}-${day}`;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    const subLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return { dateVal, label, subLabel };
  });

  const fetchSlots = async () => {
    setSlotsLoading(true);
    setError(null);
    setSelectedSlot(null);

    try {
      const res = await safeFetchJson<{
        slots: SlotItem[];
        error?: string;
      }>(`/api/slots/availability?serviceId=${encodeURIComponent(booking.serviceCode)}&date=${newDate}`);

      if (res.ok && res.data && Array.isArray(res.data.slots)) {
        setSlots(res.data.slots);
      } else {
        setError(res.error || res.data?.error || 'Failed to load slot availability.');
        setSlots([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Network error.');
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [newDate]);

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedSlot) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await safeFetchJson<{
        booking: BookingItem;
        message?: string;
        error?: string;
      }>(`/api/bookings/${booking._id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          newDate,
          newStartTime: selectedSlot.startTime,
          newEndTime: selectedSlot.endTime
        })
      });

      if (!res.ok || !res.data?.booking) {
        setError(res.error || res.data?.error || 'Failed to reschedule booking.');
        fetchSlots();
      } else {
        onSuccess(res.data.booking);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred while rescheduling.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-emerald-800 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-200" />
            <div>
              <h3 className="text-sm font-bold tracking-wide font-heading">
                Reschedule Appointment
              </h3>
              <p className="text-[11px] text-emerald-200">
                Booking: {booking.bookingReference} • {booking.serviceName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleRescheduleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Current Booking Pill */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-medium">Current Appointment:</span>
              <span className="font-bold text-slate-800 font-mono">
                {booking.date} • {booking.slotString}
              </span>
            </div>

            {/* Select New Date */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Select New Date
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              {/* Quick Date Pills */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {quickDates.map((q) => {
                  const isSelected = newDate === q.dateVal;
                  return (
                    <button
                      key={q.dateVal}
                      type="button"
                      onClick={() => setNewDate(q.dateVal)}
                      className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{q.label}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {q.subLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select New Slot */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Select Available Slot for {newDate}
              </label>

              {slotsLoading ? (
                <div className="py-6 text-center space-y-1 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Checking slot availability...</p>
                </div>
              ) : slots.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No slots available for this date.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    const isAvailable = slot.status === 'AVAILABLE';

                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-600/30 text-emerald-950 font-bold'
                            : isAvailable
                            ? 'bg-white hover:bg-emerald-50/40 hover:border-emerald-300 border-slate-200 text-slate-800 cursor-pointer'
                            : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-mono font-bold">{slot.slotString}</div>
                          <div className="text-[10px] text-slate-500">{slot.capacity} seats</div>
                        </div>
                        <div>
                          {isAvailable ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {slot.availableSeats} open
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                              {slot.status}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <span>{submitting ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
