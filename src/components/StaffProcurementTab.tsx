import React, { useState, useEffect } from 'react';
import {
  Wheat,
  Plus,
  Search,
  Scale,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  FileCheck,
  IndianRupee,
  Truck,
  RotateCw,
  Eye,
  CheckSquare,
  ShieldCheck,
  Filter,
  Check,
  ArrowRight
} from 'lucide-react';
import { ProcurementRecord, ProcurementStatus, QualityGrade } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { ProcurementReceiptModal } from './ProcurementReceiptModal.tsx';
import { ProcurementProgressTracker } from './ProcurementProgressTracker.tsx';

interface StaffProcurementTabProps {
  token: string;
  currentServingToken?: any;
  onNotification?: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const StaffProcurementTab: React.FC<StaffProcurementTabProps> = ({
  token,
  currentServingToken,
  onNotification
}) => {
  const [procurements, setProcurements] = useState<ProcurementRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedProcurement, setSelectedProcurement] = useState<ProcurementRecord | null>(null);
  const [receiptModalRecord, setReceiptModalRecord] = useState<ProcurementRecord | null>(null);

  // Active workflow panel state
  const [workflowMode, setWorkflowMode] = useState<
    'none' | 'new' | 'arrival' | 'weighment' | 'quality' | 'decision' | 'payment'
  >('none');

  // Intake Form
  const [newFarmerName, setNewFarmerName] = useState<string>('');
  const [newFarmerPhone, setNewFarmerPhone] = useState<string>('');
  const [newCropName, setNewCropName] = useState<string>('Wheat / गेहूं');
  const [newVariety, setNewVariety] = useState<string>('');
  const [newDeclaredQty, setNewDeclaredQty] = useState<string>('');
  const [newUnit, setNewUnit] = useState<'Quintal' | 'Kg'>('Quintal');
  const [newBagsCount, setNewBagsCount] = useState<string>('');
  const [newVehicleNumber, setNewVehicleNumber] = useState<string>('');
  const [newGateNumber, setNewGateNumber] = useState<string>('Gate 1');
  const [newInitialArrival, setNewInitialArrival] = useState<boolean>(true);

  // Arrival form
  const [arrivalGate, setArrivalGate] = useState<string>('Gate 1');
  const [arrivalVehicle, setArrivalVehicle] = useState<string>('');
  const [arrivalBags, setArrivalBags] = useState<string>('');
  const [arrivalNotes, setArrivalNotes] = useState<string>('');

  // Weighment form
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [tareWeight, setTareWeight] = useState<string>('');
  const [weighbridgeSlip, setWeighbridgeSlip] = useState<string>('');
  const [weighmentNotes, setWeighmentNotes] = useState<string>('');

  // Quality check form
  const [qualityGrade, setQualityGrade] = useState<QualityGrade>('FAQ');
  const [moisture, setMoisture] = useState<string>('11.5');
  const [foreignMatter, setForeignMatter] = useState<string>('0.8');
  const [damaged, setDamaged] = useState<string>('0.0');
  const [acceptedQty, setAcceptedQty] = useState<string>('');
  const [rejectedQty, setRejectedQty] = useState<string>('0');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [qualityRemarks, setQualityRemarks] = useState<string>('');

  // Decision & Valuation form
  const [decisionType, setDecisionType] = useState<'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED'>('ACCEPTED');
  const [ratePerUnit, setRatePerUnit] = useState<string>('2275'); // Default wheat MSP
  const [deductions, setDeductions] = useState<string>('0');
  const [decisionNotes, setDecisionNotes] = useState<string>('');

  // Payment form
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID' | 'PARTIAL'>('PAID');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Direct Kendra Transfer');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchProcurements = async () => {
    if (!token) return;
    try {
      setLoading(true);
      let url = '/api/procurement?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;

      const res = await safeFetchJson<ProcurementRecord[]>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok && res.data) {
        setProcurements(res.data);
        setError(null);
        if (selectedProcurement) {
          const updated = res.data.find((p) => p._id === selectedProcurement._id);
          if (updated) setSelectedProcurement(updated);
        }
      } else {
        setError(res.error || 'Failed to fetch procurements');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurements();
    const interval = setInterval(fetchProcurements, 7000);
    return () => clearInterval(interval);
  }, [token, statusFilter]);

  // Autofill current serving token if available when initiating new procurement
  const autofillCurrentToken = () => {
    if (currentServingToken) {
      setNewFarmerName(currentServingToken.farmerName || '');
      setNewFarmerPhone(currentServingToken.farmerPhone || '');
      if (currentServingToken.crop) setNewCropName(currentServingToken.crop);
      if (currentServingToken.vehicleNumber) setNewVehicleNumber(currentServingToken.vehicleNumber);
    }
  };

  // Open active modal/form preloaded with selected procurement
  const openActionForm = (
    mode: 'arrival' | 'weighment' | 'quality' | 'decision' | 'payment',
    item: ProcurementRecord
  ) => {
    setSelectedProcurement(item);
    setWorkflowMode(mode);

    if (mode === 'arrival') {
      setArrivalGate(item.arrival?.gateNumber || 'Gate 1');
      setArrivalVehicle(item.produce?.vehicleNumber || '');
      setArrivalBags(item.produce?.bagsCount?.toString() || '');
    } else if (mode === 'weighment') {
      setGrossWeight(item.weighment?.grossWeight ? item.weighment.grossWeight.toString() : '');
      setTareWeight(item.weighment?.tareWeight ? item.weighment.tareWeight.toString() : '');
      setWeighbridgeSlip(item.weighment?.weighbridgeSlipNumber || `WB-${Math.floor(1000 + Math.random() * 9000)}`);
    } else if (mode === 'quality') {
      setQualityGrade(item.quality?.grade || 'FAQ');
      setMoisture(item.quality?.moisturePercentage?.toString() || '11.5');
      setForeignMatter(item.quality?.foreignMatterPercentage?.toString() || '0.8');
      const net = item.weighment?.netWeight || item.produce?.declaredQuantity || 0;
      setAcceptedQty(item.decision?.acceptedQuantity ? item.decision.acceptedQuantity.toString() : net.toString());
      setRejectedQty(item.decision?.rejectedQuantity ? item.decision.rejectedQuantity.toString() : '0');
      setRejectionReason(item.decision?.rejectionReason || '');
    } else if (mode === 'decision') {
      const net = item.weighment?.netWeight || 0;
      const acc = item.decision?.acceptedQuantity || net;
      setDecisionType(acc > 0 ? (item.decision?.rejectedQuantity > 0 ? 'PARTIALLY_ACCEPTED' : 'ACCEPTED') : 'REJECTED');
      setRatePerUnit(item.pricing?.ratePerUnit ? item.pricing.ratePerUnit.toString() : '2275');
      setDeductions(item.pricing?.deductions ? item.pricing.deductions.toString() : '0');
    } else if (mode === 'payment') {
      setPaymentStatus(item.payment?.status || 'PAID');
      setPaidAmount(item.payment?.paidAmount ? item.payment.paidAmount.toString() : (item.pricing?.netPayable?.toString() || '0'));
      setPaymentMethod(item.payment?.paymentMethod || 'Direct Kendra Transfer');
      setPaymentRef(item.payment?.paymentReference || `TXN-KND-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  };

  // Submit New Procurement Intake
  const handleCreateIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(newDeclaredQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid declared quantity > 0');
      return;
    }
    if (!newFarmerName.trim() || !newFarmerPhone.trim()) {
      alert('Farmer Name and Mobile Number are required');
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
            farmerName: newFarmerName.trim(),
            farmerPhone: newFarmerPhone.trim(),
            cropName: newCropName,
            variety: newVariety.trim(),
            declaredQuantity: qty,
            unit: newUnit,
            bagsCount: newBagsCount ? parseInt(newBagsCount) : 0,
            vehicleNumber: newVehicleNumber.trim(),
            tokenNumber: currentServingToken?.tokenNumber || '',
            initialArrival: newInitialArrival,
            gateNumber: newGateNumber
          })
        }
      );

      if (res.ok && res.data?.procurement) {
        onNotification?.({
          type: 'success',
          text: `Procurement lot ${res.data.procurement.procurementNumber} registered successfully!`
        });
        setWorkflowMode('none');
        resetNewForm();
        await fetchProcurements();
        setSelectedProcurement(res.data.procurement);
      } else {
        alert(res.error || 'Failed to create procurement lot');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating procurement lot');
    } finally {
      setSubmitting(false);
    }
  };

  const resetNewForm = () => {
    setNewFarmerName('');
    setNewFarmerPhone('');
    setNewVariety('');
    setNewDeclaredQty('');
    setNewBagsCount('');
    setNewVehicleNumber('');
  };

  // Submit Arrival Verification
  const handleVerifyArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcurement) return;

    try {
      setSubmitting(true);
      const res = await safeFetchJson<{ message: string; procurement: ProcurementRecord }>(
        `/api/procurement/${selectedProcurement._id}/verify-arrival`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            gateNumber: arrivalGate,
            vehicleNumber: arrivalVehicle,
            bagsCount: arrivalBags ? parseInt(arrivalBags) : undefined,
            notes: arrivalNotes
          })
        }
      );

      if (res.ok && res.data?.procurement) {
        onNotification?.({
          type: 'success',
          text: `Arrival verified for ${selectedProcurement.procurementNumber}`
        });
        setWorkflowMode('none');
        await fetchProcurements();
        setSelectedProcurement(res.data.procurement);
      } else {
        alert(res.error || 'Failed to verify arrival');
      }
    } catch (err: any) {
      alert(err.message || 'Error verifying arrival');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Weighment
  const handleRecordWeighment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcurement) return;

    const gross = parseFloat(grossWeight);
    const tare = parseFloat(tareWeight);

    if (isNaN(gross) || gross <= 0) {
      alert('Gross weight must be a positive number');
      return;
    }
    if (isNaN(tare) || tare < 0) {
      alert('Tare weight must be zero or a positive number');
      return;
    }
    if (tare >= gross) {
      alert(`Gross weight (${gross}) must be strictly greater than Tare weight (${tare})`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await safeFetchJson<{ message: string; procurement: ProcurementRecord }>(
        `/api/procurement/${selectedProcurement._id}/weighment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            grossWeight: gross,
            tareWeight: tare,
            unit: selectedProcurement.produce?.unit || 'Quintal',
            weighbridgeSlipNumber: weighbridgeSlip,
            notes: weighmentNotes
          })
        }
      );

      if (res.ok && res.data?.procurement) {
        onNotification?.({
          type: 'success',
          text: res.data.message || 'Weighment recorded successfully!'
        });
        setWorkflowMode('none');
        await fetchProcurements();
        setSelectedProcurement(res.data.procurement);
      } else {
        alert(res.error || 'Failed to record weighment');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording weighment');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Quality Check
  const handleRecordQuality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcurement) return;

    const accepted = parseFloat(acceptedQty);
    const rejected = parseFloat(rejectedQty || '0');
    const netWeight = selectedProcurement.weighment?.netWeight || 0;

    if (isNaN(accepted) || accepted < 0) {
      alert('Accepted quantity must be 0 or greater');
      return;
    }
    if (isNaN(rejected) || rejected < 0) {
      alert('Rejected quantity must be 0 or greater');
      return;
    }
    if (accepted + rejected > netWeight + 0.05) {
      alert(
        `Accepted (${accepted}) + Rejected (${rejected}) = ${(accepted + rejected).toFixed(2)} exceeds total net weight (${netWeight})`
      );
      return;
    }
    if (rejected > 0 && !rejectionReason.trim()) {
      alert('Rejection reason is required when rejecting produce');
      return;
    }

    try {
      setSubmitting(true);
      const res = await safeFetchJson<{ message: string; procurement: ProcurementRecord }>(
        `/api/procurement/${selectedProcurement._id}/quality-check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            grade: qualityGrade,
            moisturePercentage: parseFloat(moisture) || 0,
            foreignMatterPercentage: parseFloat(foreignMatter) || 0,
            damagedPercentage: parseFloat(damaged) || 0,
            acceptedQuantity: accepted,
            rejectedQuantity: rejected,
            rejectionReason,
            remarks: qualityRemarks
          })
        }
      );

      if (res.ok && res.data?.procurement) {
        onNotification?.({
          type: 'success',
          text: 'Quality inspection recorded successfully!'
        });
        setWorkflowMode('none');
        await fetchProcurements();
        setSelectedProcurement(res.data.procurement);
      } else {
        alert(res.error || 'Failed to record quality check');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording quality check');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Procurement Decision & MSP Rate
  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcurement) return;

    const rate = parseFloat(ratePerUnit);
    const deduct = parseFloat(deductions || '0');
    const accQty = selectedProcurement.decision?.acceptedQuantity || 0;

    if (decisionType !== 'REJECTED' && accQty > 0 && (isNaN(rate) || rate <= 0)) {
      alert('Please enter a valid procurement rate per unit');
      return;
    }

    try {
      setSubmitting(true);
      const res = await safeFetchJson<{ message: string; procurement: ProcurementRecord }>(
        `/api/procurement/${selectedProcurement._id}/decision`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            decisionStatus: decisionType,
            ratePerUnit: rate,
            deductions: deduct,
            notes: decisionNotes
          })
        }
      );

      if (res.ok && res.data?.procurement) {
        onNotification?.({
          type: 'success',
          text: `Decision ${decisionType} confirmed successfully!`
        });
        setWorkflowMode('none');
        await fetchProcurements();
        setSelectedProcurement(res.data.procurement);
      } else {
        alert(res.error || 'Failed to record decision');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording decision');
    } finally {
      setSubmitting(false);
    }
  };

  // Finalize & Complete Procurement
  const handleCompleteProcurement = async (item: ProcurementRecord) => {
    if (!confirm(`Finalize and generate official digital receipt for ${item.procurementNumber}?`)) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await safeFetchJson<{ message: string; procurement: ProcurementRecord }>(
        `/api/procurement/${item._id}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ notes: 'Procurement finalized by staff' })
        }
      );

      if (res.ok && res.data?.procurement) {
        onNotification?.({
          type: 'success',
          text: res.data.message || 'Procurement finalized!'
        });
        await fetchProcurements();
        setSelectedProcurement(res.data.procurement);
      } else {
        alert(res.error || 'Failed to finalize procurement');
      }
    } catch (err: any) {
      alert(err.message || 'Error finalizing procurement');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Payment Settlement
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcurement) return;

    const amount = parseFloat(paidAmount);
    if ((paymentStatus === 'PAID' || paymentStatus === 'PARTIAL') && (isNaN(amount) || amount <= 0)) {
      alert('Please enter a valid paid amount greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      const res = await safeFetchJson<{ message: string; procurement: ProcurementRecord }>(
        `/api/procurement/${selectedProcurement._id}/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            status: paymentStatus,
            paidAmount: amount,
            paymentMethod,
            paymentReference: paymentRef,
            notes: paymentNotes
          })
        }
      );

      if (res.ok && res.data?.procurement) {
        onNotification?.({
          type: 'success',
          text: `Payment marked as ${paymentStatus}`
        });
        setWorkflowMode('none');
        await fetchProcurements();
        setSelectedProcurement(res.data.procurement);
      } else {
        alert(res.error || 'Failed to update payment');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating payment');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          text: 'COMPLETED'
        };
      case 'ACCEPTED':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          text: 'ACCEPTED'
        };
      case 'PARTIALLY_ACCEPTED':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          text: 'PARTIAL'
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          text: 'REJECTED'
        };
      case 'QUALITY_CHECKED':
        return {
          bg: 'bg-sky-100 text-sky-800 border-sky-300',
          text: 'QUALITY_CHECKED'
        };
      case 'WEIGHED':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          text: 'WEIGHED'
        };
      case 'ARRIVED':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          text: 'ARRIVED'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          text: 'PENDING'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Actions */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wheat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-heading">Kisan Procurement Desk</h2>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Phase 4 Workflow
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gate Arrival • Weighbridge Net Calculation • Quality Grade • Procurement Decision • Digital Receipt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {currentServingToken && (
            <button
              onClick={() => {
                autofillCurrentToken();
                setWorkflowMode('new');
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Link Serving Token ({currentServingToken.tokenNumber})</span>
            </button>
          )}

          <button
            onClick={() => {
              resetNewForm();
              setWorkflowMode('new');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Lot Intake</span>
          </button>

          <button
            onClick={() => fetchProcurements()}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 cursor-pointer"
            title="Refresh All Lots"
          >
            <RotateCw className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search PR No, Farmer, Mobile, Vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-slate-500 font-medium whitespace-nowrap">Filter Status:</span>
          {['ALL', 'PENDING', 'ARRIVED', 'WEIGHED', 'QUALITY_CHECKED', 'ACCEPTED', 'COMPLETED'].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Content Layout: Active Form Drawer / Modal + Lots List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lots Table / Cards */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            <span>Procurement Lots ({procurements.length})</span>
            {loading && <span className="text-emerald-700 animate-pulse">Refreshing live...</span>}
          </div>

          {procurements.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-3">
              <Wheat className="w-10 h-10 text-emerald-600/40 mx-auto" />
              <div className="font-bold text-slate-800">No Procurement Lots in View</div>
              <p className="text-xs text-slate-500">
                Create a new intake or change status filters above.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100 text-xs">
              {procurements.map((item) => {
                const isSelected = selectedProcurement?._id === item._id;
                const badge = getStatusBadge(item.status);

                return (
                  <div
                    key={item._id}
                    className={`p-4 transition-colors ${
                      isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setSelectedProcurement(item)}
                          className="font-mono font-bold text-slate-900 hover:text-emerald-700 text-sm cursor-pointer"
                        >
                          {item.procurementNumber}
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.text}
                        </span>
                        {item.tokenNumber && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px]">
                            Token: {item.tokenNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Quick action buttons according to status */}
                        {item.status === 'PENDING' && (
                          <button
                            onClick={() => openActionForm('arrival', item)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Verify Arrival</span>
                          </button>
                        )}

                        {item.status === 'ARRIVED' && (
                          <button
                            onClick={() => openActionForm('weighment', item)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Scale className="w-3 h-3" />
                            <span>Weigh Produce</span>
                          </button>
                        )}

                        {item.status === 'WEIGHED' && (
                          <button
                            onClick={() => openActionForm('quality', item)}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Award className="w-3 h-3" />
                            <span>Quality Check</span>
                          </button>
                        )}

                        {item.status === 'QUALITY_CHECKED' && (
                          <button
                            onClick={() => openActionForm('decision', item)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckSquare className="w-3 h-3" />
                            <span>Confirm Rate & Decision</span>
                          </button>
                        )}

                        {['ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED'].includes(item.status) && (
                          <button
                            onClick={() => handleCompleteProcurement(item)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>Finalize Receipt</span>
                          </button>
                        )}

                        {item.status === 'COMPLETED' && (
                          <button
                            onClick={() => openActionForm('payment', item)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <IndianRupee className="w-3 h-3 text-emerald-400" />
                            <span>
                              {item.payment?.status === 'PAID' ? 'Payment Settled' : 'Record Payment'}
                            </span>
                          </button>
                        )}

                        <button
                          onClick={() => setReceiptModalRecord(item)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900 cursor-pointer"
                          title="View Official Digital Slip"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100 text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Farmer</span>
                        <strong className="text-slate-900">{item.farmerName}</strong>
                        <div className="text-[10px] text-slate-500">{item.farmerPhone}</div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Produce / Crop</span>
                        <strong className="text-slate-900">{item.produce.cropName}</strong>
                        {item.produce.variety && (
                          <div className="text-[10px] text-slate-500">{item.produce.variety}</div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Net Weight / Grade</span>
                        <div className="font-mono font-bold text-slate-900">
                          {item.weighment?.netWeight > 0
                            ? `${item.weighment.netWeight} ${item.weighment.unit}`
                            : `${item.produce.declaredQuantity} ${item.produce.unit} (declared)`}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          {item.quality?.grade || 'Unassessed'}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Net Payable</span>
                        <div className="font-mono font-black text-emerald-900 text-sm">
                          ₹{item.pricing?.netPayable?.toLocaleString('en-IN') || 0}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm ${
                            item.payment?.status === 'PAID'
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-amber-700 bg-amber-50'
                          }`}
                        >
                          {item.payment?.status || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Workflow Action Panel / Active Form */}
        <div className="lg:col-span-1 space-y-4">
          {workflowMode === 'new' && (
            <form
              onSubmit={handleCreateIntake}
              className="bg-white p-5 rounded-3xl border-2 border-emerald-500 shadow-lg space-y-4 text-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>New Produce Intake / नया आवक</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkflowMode('none')}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Farmer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newFarmerName}
                  onChange={(e) => setNewFarmerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile"
                  value={newFarmerPhone}
                  onChange={(e) => setNewFarmerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Produce *</label>
                  <select
                    value={newCropName}
                    onChange={(e) => setNewCropName(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="Wheat / गेहूं">Wheat / गेहूं</option>
                    <option value="Paddy / धान">Paddy / धान</option>
                    <option value="Mustard / सरसों">Mustard / सरसों</option>
                    <option value="Soybean / सोयाबीन">Soybean / सोयाबीन</option>
                    <option value="Cotton / कपास">Cotton / कपास</option>
                    <option value="Maize / मक्का">Maize / मक्का</option>
                    <option value="Gram / चना">Gram / चना</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Variety</label>
                  <input
                    type="text"
                    placeholder="e.g. Sharbati"
                    value={newVariety}
                    onChange={(e) => setNewVariety(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Declared Qty *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    placeholder="e.g. 45"
                    value={newDeclaredQty}
                    onChange={(e) => setNewDeclaredQty(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as any)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="Quintal">Quintal</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle No.</label>
                  <input
                    type="text"
                    placeholder="UP-32-AB-1234"
                    value={newVehicleNumber}
                    onChange={(e) => setNewVehicleNumber(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bags Count</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 90"
                    value={newBagsCount}
                    onChange={(e) => setNewBagsCount(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-emerald-900">
                  <input
                    type="checkbox"
                    checked={newInitialArrival}
                    onChange={(e) => setNewInitialArrival(e.target.checked)}
                    className="rounded-sm text-emerald-600"
                  />
                  <span>Farmer is already at gate (Mark Arrived)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Creating Intake...' : 'Create Produce Intake'}
              </button>
            </form>
          )}

          {/* Workflow: Gate Arrival */}
          {workflowMode === 'arrival' && selectedProcurement && (
            <form
              onSubmit={handleVerifyArrival}
              className="bg-white p-5 rounded-3xl border-2 border-blue-500 shadow-lg space-y-4 text-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Gate Arrival Verification</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkflowMode('none')}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1">
                <div className="font-mono font-bold text-blue-950">
                  {selectedProcurement.procurementNumber}
                </div>
                <div className="text-slate-700">
                  <strong>Farmer:</strong> {selectedProcurement.farmerName} ({selectedProcurement.farmerPhone})
                </div>
                <div className="text-slate-700">
                  <strong>Produce:</strong> {selectedProcurement.produce.cropName} (
                  {selectedProcurement.produce.declaredQuantity} {selectedProcurement.produce.unit})
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Arrival Gate *</label>
                <input
                  type="text"
                  required
                  value={arrivalGate}
                  onChange={(e) => setArrivalGate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  placeholder="e.g. UP-32-AB-1234"
                  value={arrivalVehicle}
                  onChange={(e) => setArrivalVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verified Bags Count</label>
                <input
                  type="number"
                  placeholder="e.g. 90"
                  value={arrivalBags}
                  onChange={(e) => setArrivalBags(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Verifying...' : 'Verify Gate Arrival'}
              </button>
            </form>
          )}

          {/* Workflow: Weighment */}
          {workflowMode === 'weighment' && selectedProcurement && (
            <form
              onSubmit={handleRecordWeighment}
              className="bg-white p-5 rounded-3xl border-2 border-indigo-500 shadow-lg space-y-4 text-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <span>Weighbridge Desk / धर्मकांटा तौल</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkflowMode('none')}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-1">
                <div className="font-mono font-bold text-indigo-950">
                  {selectedProcurement.procurementNumber} • {selectedProcurement.farmerName}
                </div>
                <div className="text-slate-600 text-[11px]">
                  Declared: {selectedProcurement.produce.declaredQuantity}{' '}
                  {selectedProcurement.produce.unit}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gross Wt (सकल तौल) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    placeholder="e.g. 62.5"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Vehicle + Produce</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tare Wt (खाली तौल) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 18.2"
                    value={tareWeight}
                    onChange={(e) => setTareWeight(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Empty Vehicle Wt</span>
                </div>
              </div>

              {/* Instant Net Weight Display */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Calculated Net Weight (शुद्ध तौल)
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-400">
                    {parseFloat(grossWeight) > parseFloat(tareWeight || '0')
                      ? (parseFloat(grossWeight) - parseFloat(tareWeight || '0')).toFixed(2)
                      : '0.00'}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      {selectedProcurement.produce.unit}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 text-right">
                  Gross - Tare
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Weighbridge Slip Number</label>
                <input
                  type="text"
                  placeholder="e.g. WB-8839"
                  value={weighbridgeSlip}
                  onChange={(e) => setWeighbridgeSlip(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Recording...' : 'Record Safe Weighment'}
              </button>
            </form>
          )}

          {/* Workflow: Quality Check */}
          {workflowMode === 'quality' && selectedProcurement && (
            <form
              onSubmit={handleRecordQuality}
              className="bg-white p-5 rounded-3xl border-2 border-sky-500 shadow-lg space-y-4 text-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Award className="w-4 h-4 text-sky-600" />
                  <span>Quality Check & Inspection / गुणवत्ता जांच</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkflowMode('none')}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-200">
                <div className="text-slate-800 font-bold">
                  Net Weight: {selectedProcurement.weighment?.netWeight || 0}{' '}
                  {selectedProcurement.weighment?.unit || 'Qtl'}
                </div>
                <div className="text-[11px] text-slate-600">
                  Crop: {selectedProcurement.produce.cropName} • Farmer: {selectedProcurement.farmerName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quality Grade *</label>
                  <select
                    value={qualityGrade}
                    onChange={(e) => setQualityGrade(e.target.value as any)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  >
                    <option value="FAQ">FAQ (Fair Average Quality)</option>
                    <option value="Grade A">Grade A (Premium)</option>
                    <option value="Grade B">Grade B (Standard)</option>
                    <option value="Grade C">Grade C (Sub-Standard)</option>
                    <option value="Below Standard">Below Standard</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Moisture % *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={moisture}
                    onChange={(e) => setMoisture(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Accepted Qty *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={acceptedQty}
                    onChange={(e) => setAcceptedQty(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-mono font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rejected Qty</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-mono font-bold text-rose-800"
                  />
                </div>
              </div>

              {parseFloat(rejectedQty) > 0 && (
                <div>
                  <label className="block font-semibold text-rose-800 mb-1">
                    Rejection Reason *
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-300 bg-rose-50/50 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden text-rose-900"
                  >
                    <option value="">Select Rejection Reason...</option>
                    <option value="Excess Moisture Content (>14%)">Excess Moisture Content (&gt;14%)</option>
                    <option value="High Foreign Matter / Chaff">High Foreign Matter / Chaff</option>
                    <option value="Pest Damaged / Discolored Grain">Pest Damaged / Discolored Grain</option>
                    <option value="Below FAQ Norms">Below FAQ Norms</option>
                    <option value="Insect Infestation">Insect Infestation</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inspector Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Grain healthy, approved for standard storage"
                  value={qualityRemarks}
                  onChange={(e) => setQualityRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm Quality Inspection'}
              </button>
            </form>
          )}

          {/* Workflow: Decision & Rate Valuation */}
          {workflowMode === 'decision' && selectedProcurement && (
            <form
              onSubmit={handleRecordDecision}
              className="bg-white p-5 rounded-3xl border-2 border-amber-500 shadow-lg space-y-4 text-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                  <span>Procurement Decision & Rate Valuation</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkflowMode('none')}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Decision Status *</label>
                <select
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold"
                >
                  <option value="ACCEPTED">ACCEPTED (पूर्ण स्वीकृत)</option>
                  <option value="PARTIALLY_ACCEPTED">PARTIALLY ACCEPTED (आंशिक स्वीकृत)</option>
                  <option value="REJECTED">REJECTED (अस्वीकृत)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate / Unit (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={ratePerUnit}
                    onChange={(e) => setRatePerUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Govt MSP / Kendra Rate</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deductions (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono text-rose-800"
                  />
                  <span className="text-[10px] text-slate-400">Moisture cut if any</span>
                </div>
              </div>

              {/* Total Calculation Strip */}
              <div className="p-3 bg-emerald-950 text-white rounded-2xl space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Accepted Quantity:</span>
                  <span className="font-mono">
                    {selectedProcurement.decision?.acceptedQuantity || 0}{' '}
                    {selectedProcurement.weighment?.unit || 'Qtl'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Gross Value:</span>
                  <span className="font-mono">
                    ₹
                    {(
                      (selectedProcurement.decision?.acceptedQuantity || 0) *
                      parseFloat(ratePerUnit || '0')
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-300 font-bold pt-1 border-t border-emerald-800">
                  <span>Net Payable to Farmer:</span>
                  <span className="font-mono text-base font-black">
                    ₹
                    {Math.max(
                      0,
                      (selectedProcurement.decision?.acceptedQuantity || 0) *
                        parseFloat(ratePerUnit || '0') -
                        parseFloat(deductions || '0')
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Confirming...' : 'Save Decision & Valuation'}
              </button>
            </form>
          )}

          {/* Workflow: Payment Settlement */}
          {workflowMode === 'payment' && selectedProcurement && (
            <form
              onSubmit={handleRecordPayment}
              className="bg-white p-5 rounded-3xl border-2 border-emerald-600 shadow-lg space-y-4 text-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  <span>Payment Settlement Recording</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkflowMode('none')}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-slate-800 font-bold">
                  Net Payable: ₹{selectedProcurement.pricing?.netPayable?.toLocaleString('en-IN') || 0}
                </div>
                <div className="text-[11px] text-slate-600">
                  Farmer: {selectedProcurement.farmerName} • Ref: {selectedProcurement.procurementNumber}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Status *</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
                >
                  <option value="PAID">PAID (पूर्ण भुगतान संपन्न)</option>
                  <option value="PARTIAL">PARTIAL (आंशिक भुगतान)</option>
                  <option value="PENDING">PENDING (लंबित)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Paid Amount (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="Direct Kendra Transfer">Direct Kendra Transfer</option>
                    <option value="DBT / Aadhaar Transfer">DBT / Aadhaar Transfer</option>
                    <option value="Bank Cheque">Bank Cheque</option>
                    <option value="Cash at Counter">Cash at Counter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transaction / UTR Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-KND-100234"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Record Payment Settlement'}
              </button>
            </form>
          )}

          {/* Selected Record Summary Card if no workflow active */}
          {workflowMode === 'none' && selectedProcurement && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedProcurement.procurementNumber}
                </span>
                <button
                  onClick={() => setReceiptModalRecord(selectedProcurement)}
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>View Slip</span>
                </button>
              </div>

              <ProcurementProgressTracker
                status={selectedProcurement.status}
                paymentStatus={selectedProcurement.payment?.status}
              />

              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Farmer:</span>
                  <strong className="text-slate-900">{selectedProcurement.farmerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{selectedProcurement.farmerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Produce:</span>
                  <span className="text-slate-900 font-medium">
                    {selectedProcurement.produce.cropName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Net Wt:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedProcurement.weighment?.netWeight || 0}{' '}
                    {selectedProcurement.weighment?.unit || 'Qtl'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Grade:</span>
                  <span className="text-emerald-800 font-semibold">
                    {selectedProcurement.quality?.grade || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span>Net Payable:</span>
                  <strong className="font-mono text-emerald-950 text-sm">
                    ₹{selectedProcurement.pricing?.netPayable?.toLocaleString('en-IN') || 0}
                  </strong>
                </div>
              </div>

              {/* Action Buttons for selected */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                {selectedProcurement.status === 'PENDING' && (
                  <button
                    onClick={() => openActionForm('arrival', selectedProcurement)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Verify Arrival
                  </button>
                )}

                {selectedProcurement.status === 'ARRIVED' && (
                  <button
                    onClick={() => openActionForm('weighment', selectedProcurement)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Enter Weights
                  </button>
                )}

                {selectedProcurement.status === 'WEIGHED' && (
                  <button
                    onClick={() => openActionForm('quality', selectedProcurement)}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Quality Check
                  </button>
                )}

                {selectedProcurement.status === 'QUALITY_CHECKED' && (
                  <button
                    onClick={() => openActionForm('decision', selectedProcurement)}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Decision & Rate
                  </button>
                )}

                {['ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED'].includes(
                  selectedProcurement.status
                ) && (
                  <button
                    onClick={() => handleCompleteProcurement(selectedProcurement)}
                    className="col-span-2 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Finalize & Generate Receipt
                  </button>
                )}

                {selectedProcurement.status === 'COMPLETED' && (
                  <button
                    onClick={() => openActionForm('payment', selectedProcurement)}
                    className="col-span-2 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Update Payment Status
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Official Receipt Modal */}
      {receiptModalRecord && (
        <ProcurementReceiptModal
          procurement={receiptModalRecord}
          onClose={() => setReceiptModalRecord(null)}
        />
      )}
    </div>
  );
};
