import mongoose, { Schema, Document } from 'mongoose';

export interface ISaleItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  rate: number;
  amount: number;
  unit: string;
}

export interface ISale extends Document {
  invoiceNumber: string;
  date: Date;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  tokenNumber: string;
  items: ISaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountReceived?: number;
  changeGiven?: number;
  staffId: string;
  staffName: string;
  paymentMethod: string;
  paymentReference?: string;
  paymentStatus: 'paid' | 'pending';
  notes?: string;
  createdAt: Date;
}

const SaleItemSchema: Schema = new Schema({
  productId: { type: String, required: true },
  productCode: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true, default: 'Unit' }
}, { _id: false });

const SaleSchema: Schema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  farmerId: { type: String, required: true },
  farmerName: { type: String, required: true },
  farmerPhone: { type: String, default: '' },
  tokenNumber: { type: String, default: '' },
  items: [SaleItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },
  amountReceived: { type: Number, default: 0 },
  changeGiven: { type: Number, default: 0 },
  staffId: { type: String, required: true },
  staffName: { type: String, required: true },
  paymentMethod: { type: String, default: 'Cash' },
  paymentReference: { type: String, default: '' },
  paymentStatus: { type: String, enum: ['paid', 'pending'], default: 'paid' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

import { wrapModel } from '../memoryDb.ts';

const RawSaleModel: mongoose.Model<any> = mongoose.models.Sale
  ? (mongoose.models.Sale as mongoose.Model<any>)
  : mongoose.model('Sale', SaleSchema);

export const SaleModel: mongoose.Model<any> = wrapModel('Sale', RawSaleModel);
