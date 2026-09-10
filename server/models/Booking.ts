import mongoose, { Schema, Document } from 'mongoose';

export type BookingStatus = 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface IBooking extends Document {
  bookingReference: string;
  farmerId: mongoose.Types.ObjectId | string;
  farmerName: string;
  farmerPhone: string;
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  centre: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // '09:00'
  endTime: string; // '09:30'
  slotString: string; // '09:00 AM - 09:30 AM'
  slotId?: mongoose.Types.ObjectId | string;
  status: BookingStatus;
  tokenId?: mongoose.Types.ObjectId | string;
  tokenNumber?: string;
  notes?: string;
  rescheduledFrom?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
  {
    bookingReference: { type: String, required: true, unique: true, trim: true, uppercase: true },
    farmerId: { type: Schema.Types.Mixed, required: true, ref: 'User' },
    farmerName: { type: String, required: true, trim: true },
    farmerPhone: { type: String, required: true, trim: true },
    serviceId: { type: String, required: true, trim: true },
    serviceName: { type: String, required: true, trim: true },
    serviceCode: { type: String, required: true, trim: true, uppercase: true },
    centre: { type: String, default: 'Krishi Seva Kendra - Main Centre', trim: true },
    date: { type: String, required: true, trim: true }, // Format: YYYY-MM-DD
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    slotString: { type: String, required: true, trim: true },
    slotId: { type: Schema.Types.ObjectId, ref: 'Slot', default: null },
    status: {
      type: String,
      enum: ['BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
      default: 'CONFIRMED'
    },
    tokenId: { type: Schema.Types.Mixed, ref: 'Token', default: null },
    tokenNumber: { type: String, default: null },
    notes: { type: String, default: '' },
    rescheduledFrom: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
    completedAt: { type: Date, default: null }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookup
BookingSchema.index({ farmerId: 1, date: 1, status: 1 });
BookingSchema.index({ serviceId: 1, date: 1, startTime: 1, status: 1 });
BookingSchema.index({ bookingReference: 1 });
BookingSchema.index({ date: 1, status: 1 });

export const BookingModel: mongoose.Model<any> = mongoose.models.Booking
  ? (mongoose.models.Booking as mongoose.Model<any>)
  : mongoose.model('Booking', BookingSchema);
