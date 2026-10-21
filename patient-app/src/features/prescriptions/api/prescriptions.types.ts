export type PrescriptionGroup = 'ready' | 'refill_soon' | 'pending' | 'attention';

export type Prescription = {
  id: string;
  status: string;
  adminStatus?: string;
  adminNote?: string | null;
  prescriberId?: string | null;
  prescriberName?: string | null;
  requiresPrescriberSelection?: boolean;
  statusLabel: string;
  statusColor: string;
  productId: string | null;
  productName: string | null;
  productForm: string | null;
  manufacturer: string | null;
  strength: string | null;
  packageSize: string | null;
  quantity: number;
  duration?: string | null;
  expiryDate: string | null;
  repeatTimes: number;
  repeatsFilled: number;
  remainingRepeats: number;
  hasToken: boolean;
  erxToken: string | null;
  isExpired: boolean;
  isCurrent: boolean;
  allRepeatsUsed: boolean;
  isIntervalRestricted: boolean;
  nextAvailableDate: string | null;
  daysUntilAvailable: number;
  intervalDays: number | null;
  canOrder: boolean;
  ctaLabel: string;
  ctaDisabled: boolean;
  group: PrescriptionGroup;
  note?: string | null;
  createdAt: string | null;
  imageUrl?: string | null;
  unitPrice?: number | null;
  latestActiveOrderUuid?: string | null;
};

export type PrescriptionsListResponse = {
  prescriptions: Prescription[];
  counts: {
    current: number;
    past: number;
  };
};

export type PrescriberOption = {
  id: string;
  name: string;
  specialisation?: string | null;
};
