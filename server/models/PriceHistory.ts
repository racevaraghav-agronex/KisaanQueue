import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceHistory extends Document {
  productId: mongoose.Types.ObjectId | string;
  productCode: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  changedAt: Date;
}

const PriceHistorySchema: Schema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  productCode: { type: String, required: true },
  productName: { type: String, required: true },
  oldPrice: { type: Number, required: true },
  newPrice: { type: Number, required: true },
  changedBy: { type: String, required: true },
  changedAt: { type: Date, default: Date.now, index: true }
});

import { wrapModel } from '../memoryDb.ts';

const RawPriceHistoryModel: mongoose.Model<any> = mongoose.models.PriceHistory
  ? (mongoose.models.PriceHistory as mongoose.Model<any>)
  : mongoose.model('PriceHistory', PriceHistorySchema);

export const PriceHistoryModel: mongoose.Model<any> = wrapModel('PriceHistory', RawPriceHistoryModel);
