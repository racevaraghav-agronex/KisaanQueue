import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: 'farmer' | 'staff' | 'admin';
  status: 'active' | 'inactive';
  counterNumber?: number;
  centre?: string;
  shiftStatus?: 'active' | 'break' | 'offline';
  assignedService?: string;
  createdAt: Date;
  updatedAt?: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['farmer', 'staff', 'admin'], 
    default: 'farmer' 
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  counterNumber: { type: Number, default: null },
  centre: { type: String, default: 'Krishi Seva Kendra - Main Centre' },
  shiftStatus: {
    type: String,
    enum: ['active', 'break', 'offline'],
    default: 'active'
  },
  assignedService: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', function(this: any) {
  this.updatedAt = new Date();
});

export const UserModel: mongoose.Model<any> = mongoose.models.User 
  ? (mongoose.models.User as mongoose.Model<any>)
  : mongoose.model('User', UserSchema);

