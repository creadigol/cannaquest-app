export type CareJourneyStep = {
  key: string;
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  completed: boolean;
  icon: string;
  ctaLabel: string;
  ctaRoute: string;
};

export type CareJourney = {
  steps: CareJourneyStep[];
  currentStep: CareJourneyStep | null;
  allComplete: boolean;
  visible: boolean;
  dismissible: boolean;
};

export type OrderablePrescription = {
  id: string;
  prescriptionId?: string;
  productId?: string;
  name: string;
  form?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  packageSize?: string | null;
  remainingRepeats?: number;
  repeatTimes?: number;
  repeatsFilled?: number;
  unitPrice?: number | null;
  thcContent?: number | string | null;
  cbdContent?: number | string | null;
  canOrder?: boolean;
  imageUrl?: string | null;
};

export type RecentOrder = {
  id: string | number;
  uuid?: string;
  status: string;
  shippingSummary?: string;
};

export type NextConsultation = {
  prescriberName: string;
  formattedDate: string;
  timeUntil: string;
  bookDate: string;
  startTime: string;
  canJoin: boolean;
};

export type OrderProgressStep = {
  name: string;
  status: 'completed' | 'current' | 'upcoming';
};

export type ActiveOrder = {
  id: string | number;
  uuid: string;
  shippingSummary?: string | null;
  progressSteps: OrderProgressStep[];
  status?: string | null;
  statusConfig?: {
    label: string;
    color: string;
    class?: string;
    icon?: string;
  };
  itemsCount?: number;
  totalAmount?: number;
};

export type DashboardSummary = {
  questionnaireCompleted: boolean;
  profileCompleted: boolean;
  nextConsultation: NextConsultation | null;
  activePrescriptionsCount: number;
  orderablePrescriptions: OrderablePrescription[];
  recentOrders: RecentOrder[];
  activeOrdersCount: number;
  activeOrder?: ActiveOrder | null;
  activeOrders?: ActiveOrder[];
};

export type ConsumptionCalendarEntry = {
  prescriptionId: number | string;
  productId: number | string | null;
  productName: string;
  productForm?: string | null;
  nextAvailableDate?: string | null;
  daysUntilAvailable?: number | null;
  repeatsRemaining: number;
  availableNow: boolean;
  blockedBy?: 'expired' | 'repeats_used' | 'awaiting_token' | 'interval' | 'awaiting_approval' | null;
};

export type ConsumptionCalendar = {
  entries: ConsumptionCalendarEntry[];
};
