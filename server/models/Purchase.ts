import mongoose, { Schema, Document } from 'mongoose';
import { wrapModel } from '../memoryDb.ts';

export interface IPurchaseItem {
  productName: string;
  productId?: string;
  productCode?: string;
  quantity: number;
  purchaseRate: number;
  amount: number;
}

export interface IPurchase extends Document {
  invoiceNumber: string;
  supplier: string;
  date: Date;
  itemsCount: number;
  items: IPurchaseItem[];
  total: number;
  recordedBy: string;
  createdAt: Date;
}

const PurchaseItemSchema: Schema = new Schema({
  productName: { type: String, required: true },
  productId: { type: String },
  productCode: { type: String },
  quantity: { type: Number, required: true, default: 1 },
  purchaseRate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 }
}, { _id: false });

const PurchaseSchema: Schema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  supplier: { type: String, required: true, trim: true },
  date: { type: Date, default: Date.now },
  itemsCount: { type: Number, default: 0 },
  items: [PurchaseItemSchema],
  total: { type: Number, required: true, default: 0 },
  recordedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const RawPurchaseModel: mongoose.Model<any> = mongoose.models.Purchase
  ? (mongoose.models.Purchase as mongoose.Model<any>)
  : mongoose.model('Purchase', PurchaseSchema);

export const PurchaseModel: mongoose.Model<any> = wrapModel('Purchase', RawPurchaseModel);
