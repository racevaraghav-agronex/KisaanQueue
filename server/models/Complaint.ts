import mongoose, { Schema, Document } from 'mongoose';
import { wrapModel } from '../memoryDb.ts';

export interface IComplaint extends Document {
  complaintNumber: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  rating?: number;
  feedback?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
  centre: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema: Schema = new Schema({
  complaintNumber: { type: String, required: true, unique: true },
  farmerId: { type: String, required: true },
  farmerName: { type: String, required: true },
  farmerPhone: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: [
      'Token & Queue Delay',
      'Fertilizer & Seed Stock',
      'Procurement Weighment',
      'Payment Discrepancy',
      'Staff Assistance',
      'Soil Health Card',
      'Other'
    ],
    default: 'Other'
  },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String, default: '' },
  assignedStaffId: { type: String },
  assignedStaffName: { type: String },
  resolutionNotes: { type: String, default: '' },
  resolvedAt: { type: Date },
  centre: { type: String, default: 'Krishi Seva Kendra - Main Centre' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const RawComplaintModel: mongoose.Model<any> = mongoose.models.Complaint
  ? (mongoose.models.Complaint as mongoose.Model<any>)
  : mongoose.model('Complaint', ComplaintSchema);

export const ComplaintModel: mongoose.Model<any> = wrapModel('Complaint', RawComplaintModel);
