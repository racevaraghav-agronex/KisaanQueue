import mongoose, { Schema, Document } from 'mongoose';

export interface IStockMovement extends Document {
  productId: string;
  productCode: string;
  productName: string;
  type: 'purchase' | 'sale' | 'adjustment';
  quantity: number;
  resultingStock: number;
  referenceInvoice?: string;
  notes?: string;
  performedBy: string;
  date: Date;
}

const StockMovementSchema: Schema = new Schema({
  productId: { type: String, required: true },
  productCode: { type: String, required: true },
  productName: { type: String, required: true },
  type: {
    type: String,
    enum: ['purchase', 'sale', 'adjustment'],
    required: true
  },
  quantity: { type: Number, required: true },
  resultingStock: { type: Number, required: true },
  referenceInvoice: { type: String, default: '' },
  notes: { type: String, default: '' },
  performedBy: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

export const StockMovementModel: mongoose.Model<any> = mongoose.models.StockMovement
  ? (mongoose.models.StockMovement as mongoose.Model<any>)
  : mongoose.model('StockMovement', StockMovementSchema);
