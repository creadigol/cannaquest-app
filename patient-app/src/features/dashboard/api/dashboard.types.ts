/**
 * Confirmed against real responses from:
 *   GET /patient/v1/dashboard/summary
 *   GET /patient/v1/dashboard/care-journey
 *   GET /patient/v1/dashboard/consumption-calendar
 *   POST /patient/v1/dashboard/care-journey/dismiss
 *
 * Two fields are still unconfirmed because the sample responses had empty
 * arrays for them — see the ORDERABLE PRESCRIPTION ITEM SHAPE and RECENT
 * ORDER ITEM SHAPE notes below. Everything else here is exact.
 */

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

/**
 * UNCONFIRMED SHAPE — the sample response had an empty orderablePrescriptions
 * array, so only the key name is confirmed, not the item fields. This is a
 * best guess based on the prescriptions tab's likely shape; correct it once
 * a patient with an orderable script hits this endpoint.
 */
export type OrderablePrescription = {
  id: string;
  name: string;
  strength?: string;
  remainingRepeats?: number;
  unitPrice?: number;
};

/**
 * UNCONFIRMED SHAPE — recentOrders was empty in the sample. Best guess only.
 */
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

export type ConsumptionCalendarEntry = unknown; // unconfirmed — entries was empty in sample

export type ConsumptionCalendar = {
  entries: ConsumptionCalendarEntry[];
};