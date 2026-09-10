import mongoose, { Schema, Document } from 'mongoose';
import { wrapModel } from '../memoryDb.ts';

export interface ISlot extends Document {
  serviceId: string;
  serviceName: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // '09:00'
  endTime: string; // '09:30'
  slotString: string; // '09:00 AM - 09:30 AM'
  centre: string;
  capacity: number;
  bookedCount: number;
  status: 'AVAILABLE' | 'FULL' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

const SlotSchema: Schema = new Schema(
  {
    serviceId: { type: String, required: true, trim: true, uppercase: true },
    serviceName: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true }, // Format: YYYY-MM-DD
    startTime: { type: String, required: true, trim: true }, // Format: HH:mm
    endTime: { type: String, required: true, trim: true }, // Format: HH:mm
    slotString: { type: String, required: true, trim: true },
    centre: { type: String, default: 'Krishi Seva Kendra - Main Centre', trim: true },
    capacity: { type: Number, required: true, default: 10, min: 1 },
    bookedCount: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['AVAILABLE', 'FULL', 'CLOSED'],
      default: 'AVAILABLE'
    }
  },
  {
    timestamps: true
  }
);

// Compound index to guarantee uniqueness for a service's slot on a specific date
SlotSchema.index({ serviceId: 1, date: 1, startTime: 1 }, { unique: true });
SlotSchema.index({ date: 1, serviceId: 1 });

const RawSlotModel: mongoose.Model<any> = mongoose.models.Slot
  ? (mongoose.models.Slot as mongoose.Model<any>)
  : mongoose.model('Slot', SlotSchema);

export const SlotModel: mongoose.Model<any> = wrapModel('Slot', RawSlotModel);
