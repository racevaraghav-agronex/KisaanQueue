import React, { useState, useEffect } from 'react';
import {
  Wheat,
  Plus,
  Scale,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  IndianRupee,
  Truck,
  RotateCw,
  Eye,
  ChevronRight
} from 'lucide-react';
import { ProcurementRecord } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { ProcurementProgressTracker } from './ProcurementProgressTracker.tsx';
import { ProcurementReceiptModal } from './ProcurementReceiptModal.tsx';

interface FarmerProcurementSectionProps {
  token: string;
  user: any;
  activeBookingRef?: string;
  activeTokenNumber?: string;
}

export const FarmerProcurementSection: React.FC<FarmerProcurementSectionProps> = ({
  token,
  user,
  activeBookingRef,
  activeTokenNumber
}) => {
  const [procurements, setProcurements] = useState<ProcurementRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProcurement, setSelectedProcurement] = useState<ProcurementRecord | null>(null);
  const [receiptModalProcurement, setReceiptModalProcurement] = useState<ProcurementRecord | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Intake Form state
  const [cropName, setCropName] = useState<string>('Wheat / गेहूं');
  const [variety, setVariety] = useState<string>('');
  const [declaredQuantity, setDeclaredQuantity] = useState<string>('');
  const [unit, setUnit] = useState<'Quintal' | 'Kg'>('Quintal');
  const [bagsCount, setBagsCount] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const fetchProcurements = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await safeFetchJson<ProcurementRecord[]>('/api/procurement/farmer/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok && res.data) {
        setProcurements(res.data);
        setError(null);
        if (res.data.length > 0 && !selectedProcurement) {
          setSelectedProcurement(res.data[0]);
        } else if (selectedProcurement) {
          // Keep updated
          const updated = res.data.find(p => p._id === selectedProcurement._id);
          if (updated) setSelectedProcurement(updated);
        }
      } else {
        setError(res.error || 'Unable to load procurement records');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurements();
    const interval = setInterval(fetchProcurements, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleRegisterProduce = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(declaredQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid declared quantity greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      const res = await safeFetchJson<{ message: string; procurement: ProcurementRecord }>(
        '/api/procurement',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            cropName,
            variety,
            declaredQuantity: qty,
            unit,
            bagsCount: bagsCount ? parseInt(bagsCount) : 0,
            vehicleNumber,
            notes,
            bookingReference: activeBookingRef,
            tokenNumber: activeTokenNumber
          })
        }
      );

      if (res.ok && res.data?.procurement) {
        setFormSuccess('Produce lot pre-registered successfully!');
        setShowRegisterForm(false);
        setDeclaredQuantity('');
        setVariety('');
        setBagsCount('');
        setVehicleNumber('');
        setNotes('');
        await fetchProcurements();
        setSelectedProcurement(res.data.procurement);
        setTimeout(() => setFormSuccess(null), 5000);
      } else {
        alert(res.error || 'Failed to register produce lot');
      }
    } catch (err: any) {
      alert(err.message || 'Network error registering produce');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          text: 'Completed / पूर्ण'
        };
      case 'ACCEPTED':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          text: 'Accepted / स्वीकृत'
        };
      case 'PARTIALLY_ACCEPTED':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          text: 'Partial / आंशिक स्वीकृत'
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          text: 'Rejected / अस्वीकृत'
        };
      case 'QUALITY_CHECKED':
        return {
          bg: 'bg-sky-100 text-sky-800 border-sky-300',
          text: 'Quality Checked'
        };
      case 'WEIGHED':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          text: 'Weighed'
        };
      case 'ARRIVED':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          text: 'Arrived at Kendra'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          text: 'Pending Arrival'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Farmer Produce Procurement & Weighment
              </h2>
              <p className="text-xs text-slate-500">
                Live crop intake, weighbridge net calculation, quality grades, and official receipt
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchProcurements()}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh Records"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowRegisterForm(!showRegisterForm)}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{showRegisterForm ? 'Close Form' : 'Register Produce Lot'}</span>
          </button>
        </div>
      </div>

      {formSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Produce Pre-Registration Form */}
      {showRegisterForm && (
        <form
          onSubmit={handleRegisterProduce}
          className="bg-white rounded-3xl p-6 border-2 border-emerald-600/30 shadow-md space-y-4"
        >
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Pre-Register Your Produce Lot / फसल आवक पूर्व-पंजीकरण
            </h3>
            <p className="text-xs text-slate-500">
              Pre-declaring your produce speeds up your weighment and inspection at the Kendra gate.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Crop / Produce Name *
              </label>
              <select
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="Wheat / गेहूं">Wheat / गेहूं</option>
                <option value="Paddy / धान">Paddy / धान</option>
                <option value="Mustard / सरसों">Mustard / सरसों</option>
                <option value="Soybean / सोयाबीन">Soybean / सोयाबीन</option>
                <option value="Cotton / कपास">Cotton / कपास</option>
                <option value="Maize / मक्का">Maize / मक्का</option>
                <option value="Gram / चना">Gram / चना</option>
                <option value="Groundnut / मूंगफली">Groundnut / मूंगफली</option>
                <option value="Sugarcane / गन्ना">Sugarcane / गन्ना</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Variety / Variety Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Sharbati, Pusa 1121, Grade A"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Est. Quantity *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="e.g. 50"
                  value={declaredQuantity}
                  onChange={(e) => setDeclaredQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="Quintal">Quintal (कुंतल)</option>
                  <option value="Kg">Kg (किग्रा)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Bags (बोरी संख्या)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 100 bags"
                value={bagsCount}
                onChange={(e) => setBagsCount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tractor/Vehicle Reg No.
              </label>
              <input
                type="text"
                placeholder="e.g. UP-32-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Dry harvest, clean lot"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRegisterForm(false)}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Produce Lot'}
            </button>
          </div>
        </form>
      )}

      {/* Main Procurement Layout: List & Active Detail */}
      {loading && procurements.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
          <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-xs">Loading your procurement lots...</p>
        </div>
      ) : procurements.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
          <Wheat className="w-12 h-12 text-emerald-600/40 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">No Procurement Records Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You have not registered any crop lots for procurement yet. Click "Register Produce Lot" above
            or bring your produce to the Kendra weighbridge.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Lots List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Your Registered Lots ({procurements.length})
            </div>

            <div className="space-y-2.5">
              {procurements.map((item) => {
                const isSelected = selectedProcurement?._id === item._id;
                const badge = getStatusBadge(item.status);

                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedProcurement(item)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-600 shadow-xs ring-1 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        {item.procurementNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                        {badge.text}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <div>
                        <strong className="text-slate-900">{item.produce.cropName}</strong>
                        {item.produce.variety && (
                          <span className="text-slate-500"> ({item.produce.variety})</span>
                        )}
                      </div>
                      <div className="font-mono font-semibold">
                        {item.weighment?.netWeight > 0
                          ? `${item.weighment.netWeight} ${item.weighment.unit}`
                          : `${item.produce.declaredQuantity} ${item.produce.unit}`}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </span>
                      {item.pricing?.netPayable > 0 && (
                        <span className="font-mono font-bold text-emerald-800">
                          ₹{item.pricing.netPayable.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Lot Progress & Details */}
          {selectedProcurement ? (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
                {/* Top Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {selectedProcurement.procurementNumber}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {selectedProcurement.produce.cropName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Kendra: {selectedProcurement.centre} • Registered on{' '}
                      {new Date(selectedProcurement.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => setReceiptModalProcurement(selectedProcurement)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Official Receipt</span>
                  </button>
                </div>

                {/* Progress Step Tracker */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Live Procurement Workflow Status
                  </div>
                  <ProcurementProgressTracker
                    status={selectedProcurement.status}
                    paymentStatus={selectedProcurement.payment?.status}
                  />
                </div>

                {/* Detailed Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Weighbridge Slip */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Scale className="w-4 h-4 text-emerald-700" />
                      <span>Weighbridge Details</span>
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>Gross Wt:</span>
                        <strong className="font-mono text-slate-900">
                          {selectedProcurement.weighment?.grossWeight || 0}{' '}
                          {selectedProcurement.weighment?.unit || 'Qtl'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Tare Wt:</span>
                        <strong className="font-mono text-slate-700">
                          {selectedProcurement.weighment?.tareWeight || 0}{' '}
                          {selectedProcurement.weighment?.unit || 'Qtl'}
                        </strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 text-emerald-950 font-bold">
                        <span>Net Weight:</span>
                        <span className="font-mono text-emerald-900">
                          {selectedProcurement.weighment?.netWeight || 0}{' '}
                          {selectedProcurement.weighment?.unit || 'Qtl'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quality Inspection */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Award className="w-4 h-4 text-emerald-700" />
                      <span>Quality & Inspection</span>
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>Assigned Grade:</span>
                        <strong className="text-slate-900">
                          {selectedProcurement.quality?.grade || 'Under Review'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Moisture:</span>
                        <strong className="font-mono text-slate-900">
                          {selectedProcurement.quality?.moisturePercentage || 0}%
                        </strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span>Accepted Qty:</span>
                        <strong className="font-mono text-emerald-800">
                          {selectedProcurement.decision?.acceptedQuantity || 0}{' '}
                          {selectedProcurement.weighment?.unit || 'Qtl'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Valuation & Payment */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <IndianRupee className="w-4 h-4 text-emerald-700" />
                      <span>Valuation & Payment</span>
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>MSP / Rate:</span>
                        <strong className="font-mono text-slate-900">
                          ₹{selectedProcurement.pricing?.ratePerUnit?.toLocaleString('en-IN') || 0}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Payable:</span>
                        <strong className="font-mono text-emerald-900">
                          ₹{selectedProcurement.pricing?.netPayable?.toLocaleString('en-IN') || 0}
                        </strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 items-center">
                        <span>Payment:</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            selectedProcurement.payment?.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedProcurement.payment?.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {selectedProcurement.payment?.status || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Timeline History */}
                {selectedProcurement.statusHistory?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Procurement Log Timeline
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {selectedProcurement.statusHistory.map((sh, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                        >
                          <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <strong className="text-slate-900">{sh.status}</strong>
                              <span className="text-[10px] text-slate-400">
                                {new Date(sh.timestamp).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {sh.notes} • By <span className="font-medium">{sh.changedBy}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Official Receipt Modal */}
      {receiptModalProcurement && (
        <ProcurementReceiptModal
          procurement={receiptModalProcurement}
          onClose={() => setReceiptModalProcurement(null)}
        />
      )}
    </div>
  );
};
