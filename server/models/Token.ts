import mongoose, { Schema, Document } from 'mongoose';
import { wrapModel } from '../memoryDb.ts';

export interface IToken extends Document {
  tokenNumber: string;
  sequence: number;
  farmerId: mongoose.Types.ObjectId | string;
  farmerName: string;
  farmerPhone: string;
  serviceId: string;
  serviceName: string;
  status: 'waiting' | 'called' | 'serving' | 'hold' | 'completed' | 'skipped' | 'cancelled';
  counterNumber?: number;
  staffId?: string;
  staffName?: string;
  centre?: string;
  issuedAt: Date;
  calledAt?: Date;
  servedAt?: Date;
  holdAt?: Date;
  holdReason?: string;
  recallCount?: number;
  completedAt?: Date;
  notes?: string;
  bookingId?: mongoose.Types.ObjectId | string;
  bookingReference?: string;
  slotString?: string;
  bookedDate?: string;
  requiresBilling?: boolean;
}

const TokenSchema: Schema = new Schema({
  tokenNumber: { type: String, required: true, unique: true },
  sequence: { type: Number, required: true },
  farmerId: { type: Schema.Types.Mixed, required: true },
  farmerName: { type: String, required: true },
  farmerPhone: { type: String, required: true },
  serviceId: { type: String, required: true },
  serviceName: { type: String, required: true },
  status: {
    type: String,
    enum: ['waiting', 'called', 'serving', 'hold', 'completed', 'skipped', 'cancelled'],
    default: 'waiting'
  },
  counterNumber: { type: Number, default: null },
  staffId: { type: String, default: null },
  staffName: { type: String, default: null },
  centre: { type: String, default: 'Krishi Seva Kendra - Main Centre' },
  issuedAt: { type: Date, default: Date.now },
  calledAt: { type: Date },
  servedAt: { type: Date },
  holdAt: { type: Date },
  holdReason: { type: String, default: '' },
  recallCount: { type: Number, default: 0 },
  completedAt: { type: Date },
  notes: { type: String, default: '' },
  requiresBilling: { type: Boolean, default: false },
  bookingId: { type: Schema.Types.Mixed, default: null },
  bookingReference: { type: String, default: null },
  slotString: { type: String, default: null },
  bookedDate: { type: String, default: null }
});

const RawTokenModel: mongoose.Model<any> = mongoose.models.Token 
  ? (mongoose.models.Token as mongoose.Model<any>)
  : mongoose.model('Token', TokenSchema);

export const TokenModel: mongoose.Model<any> = wrapModel('Token', RawTokenModel);

