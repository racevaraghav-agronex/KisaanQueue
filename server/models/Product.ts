import mongoose, { Schema, Document } from 'mongoose';
import { wrapModel } from '../memoryDb.ts';

export interface IProduct extends Document {
  code: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  purchaseRate: number;
  sellingRate: number;
  minThreshold: number;
  supplier?: string;
  description?: string;
  isActive: boolean;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, default: 'Fertilizer', trim: true },
  stock: { type: Number, required: true, default: 0, min: 0 },
  unit: { type: String, required: true, default: 'Bag', trim: true },
  purchaseRate: { type: Number, required: true, default: 0, min: 0 },
  sellingRate: { type: Number, required: true, default: 0, min: 0 },
  minThreshold: { type: Number, required: true, default: 10, min: 0 },
  supplier: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-compute status before saving
ProductSchema.pre('save', function (this: any) {
  if (this.stock <= 0) {
    this.status = 'out_of_stock';
  } else if (this.stock <= (this.minThreshold || 10)) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }
  this.updatedAt = new Date();
});

const RawProductModel: mongoose.Model<any> = mongoose.models.Product
  ? (mongoose.models.Product as mongoose.Model<any>)
  : mongoose.model('Product', ProductSchema);

export const ProductModel: mongoose.Model<any> = wrapModel('Product', RawProductModel);
