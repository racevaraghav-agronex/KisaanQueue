import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ServiceItem, TokenItem, SaleRecord, BookingItem } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { TokenReceiptModal } from './TokenReceiptModal.tsx';
import { SaleReceiptModal } from './SaleReceiptModal.tsx';
import { SlotBookingModal } from './SlotBookingModal.tsx';
import { RescheduleBookingModal } from './RescheduleBookingModal.tsx';
import { BookingSlipModal } from './BookingSlipModal.tsx';
import { QrCodeView } from './QrCodeView.tsx';
import { TokenVerifyModal } from './TokenVerifyModal.tsx';
import { FarmerProcurementSection } from './FarmerProcurementSection.tsx';
import { FarmerNotificationsTab } from './FarmerNotificationsTab.tsx';
import { useNotifications } from '../context/NotificationContext.tsx';
import { 
  RefreshCw,
  Printer,
  Ticket,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  MapPin,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  QrCode,
  Wheat,
  ShoppingBag,
  Bell
} from 'lucide-react';

interface FarmerDashboardProps {
  services: ServiceItem[];
  preselectedServiceId?: string;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ services, preselectedServiceId }) => {
  const { user, token } = useAuth();

  const [activeToken, setActiveToken] = useState<TokenItem | null>(null);
  const [currentlyServing, setCurrentlyServing] = useState<TokenItem[]>([]);
  const [pastTokens, setPastTokens] = useState<TokenItem[]>([]);
  const [purchases, setPurchases] = useState<SaleRecord[]>([]);

  // Slot Bookings State
  const [bookings, setBookings] = useState<{
    all: BookingItem[];
    upcoming: BookingItem[];
    completed: BookingItem[];
    cancelled: BookingItem[];
    expired: BookingItem[];
  }>({
    all: [],
    upcoming: [],
    completed: [],
    cancelled: [],
    expired: []
  });
  const [bookingFilterTab, setBookingFilterTab] = useState<'upcoming' | 'completed' | 'cancelled' | 'expired' | 'all'>('upcoming');
  const [showSlotBookingModal, setShowSlotBookingModal] = useState<boolean>(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingItem | null>(null);
  const [selectedSlipBooking, setSelectedSlipBooking] = useState<BookingItem | null>(null);

  // Token Generation form state
  const defaultInitialSvc = preselectedServiceId || services[0]?.code || services[0]?.id || services[0]?._id || 'fert-seeds';
  const [selectedServiceId, setSelectedServiceId] = useState<string>(defaultInitialSvc);
  const [showGetTokenForm, setShowGetTokenForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync default service when services array updates
  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      setSelectedServiceId(services[0].code || services[0].id || services[0]._id || 'FS');
    }
  }, [services, selectedServiceId]);

  // Receipt and Verification Modals
  const [receiptToken, setReceiptToken] = useState<TokenItem | null>(null);
  const [receiptSale, setReceiptSale] = useState<SaleRecord | null>(null);
  const [verifyReference, setVerifyReference] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'queue' | 'procurement' | 'purchases' | 'notifications'>('queue');
  const { unreadCount } = useNotifications();

  // Auto-detect ?verify= in URL if user opened scanned QR link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('verify');
      if (v) {
        setVerifyReference(v);
      }
    }
  }, []);

  // Fetch farmer data
  const fetchFarmerData = async () => {
    if (!token) return;
    try {
      // 1. Fetch tokens
      const res = await safeFetchJson<{
        activeToken: TokenItem | null;
        currentlyServing: TokenItem[];
        pastTokens: TokenItem[];
      }>('/api/tokens/farmer/my-token', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok && res.data) {
        setActiveToken(res.data.activeToken);
        setCurrentlyServing(res.data.currentlyServing || []);
        setPastTokens(res.data.pastTokens || []);
      }

      // 2. Fetch bookings
      const bookingsRes = await safeFetchJson<{
        all: BookingItem[];
        upcoming: BookingItem[];
        completed: BookingItem[];
        cancelled: BookingItem[];
        expired: BookingItem[];
      }>('/api/bookings/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (bookingsRes.ok && bookingsRes.data) {
        setBookings({
          all: bookingsRes.data.all || [],
          upcoming: bookingsRes.data.upcoming || [],
          completed: bookingsRes.data.completed || [],
          cancelled: bookingsRes.data.cancelled || [],
          expired: bookingsRes.data.expired || []
        });
      }

      // 3. Fetch purchases for this farmer
      const salesRes = await safeFetchJson<SaleRecord[]>('/api/inventory/sales', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (salesRes.ok && Array.isArray(salesRes.data)) {
        const farmerSales = salesRes.data.filter(
          s => s.farmerId === user?._id || (user?.phone && s.farmerPhone === user.phone) || s.farmerName === user?.name
        );
        setPurchases(farmerSales);
      }
    } catch (err) {
      console.warn('Notice: Failed syncing farmer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerData();
    const interval = setInterval(fetchFarmerData, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Generate Token directly
  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await safeFetchJson<{
        token: TokenItem;
        existingToken?: TokenItem;
        message?: string;
        error?: string;
      }>('/api/tokens/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ serviceId: selectedServiceId })
      });

      if (!res.ok || !res.data?.token) {
        setStatusMessage({
          type: 'error',
          text: res.error || res.data?.error || 'Failed to generate token.'
        });
        if (res.data?.existingToken) {
          setActiveToken(res.data.existingToken);
        }
      } else {
        setStatusMessage({
          type: 'success',
          text: `Token ${res.data.token.tokenNumber} issued successfully.`
        });
        setActiveToken(res.data.token);
        setReceiptToken(res.data.token);
        setShowGetTokenForm(false);
        fetchFarmerData();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Token
  const handleCancelToken = async () => {
    if (!token || !activeToken) return;
    if (!window.confirm(`Are you sure you want to cancel token ${activeToken.tokenNumber}?`)) return;

    setActionLoading(true);
    try {
      const res = await safeFetchJson(`/api/tokens/${activeToken._id}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Cancelled by farmer' })
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Token ${activeToken.tokenNumber} cancelled.` });
        setActiveToken(null);
        fetchFarmerData();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to cancel token.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error cancelling token.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Slot Booking
  const handleCancelBooking = async (booking: BookingItem) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to cancel your appointment (${booking.bookingReference}) for ${booking.slotString} on ${booking.date}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await safeFetchJson(`/api/bookings/${booking._id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Cancelled by farmer' })
      });

      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `Appointment ${booking.bookingReference} cancelled successfully.`
        });
        fetchFarmerData();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to cancel appointment.'
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error cancelling appointment.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Check-in on Appointment Day to get token
  const handleCheckinBooking = async (booking: BookingItem) => {
    if (!token) return;

    setActionLoading(true);
    try {
      const res = await safeFetchJson<{
        token: TokenItem;
        message?: string;
        error?: string;
      }>(`/api/bookings/${booking._id}/checkin-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok && res.data?.token) {
        setStatusMessage({
          type: 'success',
          text: `Queue Token ${res.data.token.tokenNumber} checked in for your appointment!`
        });
        setActiveToken(res.data.token);
        setReceiptToken(res.data.token);
        fetchFarmerData();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || res.data?.error || 'Check-in is only available on appointment day.'
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error during check-in.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Find currently serving token for this service or counter 1
  const activeServing = currentlyServing.find(
    t => t.serviceId === activeToken?.serviceId || t.counterNumber === (activeToken?.counterNumber || 1)
  ) || currentlyServing[0];

  const peopleAhead = activeToken?.positionInQueue !== undefined
    ? Math.max(0, activeToken.positionInQueue)
    : 0;

  // Next upcoming booking
  const nextAppointment = bookings.upcoming[0] || null;

  // Current filtered bookings list
  const displayedBookings = (() => {
    if (bookingFilterTab === 'upcoming') return bookings.upcoming;
    if (bookingFilterTab === 'completed') return bookings.completed;
    if (bookingFilterTab === 'cancelled') return bookings.cancelled;
    if (bookingFilterTab === 'expired') return bookings.expired;
    return bookings.all;
  })();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* 1. TOP GREETING & PRIMARY ACTIONS */}
      <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Welcome, {user?.name || 'Farmer'}
          </h1>
          <p className="text-xs text-slate-500">
            Mobile: {user?.phone || 'Not registered'} • Krishi Seva Kendra Token & Slot Desk
          </p>
        </div>

        {/* Primary Slot Booking & Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSlotBookingModal(true)}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-emerald-200" />
            <span>Book Service Slot</span>
          </button>

          {!activeToken && !showGetTokenForm && (
            <button
              onClick={() => setShowGetTokenForm(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-emerald-700" />
              <span>Instant Token</span>
            </button>
          )}
        </div>
      </div>

      {/* Status feedback */}
      {statusMessage && (
        <div className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <span>{statusMessage.text}</span>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold px-2 py-0.5 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* FARMER DESK SUB-NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 text-xs font-semibold overflow-x-auto bg-slate-100/90 rounded-2xl p-1.5 space-x-1.5 shadow-inner">
        <button
          onClick={() => setActiveMainTab('queue')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeMainTab === 'queue'
              ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/90 ring-1 ring-emerald-500/10'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Ticket className="w-4 h-4 text-emerald-600" />
          <span>Queue & Appointments</span>
          {activeToken && (
            <span className="ml-1 bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Active: {activeToken.tokenNumber}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('procurement')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeMainTab === 'procurement'
              ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/90 ring-1 ring-emerald-500/10'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Wheat className="w-4 h-4 text-emerald-600" />
          <span>Produce Procurement & Weighment</span>
          <span className="ml-1 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
            Phase 4
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('purchases')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeMainTab === 'purchases'
              ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/90 ring-1 ring-emerald-500/10'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          <span>Purchase Bills</span>
          {purchases.length > 0 && (
            <span className="ml-1 bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {purchases.length}
            </span>
          )}
        </button>

        <button
          id="farmer-notifs-tab-btn"
          onClick={() => setActiveMainTab('notifications')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeMainTab === 'notifications'
              ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/90 ring-1 ring-emerald-500/10'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-600" />
          <span>Alerts & Notifications</span>
          {unreadCount > 0 && (
            <span className="ml-1 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeMainTab === 'queue' && (
        <div className="space-y-6">
          {/* 2. UPCOMING APPOINTMENT BANNER (IF FARMER HAS A BOOKING) */}
      {nextAppointment && (
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-700/60 pb-3">
            <div className="flex items-center space-x-2">
              <CalendarCheck className="w-4 h-4 text-emerald-300" />
              <span className="text-xs font-bold tracking-wider text-emerald-200 uppercase font-heading">
                Upcoming Appointment
              </span>
            </div>
            <span className="text-[11px] font-mono bg-emerald-950/60 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-700">
              Ref: {nextAppointment.bookingReference}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold font-heading text-white">
                {nextAppointment.serviceName}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                  <span>
                    {new Date(nextAppointment.date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="font-mono font-bold bg-emerald-950/40 px-2 py-0.5 rounded">
                    {nextAppointment.slotString}
                  </span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{nextAppointment.centre}</span>
                </span>
              </div>
            </div>

            {/* Linked Token or Check-in Button */}
            {nextAppointment.tokenNumber ? (
              <div className="bg-emerald-950/50 border border-emerald-700 rounded-xl p-3 text-center sm:text-right shrink-0">
                <span className="text-[10px] text-emerald-300 uppercase font-bold block">Live Token</span>
                <span className="text-xl font-black font-mono text-white">{nextAppointment.tokenNumber}</span>
              </div>
            ) : (
              <button
                onClick={() => handleCheckinBooking(nextAppointment)}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer shrink-0"
              >
                Check-in on Arrival
              </button>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-700/60 text-xs">
            <button
              onClick={() => setSelectedSlipBooking(nextAppointment)}
              className="px-3 py-1.5 bg-emerald-700/60 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>View / Print Slip</span>
            </button>

            <button
              onClick={() => setRescheduleBooking(nextAppointment)}
              className="px-3 py-1.5 bg-emerald-700/60 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reschedule Slot</span>
            </button>

            <button
              onClick={() => handleCancelBooking(nextAppointment)}
              disabled={actionLoading}
              className="px-3 py-1.5 text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 rounded-lg font-semibold transition-colors cursor-pointer ml-auto"
            >
              Cancel Appointment
            </button>
          </div>
        </div>
      )}

      {/* 3. ACTIVE QUEUE TOKEN SECTION */}
      {activeToken ? (
        <div className={`rounded-2xl border p-6 sm:p-7 shadow-md space-y-5 transition-all ${
          activeToken.status === 'serving'
            ? 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 border-emerald-400 ring-2 ring-emerald-500/20'
            : (activeToken.isTurnNear || (activeToken.peopleAhead !== undefined && activeToken.peopleAhead <= 2))
              ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200'
        }`}>
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                activeToken.status === 'serving' 
                  ? 'bg-emerald-500 animate-ping' 
                  : (activeToken.isTurnNear || (activeToken.peopleAhead !== undefined && activeToken.peopleAhead <= 2))
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-400'
              }`} />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">
                YOUR ACTIVE QUEUE TOKEN
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                activeToken.status === 'serving'
                  ? 'bg-emerald-600 text-white shadow-xs animate-pulse'
                  : (activeToken.isTurnNear || (activeToken.peopleAhead !== undefined && activeToken.peopleAhead <= 2))
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
              }`}>
                {activeToken.status === 'serving' 
                  ? '🟢 Serving Now' 
                  : (activeToken.isTurnNear || (activeToken.peopleAhead !== undefined && activeToken.peopleAhead <= 2))
                    ? '⚡ Turn Is Near'
                    : 'Waiting in Queue'}
              </span>
            </div>
          </div>

          {/* TURN IS NEAR / TURN ARRIVED BANNER */}
          {activeToken.status === 'serving' ? (
            <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-xs text-xs space-y-1 border border-emerald-500 animate-in fade-in">
              <div className="font-black text-sm uppercase tracking-wider flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>🟢 YOUR TURN HAS ARRIVED</span>
              </div>
              <p className="text-emerald-100 font-medium">
                Token <span className="font-bold text-white underline">{activeToken.tokenNumber}</span> has been called! Please proceed immediately to <strong>Counter 0{activeToken.counterNumber || 1}</strong>.
              </p>
            </div>
          ) : (activeToken.isTurnNear || (activeToken.peopleAhead !== undefined && activeToken.peopleAhead <= 2)) ? (
            <div className="bg-amber-50 border border-amber-300 text-amber-950 p-3.5 rounded-xl text-xs space-y-1 animate-in fade-in">
              <div className="font-bold uppercase tracking-wide flex items-center space-x-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>🟢 YOUR TURN IS NEAR</span>
              </div>
              <p className="text-amber-900 font-medium">
                {activeToken.peopleAhead === 0
                  ? 'You are the very next farmer in line! Please prepare your documents and move close to the service counter.'
                  : `Only ${activeToken.peopleAhead} farmer(s) ahead of you. Please stay in the Kendra waiting area.`}
              </p>
              {activeToken.estimatedTurnTime && (
                <div className="text-[11px] text-amber-800">
                  Estimated call time: <strong>{activeToken.estimatedTurnTime}</strong> (Estimated Wait: {activeToken.estimatedWaitText || `${activeToken.estimatedWaitMinutes || 5} mins`})
                </div>
              )}
            </div>
          ) : null}

          {/* Main Token Display & QR Code Block */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            <div className="sm:col-span-8 space-y-2">
              <div className="text-4xl sm:text-6xl font-black text-slate-950 font-mono tracking-tight font-heading">
                {activeToken.tokenNumber}
              </div>
              <div className="text-base sm:text-lg font-bold text-emerald-800">
                {activeToken.serviceName}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                {activeToken.slotString && (
                  <span>
                    Reserved Slot: <strong className="font-mono text-slate-900">{activeToken.slotString}</strong>
                  </span>
                )}
                {activeToken.bookingReference && (
                  <span>
                    Ref: <strong className="font-mono text-slate-900">{activeToken.bookingReference}</strong>
                  </span>
                )}
                <span>
                  Issued: <span className="font-mono text-slate-700">{new Date(activeToken.issuedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              </div>
            </div>

            {/* Live QR Code Token Box */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <QrCodeView value={activeToken.tokenNumber} size={110} />
              <button
                type="button"
                onClick={() => setVerifyReference(activeToken.tokenNumber)}
                className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Verify QR Token</span>
              </button>
            </div>
          </div>

          {/* Live Queue Position & Smart ETA Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/60">
              <div className="text-slate-500 font-medium">Currently Serving</div>
              <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5">
                {activeServing ? activeServing.tokenNumber : 'None'}
              </div>
              <div className="text-[10px] text-slate-400">
                {activeServing ? `Counter 0${activeServing.counterNumber || 1}` : 'Idle'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200/60">
              <div className="text-slate-500 font-medium">People Ahead</div>
              <div className="text-base sm:text-lg font-black text-amber-600 font-mono mt-0.5">
                {activeToken.status === 'serving' 
                  ? '0 (Your Turn)' 
                  : (activeToken.peopleAhead !== undefined ? activeToken.peopleAhead : peopleAhead)}
              </div>
              <div className="text-[10px] text-slate-400">
                {activeToken.status === 'serving' 
                  ? 'At Counter' 
                  : ((activeToken.peopleAhead !== undefined ? activeToken.peopleAhead : peopleAhead) === 0 ? 'Next in Line' : 'In Line')}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200/60">
              <div className="text-slate-500 font-medium">Estimated Wait</div>
              <div className="text-base sm:text-lg font-black text-emerald-800 font-mono mt-0.5">
                {activeToken.status === 'serving' 
                  ? '0 min' 
                  : activeToken.estimatedWaitText 
                    ? activeToken.estimatedWaitText.replace('Estimated wait: ', '')
                    : `~${activeToken.estimatedWaitMinutes || 10} min`}
              </div>
              <div className="text-[10px] text-slate-400">
                {activeToken.estimatedTurnTime ? `ETA ~${activeToken.estimatedTurnTime}` : 'Estimated wait time'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200/60">
              <div className="text-slate-500 font-medium">Assigned Desk</div>
              <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5">
                Counter 0{activeToken.counterNumber || 1}
              </div>
              <div className="text-[10px] text-slate-400">
                {activeToken.activeCountersCount ? `${activeToken.activeCountersCount} desk(s) active` : 'Active Staff Desk'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={fetchFarmerData}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>

            <button
              onClick={() => setReceiptToken(activeToken)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip & QR</span>
            </button>

            <button
              type="button"
              onClick={() => setVerifyReference(activeToken.tokenNumber)}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Verify Official Seal</span>
            </button>

            <button
              onClick={handleCancelToken}
              disabled={actionLoading}
              className="px-3.5 py-2 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer ml-auto border border-rose-200"
            >
              Cancel Token
            </button>
          </div>
        </div>
      ) : (
        /* SIMPLE EMPTY STATE AS MANDATED */
        <div className="bg-white rounded-xl border border-slate-300 p-6 shadow-xs text-left">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            ACTIVE QUEUE TOKEN
          </div>
          <p className="text-sm text-slate-600 mb-4">
            You don't have an active walk-in token. You can book an appointment slot or generate an instant token below.
          </p>

          {!showGetTokenForm ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowSlotBookingModal(true)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Calendar className="w-4 h-4 text-emerald-200" />
                <span>Book Service Slot</span>
              </button>

              <button
                id="farmer-get-token-btn"
                onClick={() => setShowGetTokenForm(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
              >
                <Ticket className="w-4 h-4" />
                <span>Get Instant Token</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleGenerateToken} className="space-y-4 pt-2 border-t border-slate-100 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Required Service
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                >
                  {services.map((svc, idx) => {
                    const svcKey = svc._id || svc.id || svc.code || `svc-opt-${idx}`;
                    const svcVal = svc.code || svc.id || svc._id || `svc-${idx}`;
                    return (
                      <option key={svcKey} value={svcVal}>
                        {svc.name} (~{svc.averageMinutes} min)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>{actionLoading ? 'Generating token...' : 'Generate Token'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGetTokenForm(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 4. MY APPOINTMENTS / SLOT BOOKINGS SECTION */}
      <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-4 h-4 text-emerald-800" />
            <h2 className="text-sm font-bold text-slate-900">
              My Slot Bookings
            </h2>
            <span className="text-xs text-slate-400">
              ({bookings.all.length} total)
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['upcoming', 'completed', 'cancelled', 'expired', 'all'] as const).map((tab) => {
              const count = tab === 'upcoming' 
                ? bookings.upcoming.length 
                : tab === 'completed' 
                ? bookings.completed.length 
                : tab === 'cancelled' 
                ? bookings.cancelled.length 
                : tab === 'expired' 
                ? bookings.expired.length 
                : bookings.all.length;

              return (
                <button
                  key={tab}
                  onClick={() => setBookingFilterTab(tab)}
                  className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                    bookingFilterTab === tab
                      ? 'bg-white text-emerald-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {displayedBookings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p>No {bookingFilterTab} slot appointments found.</p>
            {bookingFilterTab === 'upcoming' && (
              <button
                onClick={() => setShowSlotBookingModal(true)}
                className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer inline-flex items-center space-x-1"
              >
                <span>Book your next appointment slot</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Slot</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Token</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-900">
                      {b.bookingReference}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {b.serviceName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {b.date}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {b.slotString}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'CONFIRMED' || b.status === 'BOOKED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-700'
                          : b.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.displayStatus || b.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {b.tokenNumber || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedSlipBooking(b)}
                          className="text-emerald-800 hover:text-emerald-950 font-semibold hover:underline cursor-pointer"
                        >
                          Slip
                        </button>
                        {(b.status === 'CONFIRMED' || b.status === 'BOOKED') && (
                          <>
                            <span className="text-slate-300">•</span>
                            <button
                              onClick={() => setRescheduleBooking(b)}
                              className="text-slate-600 hover:text-slate-900 font-semibold hover:underline cursor-pointer"
                            >
                              Reschedule
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              onClick={() => handleCancelBooking(b)}
                              className="text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MY RECENT TOKENS TABLE */}
      <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900">
            My Recent Tokens
          </h2>
          <span className="text-xs text-slate-400">
            {pastTokens.length} recorded
          </span>
        </div>

        {pastTokens.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">
            No previous tokens recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                  <th className="py-2 px-3">Token</th>
                  <th className="py-2 px-3">Service</th>
                  <th className="py-2 px-3">Date & Time</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Counter</th>
                  <th className="py-2 px-3 text-right">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastTokens.map((tok, idx) => (
                  <tr key={tok._id || tok.tokenNumber || `token-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {tok.tokenNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {tok.serviceName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(tok.issuedAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        tok.status === 'completed'
                          ? 'bg-slate-100 text-slate-700'
                          : tok.status === 'skipped'
                          ? 'bg-amber-100 text-amber-800'
                          : tok.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {tok.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {tok.counterNumber ? `Counter ${tok.counterNumber}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setReceiptToken(tok)}
                        className="text-emerald-800 hover:text-emerald-950 font-semibold hover:underline cursor-pointer inline-flex items-center space-x-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Slip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}

  {/* ================= FARMER PROCUREMENT WORKFLOW (PHASE 4) ================= */}
  {activeMainTab === 'procurement' && (
    <FarmerProcurementSection
      token={token || ''}
      user={user}
      activeBookingRef={nextAppointment?.bookingReference}
      activeTokenNumber={activeToken?.tokenNumber}
    />
  )}

  {/* ================= PURCHASES BILLS TAB ================= */}
  {activeMainTab === 'purchases' && (
    <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h2 className="text-sm font-bold text-slate-900">
          Recent Purchases & Agro Bills
        </h2>
        <span className="text-xs text-slate-400">
          {purchases.length} invoices
        </span>
      </div>

      {purchases.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">
          No purchase invoices recorded yet for your account.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                <th className="py-2 px-3">Invoice</th>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Items Purchased</th>
                <th className="py-2 px-3 text-right">Total Amount</th>
                <th className="py-2 px-3">Payment</th>
                <th className="py-2 px-3 text-right">Bill / Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((sale, idx) => (
                <tr key={sale._id || sale.invoiceNumber || `sale-${idx}`} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                    {sale.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {new Date(sale.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {sale.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    ₹{sale.total.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                      {sale.paymentMethod || 'Cash'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => setReceiptSale(sale)}
                      className="text-emerald-800 hover:text-emerald-950 font-semibold hover:underline cursor-pointer inline-flex items-center space-x-1"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Bill</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}

  {activeMainTab === 'notifications' && (
    <FarmerNotificationsTab />
  )}

      {/* Book Service Slot Modal */}
      {showSlotBookingModal && (
        <SlotBookingModal
          services={services}
          preselectedServiceId={selectedServiceId}
          onClose={() => setShowSlotBookingModal(false)}
          onBookingSuccess={(newBooking) => {
            setSelectedSlipBooking(newBooking);
            fetchFarmerData();
          }}
        />
      )}

      {/* Reschedule Booking Modal */}
      {rescheduleBooking && (
        <RescheduleBookingModal
          booking={rescheduleBooking}
          onClose={() => setRescheduleBooking(null)}
          onSuccess={(updatedBooking) => {
            setStatusMessage({
              type: 'success',
              text: `Appointment rescheduled to ${updatedBooking.date} at ${updatedBooking.slotString}.`
            });
            fetchFarmerData();
          }}
        />
      )}

      {/* Official Booking Slip Modal */}
      {selectedSlipBooking && (
        <BookingSlipModal
          booking={selectedSlipBooking}
          onClose={() => setSelectedSlipBooking(null)}
        />
      )}

      {/* Token Slip Modal */}
      {receiptToken && (
        <TokenReceiptModal
          token={receiptToken}
          onClose={() => setReceiptToken(null)}
        />
      )}

      {/* Official Token Verification Modal */}
      {verifyReference && (
        <TokenVerifyModal
          reference={verifyReference}
          onClose={() => setVerifyReference(null)}
        />
      )}

      {/* Sale Bill Modal */}
      {receiptSale && (
        <SaleReceiptModal
          sale={receiptSale}
          onClose={() => setReceiptSale(null)}
        />
      )}
    </div>
  );
};

