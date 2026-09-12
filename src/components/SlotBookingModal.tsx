import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ServiceItem, SlotItem, BookingItem } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Printer, 
  Layers, 
  MapPin, 
  Ticket, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw,
  Building2,
  Sparkles
} from 'lucide-react';

interface SlotBookingModalProps {
  services: ServiceItem[];
  preselectedServiceId?: string;
  onClose: () => void;
  onBookingSuccess: (booking: BookingItem) => void;
}

export const SlotBookingModal: React.FC<SlotBookingModalProps> = ({
  services,
  preselectedServiceId,
  onClose,
  onBookingSuccess
}) => {
  const { token, user } = useAuth();

  // 1. Service Selection State
  const initialService = preselectedServiceId || services[0]?.code || services[0]?.id || services[0]?._id || 'FS';
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialService);

  // 2. Date Selection State: default today
  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // 3. Slots State
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Smart Kendra Recommendation State (Batch 8C)
  const [kendraRec, setKendraRec] = useState<any>(null);
  const [loadingKendraRec, setLoadingKendraRec] = useState<boolean>(false);

  // 4. Submission & Confirmation
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingItem | null>(null);

  // Generate date options for the next 7 days for quick pill clicks
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

  // Fetch slot availability whenever selected service or date changes
  const fetchAvailability = async () => {
    if (!selectedServiceId || !selectedDate) return;
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedSlot(null);

    try {
      const res = await safeFetchJson<{
        slots: SlotItem[];
        error?: string;
      }>(`/api/slots/availability?serviceId=${encodeURIComponent(selectedServiceId)}&date=${selectedDate}`);

      if (res.ok && res.data && Array.isArray(res.data.slots)) {
        setSlots(res.data.slots);
      } else {
        setSlotsError(res.error || res.data?.error || 'Failed to load slot availability.');
        setSlots([]);
      }
    } catch (err: any) {
      setSlotsError(err?.message || 'Network error while fetching slots.');
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const fetchKendraRec = async () => {
    if (!token || !selectedServiceId) return;
    try {
      setLoadingKendraRec(true);
      const res = await safeFetchJson<any>(`/api/ai/recommendations/kendra?serviceCode=${encodeURIComponent(selectedServiceId)}&date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setKendraRec(res.data);
      }
    } catch {
      // Non-blocking advisory evaluation
    } finally {
      setLoadingKendraRec(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
    fetchKendraRec();
  }, [selectedServiceId, selectedDate, token]);

  // Handle Confirm Booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await safeFetchJson<{
        booking: BookingItem;
        token?: any;
        message?: string;
        error?: string;
      }>('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          date: selectedDate,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          notes: notes.trim()
        })
      });

      if (!res.ok || !res.data?.booking) {
        setSubmitError(res.error || res.data?.error || 'Failed to complete booking. Please try again.');
        // Refresh availability in case slot got filled concurrently
        fetchAvailability();
      } else {
        setConfirmedBooking(res.data.booking);
        onBookingSuccess(res.data.booking);
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Connection error while saving appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedServiceObj = services.find(
    s => (s.code && s.code.toUpperCase() === selectedServiceId.toUpperCase()) || s.id === selectedServiceId || s._id === selectedServiceId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-emerald-800 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center border border-emerald-600">
              <Calendar className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide font-heading">
                Book Service Slot Appointment
              </h2>
              <p className="text-[11px] text-emerald-200">
                Krishi Seva Kendra • Official Time-Slot Reservation
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

        {/* STEP 2: CONFIRMATION VIEW (IF BOOKING IS CONFIRMED) */}
        {confirmedBooking ? (
          <div className="p-6 overflow-y-auto space-y-5">
            <div className="text-center py-4 space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Appointment Successfully Confirmed!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your time slot has been secured at Krishi Seva Kendra. Please review your booking details below.
              </p>
            </div>

            {/* Reference Badge Card */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 rounded-2xl border border-emerald-300 p-5 text-center shadow-xs space-y-1">
              <span className="text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                Official Booking Reference
              </span>
              <div className="text-3xl font-black font-mono text-emerald-950">
                {confirmedBooking.bookingReference}
              </div>
              <p className="text-xs text-emerald-700 font-medium">
                Farmer: <span className="font-bold">{confirmedBooking.farmerName}</span> • {confirmedBooking.farmerPhone}
              </p>
            </div>

            {/* Digital Token Info (if appointment was for today and token was linked) */}
            {confirmedBooking.tokenNumber && (
              <div className="bg-emerald-800 text-white rounded-xl p-4 flex items-center justify-between shadow-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5 text-emerald-200 text-xs font-semibold">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Active Queue Token</span>
                  </div>
                  <div className="text-xs text-emerald-100">
                    Your digital token has been registered in the live queue.
                  </div>
                </div>
                <div className="text-2xl font-black font-mono bg-white text-emerald-950 px-3.5 py-1 rounded-lg shadow-sm">
                  {confirmedBooking.tokenNumber}
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium block">Service Required</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {confirmedBooking.serviceName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Centre Location</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {confirmedBooking.centre}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Appointment Date</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {new Date(confirmedBooking.date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Reserved Slot</span>
                <span className="font-mono font-bold text-emerald-800 mt-0.5 block">
                  {confirmedBooking.slotString}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 border border-slate-300 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Done & View in My Bookings
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1: BOOKING FORM & SLOT SELECTION */
          <form onSubmit={handleConfirmBooking} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              
              {/* Top Alert or Error */}
              {submitError && (
                <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* 1. SERVICE SELECTOR */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  <span>1. Select Service</span>
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer shadow-2xs"
                >
                  {services.map((svc) => {
                    const code = svc.code || svc.id || svc._id || 'FS';
                    return (
                      <option key={code} value={code}>
                        {svc.name} ({svc.category || 'General'}) • ~{svc.averageMinutes || 10} min
                      </option>
                    );
                  })}
                </select>
                {selectedServiceObj && (
                  <p className="text-[11px] text-slate-500 pl-1">
                    {selectedServiceObj.description}
                  </p>
                )}
              </div>

              {/* 2. DATE SELECTOR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>2. Select Appointment Date</span>
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                {/* Quick Date Pills */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {quickDates.map((q) => {
                    const isSelected = selectedDate === q.dateVal;
                    return (
                      <button
                        key={q.dateVal}
                        type="button"
                        onClick={() => setSelectedDate(q.dateVal)}
                        className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs ring-2 ring-emerald-600/30'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="text-[11px] font-bold leading-tight">{q.label}</div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {q.subLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SMART KENDRA RECOMMENDATION (BATCH 8C) */}
              {kendraRec && kendraRec.recommendedCentre && (
                <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3.5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-teal-100 border border-teal-300 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-teal-800" />
                      </div>
                      <span className="text-xs font-bold text-teal-950">
                        Recommended Kendra: {kendraRec.recommendedCentre.centreName}
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200 self-start sm:self-auto">
                      {kendraRec.recommendedCentre.operationalStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div className="bg-white/80 p-2 rounded-xl border border-teal-100">
                      <span className="text-[10px] text-teal-800 font-medium block">Service Queue</span>
                      <strong className="text-slate-900">{kendraRec.recommendedCentre.serviceQueueWaiting} waiting</strong>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl border border-teal-100">
                      <span className="text-[10px] text-teal-800 font-medium block">Estimated Wait (ETA)</span>
                      <strong className="text-teal-900">{kendraRec.recommendedCentre.estimatedWaitText}</strong>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl border border-teal-100 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-teal-800 font-medium block">Distance</span>
                      <span className="text-slate-500 font-medium text-[11px]">Not recorded in GPS</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-teal-900/80 flex items-center gap-1.5 pt-0.5">
                    <ShieldCheck className="w-3 h-3 text-teal-700 shrink-0" />
                    <span>Real-time Kendra recommendation • Zero fabricated distances</span>
                  </div>
                </div>
              )}

              {/* 3. AVAILABLE TIME SLOTS GRID */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>3. Available Time Slots</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {slots.filter(s => s.status === 'AVAILABLE').length} of {slots.length} available
                  </span>
                </div>

                {/* Status Guide Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 py-1 border-b border-slate-100">
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Available</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                    <span>Full (0 seats)</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
                    <span>Expired / Past</span>
                  </span>
                </div>

                {/* Slots Loading State */}
                {slotsLoading ? (
                  <div className="py-8 text-center space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <RefreshCw className="w-5 h-5 text-emerald-700 animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">Calculating real-time slot availability...</p>
                  </div>
                ) : slotsError ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{slotsError}</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    No operating slots available for the selected date.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      const isAvailable = slot.status === 'AVAILABLE';
                      const isFull = slot.status === 'FULL';
                      const isExpired = slot.status === 'EXPIRED';
                      const isClosed = slot.status === 'CLOSED';

                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-600/30 text-emerald-950 font-bold shadow-xs'
                              : isAvailable
                              ? 'bg-white hover:bg-emerald-50/50 hover:border-emerald-300 border-slate-200 text-slate-800 cursor-pointer'
                              : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-mono font-bold tracking-tight">
                              {slot.slotString}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Capacity: {slot.capacity} seats
                            </div>
                          </div>

                          {/* State Badges */}
                          <div>
                            {isAvailable && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {slot.availableSeats} open
                              </span>
                            )}
                            {isFull && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                FULL
                              </span>
                            )}
                            {isExpired && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                                EXPIRED
                              </span>
                            )}
                            {isClosed && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                CLOSED
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. SELECTED SLOT SUMMARY & OPTIONAL NOTES */}
              {selectedSlot && (
                <div className="bg-slate-50/90 border border-slate-200 p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-slate-600">Selected Appointment:</span>
                    <span className="font-bold text-emerald-900 font-mono">
                      {selectedSlot.slotString} ({selectedDate})
                    </span>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Optional notes for Kendra staff (e.g. Subsidy inquiry, DAP fertilizer bags)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !selectedSlot}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-xs cursor-pointer"
              >
                <span>{submitting ? 'Confirming Slot...' : 'Confirm Slot Booking'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
