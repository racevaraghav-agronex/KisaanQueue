import mongoose, { Schema, Document } from 'mongoose';
import { wrapModel } from '../memoryDb.ts';

export type NotificationType =
  | 'TOKEN_BOOKED'
  | 'SLOT_CONFIRMED'
  | 'TOKEN_APPROACHING'
  | 'TOKEN_CALLED'
  | 'TOKEN_COMPLETED'
  | 'TOKEN_CANCELLED'
  | 'SLOT_CANCELLED'
  | 'SLOT_RESCHEDULED'
  | 'PROCUREMENT_STATUS_CHANGED'
  | 'PROCUREMENT_COMPLETED'
  | 'PAYMENT_STATUS_CHANGED'
  | 'CENTRE_UPDATE'
  | 'SERVICE_UPDATE'
  | 'GENERAL';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId | string;
  recipientRole: 'farmer' | 'staff' | 'admin';
  recipientPhone?: string;
  type: NotificationType;
  title: string;
  titleHi: string;
  message: string;
  messageHi: string;
  language: string;
  entityType?: 'token' | 'slot' | 'procurement' | 'centre' | 'service' | 'general';
  entityId?: string;
  entityReference?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  channel: string;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    recipientRole: {
      type: String,
      enum: ['farmer', 'staff', 'admin'],
      default: 'farmer'
    },
    recipientPhone: { type: String, default: '' },
    type: {
      type: String,
      required: true,
      enum: [
        'TOKEN_BOOKED',
        'SLOT_CONFIRMED',
        'TOKEN_APPROACHING',
        'TOKEN_CALLED',
        'TOKEN_COMPLETED',
        'TOKEN_CANCELLED',
        'SLOT_CANCELLED',
        'SLOT_RESCHEDULED',
        'PROCUREMENT_STATUS_CHANGED',
        'PROCUREMENT_COMPLETED',
        'PAYMENT_STATUS_CHANGED',
        'CENTRE_UPDATE',
        'SERVICE_UPDATE',
        'GENERAL'
      ],
      index: true
    },
    title: { type: String, required: true },
    titleHi: { type: String, required: true },
    message: { type: String, required: true },
    messageHi: { type: String, required: true },
    language: { type: String, default: 'en' },
    entityType: {
      type: String,
      enum: ['token', 'slot', 'procurement', 'centre', 'service', 'general'],
      default: 'general'
    },
    entityId: { type: String, default: '' },
    entityReference: { type: String, default: '', index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    channel: { type: String, default: 'in_app' },
    actionUrl: { type: String, default: '' }
  },
  {
    timestamps: true
  }
);

// High-performance compound indexes for user dashboard queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ entityReference: 1, type: 1 });

const RawNotificationModel: mongoose.Model<any> = mongoose.models.Notification
  ? (mongoose.models.Notification as mongoose.Model<any>)
  : mongoose.model('Notification', NotificationSchema);

export const NotificationModel: mongoose.Model<any> = wrapModel('Notification', RawNotificationModel);
