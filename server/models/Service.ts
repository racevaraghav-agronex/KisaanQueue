import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  code: string;
  name: string;
  description: string;
  averageMinutes: number;
  category: string;
  fee: number;
  isActive: boolean;
  slotDurationMinutes?: number;
  slotCapacity?: number;
  workingStartTime?: string;
  workingEndTime?: string;
}

const ServiceSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  averageMinutes: { type: Number, default: 10, min: 1 },
  category: { type: String, default: 'General', trim: true },
  fee: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  slotDurationMinutes: { type: Number, default: 30, min: 5, max: 180 },
  slotCapacity: { type: Number, default: 10, min: 1, max: 100 },
  workingStartTime: { type: String, default: '09:00' },
  workingEndTime: { type: String, default: '17:00' }
});

import { wrapModel } from '../memoryDb.ts';

const RawServiceModel: mongoose.Model<any> = mongoose.models.Service 
  ? (mongoose.models.Service as mongoose.Model<any>)
  : mongoose.model('Service', ServiceSchema);

export const ServiceModel: mongoose.Model<any> = wrapModel('Service', RawServiceModel);


export const DEFAULT_SERVICES = [
  {
    id: 'fert-seeds',
    code: 'FS',
    name: 'Fertilizer & Seeds',
    description: 'Claim subsidized fertilizers (Urea, DAP) and collect certified high-yield seed varieties.',
    averageMinutes: 8,
    category: 'Inputs'
  },
  {
    id: 'gov-schemes',
    code: 'PMKSY',
    name: 'Government Schemes',
    description: 'Enroll in PM-Kisan Samman Nidhi, drip irrigation subsidies, and agricultural grants.',
    averageMinutes: 10,
    category: 'Schemes'
  },
  {
    id: 'soil-card',
    code: 'SHC',
    name: 'Soil Health Card',
    description: 'Submit field soil samples for lab testing and receive customized crop nutrient advisories.',
    averageMinutes: 12,
    category: 'Advisory'
  },
  {
    id: 'kcc-card',
    code: 'KCC',
    name: 'Kisan Credit Card',
    description: 'Apply for flexible low-interest crop credit, loan limit renewals, and subsidy paperwork.',
    averageMinutes: 15,
    category: 'Finance'
  },
  {
    id: 'crop-insr',
    code: 'PMFBY',
    name: 'Crop Insurance',
    description: 'Register crop damage claims under PMFBY, verify acreage, and track compensation relief.',
    averageMinutes: 14,
    category: 'Insurance'
  },
  {
    id: 'farm-equip',
    code: 'AGRI-EQ',
    name: 'Farm Equipment',
    description: 'Book subsidized tractors, seed drills, harvesters, and solar pumps via Custom Hiring Centers.',
    averageMinutes: 10,
    category: 'Mechanization'
  }
];
