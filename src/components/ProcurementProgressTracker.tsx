import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Scale,
  Award,
  CheckSquare,
  Receipt
} from 'lucide-react';
import { ProcurementStatus } from '../types.ts';

interface ProcurementProgressTrackerProps {
  status: ProcurementStatus;
  paymentStatus?: 'PENDING' | 'PAID' | 'PARTIAL';
}

export const ProcurementProgressTracker: React.FC<ProcurementProgressTrackerProps> = ({
  status,
  paymentStatus
}) => {
  const steps = [
    {
      id: 'arrival',
      label: 'Arrival',
      sublabel: 'Gate In',
      icon: Truck,
      completedStatuses: ['ARRIVED', 'WEIGHED', 'QUALITY_CHECKED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'COMPLETED'],
      activeStatuses: ['PENDING']
    },
    {
      id: 'weighment',
      label: 'Weighment',
      sublabel: 'Gross & Tare',
      icon: Scale,
      completedStatuses: ['WEIGHED', 'QUALITY_CHECKED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'COMPLETED'],
      activeStatuses: ['ARRIVED']
    },
    {
      id: 'quality',
      label: 'Quality Check',
      sublabel: 'Grade & Moisture',
      icon: Award,
      completedStatuses: ['QUALITY_CHECKED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'COMPLETED'],
      activeStatuses: ['WEIGHED']
    },
    {
      id: 'decision',
      label: 'Decision',
      sublabel: 'Accept / Reject',
      icon: CheckSquare,
      completedStatuses: ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'COMPLETED'],
      activeStatuses: ['QUALITY_CHECKED']
    },
    {
      id: 'settlement',
      label: 'Settlement',
      sublabel: paymentStatus === 'PAID' ? 'Paid' : 'Receipt Issued',
      icon: Receipt,
      completedStatuses: ['COMPLETED'],
      activeStatuses: ['ACCEPTED', 'PARTIALLY_ACCEPTED']
    }
  ];

  const getStepState = (step: typeof steps[0]) => {
    if (step.completedStatuses.includes(status)) {
      return 'completed';
    }
    if (step.activeStatuses.includes(status)) {
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="w-full py-4">
      <div className="grid grid-cols-5 gap-2 relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-slate-200 -z-0" />

        {steps.map((step) => {
          const state = getStepState(step);
          const Icon = step.icon;

          let iconBg = 'bg-slate-100 text-slate-400 border-slate-300';
          let textColor = 'text-slate-500';

          if (state === 'completed') {
            iconBg = 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
            textColor = 'text-emerald-800 font-semibold';
          } else if (state === 'active') {
            iconBg = 'bg-amber-500 text-white border-amber-500 ring-4 ring-amber-100 animate-pulse';
            textColor = 'text-amber-700 font-bold';
          }

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${iconBg}`}
              >
                {state === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className={`text-[11px] mt-1.5 leading-tight ${textColor}`}>
                {step.label}
              </span>
              <span className="text-[9px] text-slate-400 leading-tight hidden sm:block">
                {step.sublabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
