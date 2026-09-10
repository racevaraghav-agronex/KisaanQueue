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
  requiresBilling?: boolean;
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
  requiresBilling?: boolean;
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
  dbType: 'mongodb' | 'in-memory';
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

export type ProcurementStatus =
  | 'PENDING'
  | 'ARRIVED'
  | 'WEIGHED'
  | 'QUALITY_CHECKED'
  | 'ACCEPTED'
  | 'PARTIALLY_ACCEPTED'
  | 'REJECTED'
  | 'COMPLETED';

export type ProcurementPaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL';

export type QualityGrade = 'Grade A' | 'Grade B' | 'Grade C' | 'FAQ' | 'Below Standard';

export interface ProcurementRecord {
  _id: string;
  procurementNumber: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  bookingId?: string;
  bookingReference?: string;
  tokenId?: string;
  tokenNumber?: string;
  centre: string;
  produce: {
    cropName: string;
    variety?: string;
    declaredQuantity: number;
    unit: 'Quintal' | 'Kg';
    bagsCount?: number;
    vehicleNumber?: string;
    notes?: string;
  };
  arrival: {
    verified: boolean;
    arrivedAt?: string;
    verifiedByStaffId?: string;
    verifiedByStaffName?: string;
    gateNumber?: string;
  };
  weighment: {
    grossWeight: number;
    tareWeight: number;
    netWeight: number;
    unit: 'Quintal' | 'Kg';
    weighbridgeSlipNumber?: string;
    weighedAt?: string;
    weighedByStaffId?: string;
    weighedByStaffName?: string;
  };
  quality: {
    grade?: QualityGrade;
    moisturePercentage?: number;
    foreignMatterPercentage?: number;
    damagedPercentage?: number;
    remarks?: string;
    inspectedAt?: string;
    inspectedByStaffId?: string;
    inspectedByStaffName?: string;
  };
  decision: {
    decisionStatus: 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED' | 'PENDING';
    acceptedQuantity: number;
    rejectedQuantity: number;
    rejectionReason?: string;
    decisionAt?: string;
    decidedByStaffId?: string;
    decidedByStaffName?: string;
  };
  pricing: {
    ratePerUnit: number;
    totalAmount: number;
    deductions: number;
    netPayable: number;
  };
  payment: {
    status: ProcurementPaymentStatus;
    paidAmount: number;
    paymentMethod?: string;
    paymentReference?: string;
    paidAt?: string;
    recordedBy?: string;
    notes?: string;
  };
  status: ProcurementStatus;
  statusHistory: Array<{
    status: ProcurementStatus;
    timestamp: string;
    changedBy: string;
    notes?: string;
  }>;
  receiptReference?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProcurementStats {
  totalLots: number;
  pendingArrival: number;
  inInspection: number;
  completedLots: number;
  totalNetWeightQuintals: number;
  totalAcceptedQuintals: number;
  totalRejectedQuintals: number;
  totalValuation: number;
  totalPaidAmount: number;
  pendingPaymentAmount: number;
  statusDistribution: Array<{ status: string; count: number }>;
  cropDistribution: Array<{ cropName: string; quantity: number; amount: number }>;
}

export type NotificationType =
  | 'TOKEN_BOOKED'
  | 'TOKEN_APPROACHING'
  | 'TOKEN_CALLED'
  | 'TOKEN_COMPLETED'
  | 'TOKEN_CANCELLED'
  | 'SLOT_CONFIRMED'
  | 'SLOT_CANCELLED'
  | 'SLOT_RESCHEDULED'
  | 'PROCUREMENT_STATUS_CHANGED'
  | 'PROCUREMENT_COMPLETED'
  | 'PAYMENT_STATUS_CHANGED'
  | 'SYSTEM_ALERT';

export interface NotificationItem {
  _id: string;
  userId: string;
  userPhone?: string;
  type: NotificationType;
  title: string;
  message: string;
  language?: string;
  referenceId?: string;
  referenceType?: 'TOKEN' | 'SLOT' | 'BOOKING' | 'PROCUREMENT' | 'PAYMENT' | 'GENERAL';
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  channelsDispatched?: {
    inApp?: boolean;
    sms?: { sent: boolean; sentAt?: string; providerRef?: string };
    whatsapp?: { sent: boolean; sentAt?: string; providerRef?: string };
  };
  createdAt: string;
  updatedAt?: string;
}


