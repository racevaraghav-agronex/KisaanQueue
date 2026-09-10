export type UserRole = 'farmer' | 'staff' | 'admin';

export type TokenStatus = 'waiting' | 'called' | 'serving' | 'hold' | 'completed' | 'skipped' | 'cancelled';

export type ShiftStatus = 'active' | 'break' | 'offline';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status?: 'active' | 'inactive';
  counterNumber?: number;
  centre?: string;
  shiftStatus?: ShiftStatus;
  assignedService?: string;
  createdAt?: string;
}

export interface ServiceItem {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  description: string;
  averageMinutes: number;
  category: string;
  fee?: number;
  isActive?: boolean;
  slotDurationMinutes?: number;
  slotCapacity?: number;
  workingStartTime?: string;
  workingEndTime?: string;
}

export interface TokenItem {
  _id: string;
  tokenNumber: string;
  sequence: number;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  serviceId: string;
  serviceName: string;
  status: TokenStatus;
  counterNumber?: number;
  staffId?: string;
  staffName?: string;
  centre?: string;
  issuedAt: string;
  calledAt?: string;
  servedAt?: string;
  holdAt?: string;
  holdReason?: string;
  recallCount?: number;
  completedAt?: string;
  notes?: string;
  estimatedWaitMinutes?: number;
  estimatedWaitText?: string;
  estimatedTurnTime?: string;
  positionInQueue?: number;
  peopleAhead?: number;
  nextToken?: string | null;
  activeCountersCount?: number;
  activeCounters?: number[];
  isTurnNear?: boolean;
  isServingNow?: boolean;
  verificationSeal?: string;
  bookingId?: string;
  bookingReference?: string;
  slotString?: string;
  bookedDate?: string;
}

export interface TokenVerificationResult {
  valid: boolean;
  reference: string;
  tokenNumber?: string;
  bookingReference?: string | null;
  serviceName?: string;
  serviceCode?: string | null;
  centre?: string;
  date?: string;
  slotString?: string | null;
  status?: string;
  counterNumber?: number | null;
  issuedAt?: string;
  completedAt?: string | null;
  verificationSource?: string;
  verificationSeal?: string;
  verifiedAt?: string;
  error?: string;
}

export type SlotStatus = 'AVAILABLE' | 'FULL' | 'CLOSED' | 'EXPIRED';

export interface SlotItem {
  serviceId: string;
  serviceName: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // '09:00'
  endTime: string; // '09:30'
  slotString: string; // '09:00 AM – 09:30 AM'
  centre: string;
  capacity: number;
  bookedCount: number;
  availableSeats: number;
  status: SlotStatus;
}

export type BookingStatus = 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface BookingItem {
  _id: string;
  bookingReference: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  centre: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string;
  endTime: string;
  slotString: string;
  slotId?: string;
  status: BookingStatus;
  displayStatus?: string;
  tokenId?: string;
  tokenNumber?: string;
  notes?: string;
  rescheduledFrom?: string;
  cancelledAt?: string;
  cancelReason?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QueueSummary {
  totalFarmers: number;
  totalTokens: number;
  waitingCount: number;
  servingCount: number;
  completedCount: number;
  skippedCount: number;
  currentlyServing: TokenItem[];
  currentEstimatedWaitMinutes: number;
  activeCounters: number;
  dbType: 'mongodb';
}

export interface ProductItem {
  _id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  purchaseRate: number;
  sellingRate: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  minThreshold: number;
  supplier?: string;
  description?: string;
  isActive?: boolean;
}

export interface PriceHistoryItem {
  _id: string;
  productId: string;
  productCode: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  changedAt: string;
}

export interface PaymentBreakdown {
  method: string;
  amount: number;
  count: number;
}

export interface DailyReport {
  reportDate: string;
  tokens: {
    issued: number;
    served: number;
    waiting: number;
  };
  sales: {
    totalRevenue: number;
    invoicesCount: number;
    cashRevenue: number;
    upiRevenue: number;
  };
  lowStockItems: Array<{
    code: string;
    name: string;
    stock: number;
    unit: string;
    minThreshold: number;
  }>;
  topSoldItems: Array<{
    name: string;
    quantity: number;
    amount: number;
  }>;
}

export interface SaleLineItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  rate: number;
  amount: number;
  unit: string;
}

export interface SaleRecord {
  _id: string;
  invoiceNumber: string;
  date: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  tokenNumber?: string;
  items: SaleLineItem[];
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
  amountReceived?: number;
  changeGiven?: number;
  staffId: string;
  staffName: string;
  paymentMethod: string;
  paymentReference?: string;
  paymentStatus?: 'paid' | 'pending';
  notes?: string;
}

export interface PurchaseRecord {
  _id: string;
  invoiceNumber: string;
  supplier: string;
  date: string;
  itemsCount: number;
  items: Array<{
    productName: string;
    quantity: number;
    purchaseRate: number;
    amount: number;
  }>;
  total: number;
  recordedBy: string;
}
