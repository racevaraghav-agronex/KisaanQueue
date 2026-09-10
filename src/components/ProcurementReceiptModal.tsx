import React from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Calendar,
  Scale,
  Award,
  IndianRupee,
  ShieldCheck,
  FileCheck,
  BadgeCheck
} from 'lucide-react';
import { ProcurementRecord } from '../types.ts';

interface ProcurementReceiptModalProps {
  procurement: ProcurementRecord;
  onClose: () => void;
}

export const ProcurementReceiptModal: React.FC<ProcurementReceiptModalProps> = ({
  procurement,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'ACCEPTED':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: CheckCircle2,
          text: 'Finalized / स्वीकृत'
        };
      case 'PARTIALLY_ACCEPTED':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: AlertCircle,
          text: 'Partially Accepted / आंशिक स्वीकृत'
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: AlertCircle,
          text: 'Rejected / अस्वीकृत'
        };
      case 'QUALITY_CHECKED':
        return {
          bg: 'bg-sky-100 text-sky-800 border-sky-300',
          icon: Award,
          text: 'Quality Inspected / गुणवत्ता जांची गई'
        };
      case 'WEIGHED':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          icon: Scale,
          text: 'Weighed / तौल संपन्न'
        };
      case 'ARRIVED':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: Clock,
          text: 'Arrived at Kendra / केंद्र पर उपस्थित'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: Clock,
          text: 'Pending / प्रतीक्षारत'
        };
    }
  };

  const statusBadge = getStatusBadge(procurement.status);
  const StatusIcon = statusBadge.icon;

  const paymentBadge = procurement.payment?.status === 'PAID'
    ? { bg: 'bg-emerald-500 text-white', text: 'PAID / पूर्ण भुगतान' }
    : procurement.payment?.status === 'PARTIAL'
    ? { bg: 'bg-amber-500 text-white', text: 'PARTIAL / आंशिक भुगतान' }
    : { bg: 'bg-rose-500 text-white', text: 'PENDING / भुगतान बकाया' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Top Control Bar - Hidden on print */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Official Digital Procurement Slip</span>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
              {procurement.receiptReference || procurement.procurementNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 md:p-8 bg-white text-slate-800 space-y-6 print:p-0 print:space-y-4">
          {/* Header */}
          <div className="border-b-2 border-emerald-800 pb-5 text-center relative">
            <div className="flex items-center justify-center gap-2 text-emerald-800 mb-1">
              <Building2 className="w-6 h-6" />
              <h2 className="text-xl font-black tracking-tight uppercase">
                {procurement.centre || 'Krishi Seva Kendra'}
              </h2>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Government Approved Primary Agricultural Procurement & Service Kendra
            </p>
            <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold tracking-wide">
              FARMER PRODUCE PROCUREMENT & WEIGHMENT SLIP / किसान फसल खरीद रसीद
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-600 px-2">
              <div>
                <strong>Procurement No:</strong>{' '}
                <span className="font-mono text-emerald-800 font-bold">{procurement.procurementNumber}</span>
              </div>
              <div>
                <strong>Date & Time:</strong>{' '}
                <span className="font-medium">
                  {new Date(procurement.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}{' '}
                  •{' '}
                  {new Date(procurement.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Farmer & Lot Identifiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Farmer Information / कृषक विवरण
              </div>
              <div className="text-sm font-bold text-slate-900">{procurement.farmerName}</div>
              <div className="text-slate-600">
                <span className="font-medium">Mobile:</span> {procurement.farmerPhone || 'N/A'}
              </div>
              <div className="text-slate-600">
                <span className="font-medium">Farmer ID:</span>{' '}
                <span className="font-mono text-[11px]">{procurement.farmerId}</span>
              </div>
              {procurement.tokenNumber && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                  <span>Queue Token:</span>
                  <strong className="font-mono">{procurement.tokenNumber}</strong>
                </div>
              )}
            </div>

            <div className="space-y-1.5 md:border-l md:border-slate-200 md:pl-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Lot & Arrival Details / आवक विवरण
              </div>
              <div className="text-slate-700">
                <span className="font-medium">Produce:</span>{' '}
                <strong className="text-slate-900">{procurement.produce.cropName}</strong>
                {procurement.produce.variety && (
                  <span className="text-slate-500"> ({procurement.produce.variety})</span>
                )}
              </div>
              <div className="text-slate-700">
                <span className="font-medium">Vehicle No:</span>{' '}
                <span className="font-mono font-bold text-slate-900">
                  {procurement.produce.vehicleNumber || 'Farmer Trolley / Bull-cart'}
                </span>
              </div>
              <div className="text-slate-700">
                <span className="font-medium">Declared Quantity:</span>{' '}
                <span className="font-bold">
                  {procurement.produce.declaredQuantity} {procurement.produce.unit}
                </span>{' '}
                {procurement.produce.bagsCount ? `(${procurement.produce.bagsCount} Bags)` : ''}
              </div>
              <div className="text-slate-700">
                <span className="font-medium">Arrival Gate:</span>{' '}
                <span>{procurement.arrival?.gateNumber || 'Gate 1'}</span>{' '}
                {procurement.arrival?.verified && (
                  <span className="text-emerald-700 font-semibold">✓ Verified</span>
                )}
              </div>
            </div>
          </div>

          {/* Weighment Slip Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>Weighbridge Slip / धर्मकांटा तौल पर्ची</span>
              </div>
              {procurement.weighment?.weighbridgeSlipNumber && (
                <span className="text-[11px] font-mono text-slate-500">
                  Slip No: {procurement.weighment.weighbridgeSlipNumber}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-medium uppercase">Gross Weight (सकल तौल)</div>
                <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                  {procurement.weighment?.grossWeight || 0}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    {procurement.weighment?.unit || 'Qtl'}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400">Vehicle + Produce</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-medium uppercase">Tare Weight (खाली तौल)</div>
                <div className="text-base font-black text-slate-700 font-mono mt-0.5">
                  {procurement.weighment?.tareWeight || 0}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    {procurement.weighment?.unit || 'Qtl'}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400">Empty Vehicle Weight</div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-500">
                <div className="text-[10px] text-emerald-800 font-bold uppercase">Net Weight (शुद्ध तौल)</div>
                <div className="text-lg font-black text-emerald-950 font-mono mt-0.5">
                  {procurement.weighment?.netWeight || 0}{' '}
                  <span className="text-xs font-semibold text-emerald-700">
                    {procurement.weighment?.unit || 'Qtl'}
                  </span>
                </div>
                <div className="text-[9px] text-emerald-700 font-medium">Gross - Tare</div>
              </div>
            </div>
          </div>

          {/* Quality Assessment & Decision */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Award className="w-4 h-4 text-emerald-700" />
              <span>Quality Inspection & Decision / गुणवत्ता जांच व निर्णय</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">Grade (श्रेणी)</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {procurement.quality?.grade || 'FAQ'}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">Moisture (नमी)</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {procurement.quality?.moisturePercentage || 0}%
                  </div>
                </div>

                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">Foreign Matter (कचरा)</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {procurement.quality?.foreignMatterPercentage || 0}%
                  </div>
                </div>

                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">Decision</div>
                  <div className="text-sm font-bold text-emerald-800 mt-0.5">
                    {procurement.decision?.decisionStatus || procurement.status}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="font-medium text-emerald-900">Accepted Quantity:</span>
                  <strong className="text-sm font-mono text-emerald-950">
                    {procurement.decision?.acceptedQuantity || 0} {procurement.weighment?.unit || 'Qtl'}
                  </strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="font-medium text-rose-900">Rejected Quantity:</span>
                  <strong className="text-sm font-mono text-rose-950">
                    {procurement.decision?.rejectedQuantity || 0} {procurement.weighment?.unit || 'Qtl'}
                  </strong>
                </div>
              </div>

              {procurement.decision?.rejectedQuantity > 0 && procurement.decision?.rejectionReason && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <strong>Reason for rejection / अस्वीकृति कारण:</strong>{' '}
                  <span>{procurement.decision.rejectionReason}</span>
                </div>
              )}

              {procurement.quality?.remarks && (
                <div className="text-[11px] text-slate-600 italic">
                  <strong>Inspector Remarks:</strong> {procurement.quality.remarks}
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Valuation Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <IndianRupee className="w-4 h-4 text-emerald-700" />
              <span>Valuation & Payment Details / मूल्य एवं भुगतान विवरण</span>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  <tr>
                    <th className="p-3">Particulars</th>
                    <th className="p-3 text-center">Quantity</th>
                    <th className="p-3 text-right">Rate / Unit</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  <tr>
                    <td className="p-3">
                      <div className="font-semibold">{procurement.produce.cropName}</div>
                      <div className="text-[11px] text-slate-500">
                        {procurement.quality?.grade || 'FAQ'} - Accepted Lot
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono">
                      {procurement.decision?.acceptedQuantity || 0} {procurement.weighment?.unit || 'Qtl'}
                    </td>
                    <td className="p-3 text-right font-mono">
                      ₹{procurement.pricing?.ratePerUnit?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      ₹{procurement.pricing?.totalAmount?.toLocaleString('en-IN') || 0}
                    </td>
                  </tr>

                  {Boolean(procurement.pricing?.deductions) && (
                    <tr className="text-rose-700 bg-rose-50/50">
                      <td className="p-3 font-medium">Standard Deductions (Moisture/Chaff Cut)</td>
                      <td className="p-3 text-center">-</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right font-mono font-medium">
                        - ₹{procurement.pricing.deductions.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}

                  <tr className="bg-emerald-50 text-emerald-950 font-bold text-sm">
                    <td className="p-3" colSpan={3}>
                      Total Net Payable to Farmer (कुल देय राशि)
                    </td>
                    <td className="p-3 text-right font-mono text-base font-black text-emerald-900">
                      ₹{procurement.pricing?.netPayable?.toLocaleString('en-IN') || 0}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Payment Settlement Strip */}
              <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Payment Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${paymentBadge.bg}`}>
                    {paymentBadge.text}
                  </span>
                </div>

                <div className="text-right text-xs space-y-0.5">
                  <div>
                    <span className="text-slate-400">Paid Amount: </span>
                    <strong className="font-mono text-emerald-400 font-bold">
                      ₹{procurement.payment?.paidAmount?.toLocaleString('en-IN') || 0}
                    </strong>
                  </div>
                  {procurement.payment?.paymentReference && (
                    <div className="text-slate-400 text-[11px]">
                      Ref: <span className="font-mono text-white">{procurement.payment.paymentReference}</span>
                    </div>
                  )}
                  {procurement.payment?.paymentMethod && (
                    <div className="text-slate-400 text-[10px]">
                      Method: {procurement.payment.paymentMethod}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Seal */}
          <div className="pt-6 border-t-2 border-dashed border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div className="space-y-8">
              <div className="h-10 flex items-end justify-center font-serif italic text-slate-800">
                {procurement.farmerName}
              </div>
              <div className="border-t border-slate-300 pt-1">
                <strong>Farmer Signature / कृषक हस्ताक्षर</strong>
                <div className="text-[10px] text-slate-400">I hereby verify the weights and grades shown</div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="h-10 flex items-center justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg font-bold text-[10px] uppercase">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>Kendra Authorized Seal</span>
                </div>
              </div>
              <div className="border-t border-slate-300 pt-1">
                <strong>Authorized Weighment Officer / केंद्र प्रभारी</strong>
                <div className="text-[10px] text-slate-400">Krishi Seva Kendra Procurement Cell</div>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-3">
            This is a computer-generated official procurement and weighment slip issued by Kisan Queue.
            Slip Ref: {procurement.receiptReference || procurement.procurementNumber} • Generated on{' '}
            {new Date().toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  );
};
