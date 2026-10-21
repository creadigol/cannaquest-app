export type ConsultationStatus = 'PENDING' | 'SUBMITTED' | 'CANCELED' | 'COMPLETED' | 'CONFIRMED';

export type PrescriberInfo = {
    id?: number | string;
    name?: string;
    type?: string;
    specialisation?: string;
    avatarUrl?: string;
};

export type PrescriberSlotEntry = {
    prescriber: {
        id: number | string;
        name: string;
        identity?: string;
        specialisation?: string;
        avatarUrl?: string;
    };
    slots: {
        time: string;
        booked?: boolean;
        disabled?: boolean;
        label?: string;
    }[];
};

export type ClinicFeeInfo = {
    fee: number;
    feeFormatted: string;
    isFollowUp: boolean;
    requiresPayment: boolean;
};

export type Consultation = {
    id: number | string;
    book_date: string;
    start_time: string;
    end_time?: string;
    status: ConsultationStatus;
    status_label?: string;
    status_color?: string;
    prescriber?: PrescriberInfo | null;
    consultation_type?: string;
    can_cancel?: boolean;
    can_reschedule?: boolean;
    can_join_meeting?: boolean;
    can_join?: boolean;
    meeting_url?: string | null;
    can_pay?: boolean;
    requiresPayment?: boolean;
    payment_time_left?: number | null;
    time_until?: string | null;
    is_upcoming?: boolean;
    is_today?: boolean;
    clinic_id?: number | string;
    clinic_name?: string;
    created_at?: string;
};

export type ClinicSummary = {
    id: string | number;
    name: string;
    contact?: string;
    phone?: string;
    email?: string;
    address?: string;
    fee?: number;
    feeFormatted?: string;
    logoUrl?: string | null;
    consultationDuration?: number;
};

export type AvailableSlot = {
    time: string;
    available: boolean;
    prescriberId?: string | number;
    prescriberName?: string;
};

export type BookingConsent = {
    acceptedAge18: boolean;
    acceptedPregnancyDeclaration: boolean;
    acceptedMentalHealthDeclaration: boolean;
    acceptedPolicies: boolean;
};

export type CreateBookingDto = {
    clinicId: string | number;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    prescriberId?: string | number;
    contactPhone?: string;
    consent?: BookingConsent;
};

export type RescheduleBookingDto = {
    date: string;
    startTime: string;
    prescriberId?: string | number;
};

