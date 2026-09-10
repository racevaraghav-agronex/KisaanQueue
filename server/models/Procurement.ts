import mongoose, { Schema, Document } from 'mongoose';
import { wrapModel } from '../memoryDb.ts';

export interface IProcurementProduce {
  cropName: string;
  variety?: string;
  declaredQuantity: number;
  unit: 'Quintal' | 'Kg';
  bagsCount?: number;
  vehicleNumber?: string;
  notes?: string;
}

export interface IProcurementArrival {
  verified: boolean;
  arrivedAt?: Date;
  verifiedByStaffId?: string;
  verifiedByStaffName?: string;
  gateNumber?: string;
}

export interface IProcurementWeighment {
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  unit: 'Quintal' | 'Kg';
  weighbridgeSlipNumber?: string;
  weighedAt?: Date;
  weighedByStaffId?: string;
  weighedByStaffName?: string;
}

export interface IProcurementQuality {
  grade?: string;
  moisturePercentage?: number;
  foreignMatterPercentage?: number;
  damagedPercentage?: number;
  remarks?: string;
  inspectedAt?: Date;
  inspectedByStaffId?: string;
  inspectedByStaffName?: string;
}

export interface IProcurementDecision {
  decisionStatus: 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED' | 'PENDING';
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string;
  decisionAt?: Date;
  decidedByStaffId?: string;
  decidedByStaffName?: string;
}

export interface IProcurementPricing {
  ratePerUnit: number;
  totalAmount: number;
  deductions: number;
  netPayable: number;
}

export interface IProcurementPayment {
  status: 'PENDING' | 'PAID' | 'PARTIAL';
  paidAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: Date;
  recordedBy?: string;
  notes?: string;
}

export interface IProcurementStatusHistory {
  status: string;
  timestamp: Date;
  changedBy: string;
  notes?: string;
}

export interface IProcurement extends Document {
  procurementNumber: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  bookingId?: string;
  bookingReference?: string;
  tokenId?: string;
  tokenNumber?: string;
  centre: string;
  produce: IProcurementProduce;
  arrival: IProcurementArrival;
  weighment: IProcurementWeighment;
  quality: IProcurementQuality;
  decision: IProcurementDecision;
  pricing: IProcurementPricing;
  payment: IProcurementPayment;
  status: 'PENDING' | 'ARRIVED' | 'WEIGHED' | 'QUALITY_CHECKED' | 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED' | 'COMPLETED';
  statusHistory: IProcurementStatusHistory[];
  receiptReference?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProcurementProduceSchema = new Schema({
  cropName: { type: String, required: true, trim: true },
  variety: { type: String, default: '', trim: true },
  declaredQuantity: { type: Number, required: true, min: 0, default: 0 },
  unit: { type: String, enum: ['Quintal', 'Kg'], default: 'Quintal' },
  bagsCount: { type: Number, default: 0, min: 0 },
  vehicleNumber: { type: String, default: '', trim: true },
  notes: { type: String, default: '' }
}, { _id: false });

const ProcurementArrivalSchema = new Schema({
  verified: { type: Boolean, default: false },
  arrivedAt: { type: Date },
  verifiedByStaffId: { type: String, default: '' },
  verifiedByStaffName: { type: String, default: '' },
  gateNumber: { type: String, default: '' }
}, { _id: false });

const ProcurementWeighmentSchema = new Schema({
  grossWeight: { type: Number, default: 0, min: 0 },
  tareWeight: { type: Number, default: 0, min: 0 },
  netWeight: { type: Number, default: 0, min: 0 },
  unit: { type: String, enum: ['Quintal', 'Kg'], default: 'Quintal' },
  weighbridgeSlipNumber: { type: String, default: '' },
  weighedAt: { type: Date },
  weighedByStaffId: { type: String, default: '' },
  weighedByStaffName: { type: String, default: '' }
}, { _id: false });

const ProcurementQualitySchema = new Schema({
  grade: {
    type: String,
    enum: ['Grade A', 'Grade B', 'Grade C', 'FAQ', 'Below Standard', ''],
    default: 'FAQ'
  },
  moisturePercentage: { type: Number, default: 0, min: 0, max: 100 },
  foreignMatterPercentage: { type: Number, default: 0, min: 0, max: 100 },
  damagedPercentage: { type: Number, default: 0, min: 0, max: 100 },
  remarks: { type: String, default: '' },
  inspectedAt: { type: Date },
  inspectedByStaffId: { type: String, default: '' },
  inspectedByStaffName: { type: String, default: '' }
}, { _id: false });

const ProcurementDecisionSchema = new Schema({
  decisionStatus: {
    type: String,
    enum: ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'PENDING'],
    default: 'PENDING'
  },
  acceptedQuantity: { type: Number, default: 0, min: 0 },
  rejectedQuantity: { type: Number, default: 0, min: 0 },
  rejectionReason: { type: String, default: '' },
  decisionAt: { type: Date },
  decidedByStaffId: { type: String, default: '' },
  decidedByStaffName: { type: String, default: '' }
}, { _id: false });

const ProcurementPricingSchema = new Schema({
  ratePerUnit: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, default: 0, min: 0 },
  deductions: { type: Number, default: 0, min: 0 },
  netPayable: { type: Number, default: 0, min: 0 }
}, { _id: false });

const ProcurementPaymentSchema = new Schema({
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'PARTIAL'],
    default: 'PENDING'
  },
  paidAmount: { type: Number, default: 0, min: 0 },
  paymentMethod: { type: String, default: 'Direct Kendra Transfer' },
  paymentReference: { type: String, default: '' },
  paidAt: { type: Date },
  recordedBy: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { _id: false });

const ProcurementStatusHistorySchema = new Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  changedBy: { type: String, default: 'System' },
  notes: { type: String, default: '' }
}, { _id: false });

const ProcurementSchema: Schema = new Schema({
  procurementNumber: { type: String, required: true, unique: true, index: true },
  farmerId: { type: String, required: true, index: true },
  farmerName: { type: String, required: true },
  farmerPhone: { type: String, default: '', index: true },
  bookingId: { type: String, default: '' },
  bookingReference: { type: String, default: '' },
  tokenId: { type: String, default: '' },
  tokenNumber: { type: String, default: '' },
  centre: { type: String, default: 'Krishi Seva Kendra - Main Centre' },
  produce: { type: ProcurementProduceSchema, required: true },
  arrival: { type: ProcurementArrivalSchema, default: () => ({}) },
  weighment: { type: ProcurementWeighmentSchema, default: () => ({}) },
  quality: { type: ProcurementQualitySchema, default: () => ({}) },
  decision: { type: ProcurementDecisionSchema, default: () => ({}) },
  pricing: { type: ProcurementPricingSchema, default: () => ({}) },
  payment: { type: ProcurementPaymentSchema, default: () => ({}) },
  status: {
    type: String,
    enum: [
      'PENDING',
      'ARRIVED',
      'WEIGHED',
      'QUALITY_CHECKED',
      'ACCEPTED',
      'PARTIALLY_ACCEPTED',
      'REJECTED',
      'COMPLETED'
    ],
    default: 'PENDING',
    index: true
  },
  statusHistory: [ProcurementStatusHistorySchema],
  receiptReference: { type: String, default: '' },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

const RawProcurementModel: mongoose.Model<any> = mongoose.models.Procurement
  ? (mongoose.models.Procurement as mongoose.Model<any>)
  : mongoose.model('Procurement', ProcurementSchema);

export const ProcurementModel: mongoose.Model<any> = wrapModel('Procurement', RawProcurementModel);
