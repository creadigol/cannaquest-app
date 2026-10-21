import { apiClient } from '@/lib/api/client';
import { ApiRequestError, normalizeApiError } from '@/lib/api/api-error';
import type { ApiResponse } from '@/features/auth/api/auth.types';
import type {
    ClinicSummary,
    Consultation,
    CreateBookingDto,
    RescheduleBookingDto,
} from './consultations.types';

function extractData<T>(response: ApiResponse<T>): T {
    if (!response.success && response.statusCode && response.statusCode >= 400) {
        throw new ApiRequestError({
            kind: response.statusCode === 401 ? 'invalid_credentials' : 'unknown',
            message: response.message ?? 'Request failed',
            status: response.statusCode,
            correlationId: response.correlationId,
            responseData: response,
        });
    }
    return response.data as T;
}

/**
 * Fetch patient's consultations filtered by tab ('upcoming' | 'past')
 */
export async function fetchConsultations(tab: 'upcoming' | 'past' = 'upcoming'): Promise<Consultation[]> {
    try {
        const response = await apiClient.get<ApiResponse<Consultation[]> | Consultation[]>(
            `/patient/v1/booking?tab=${tab}`
        );

        let list: any[] = [];
        if (Array.isArray(response.data)) {
            list = response.data;
        } else if (response.data && typeof response.data === 'object') {
            const raw = response.data as any;
            if (Array.isArray(raw.data?.consultations)) {
                list = raw.data.consultations;
            } else if (Array.isArray(raw.consultations)) {
                list = raw.consultations;
            } else if (Array.isArray(raw.data)) {
                list = raw.data;
            }
        }

        return list.map((item: any) => ({
            ...item,
            id: item.id,
            book_date: item.book_date || item.bookDate,
            start_time: item.start_time || item.startTime,
            end_time: item.end_time || item.endTime,
            status: item.status || 'SUBMITTED',
            status_label: item.status_label || item.status,
            consultation_type: item.consultation_type || item.consultationType,
            prescriber: item.prescriber || {
                name: item.prescriberName || item.prescriber?.name,
                specialisation: item.prescriberSpecialisation || item.prescriber?.specialisation,
            },
            clinic_id: item.clinic_id || item.clinicId,
            clinic_name: item.clinic_name || item.clinicName,
            can_cancel: typeof item.can_cancel === 'boolean' ? item.can_cancel : item.canCancel ?? true,
            can_reschedule: typeof item.can_reschedule === 'boolean' ? item.can_reschedule : item.canReschedule ?? true,
            can_pay: typeof item.can_pay === 'boolean' ? item.can_pay : item.awaitingPayment ?? false,
            meeting_url: item.meeting_url || item.meetingUrl,
            is_upcoming: item.isPast === false ? true : item.is_upcoming ?? true,
        }));
    } catch (error) {
        const apiError = normalizeApiError(error);
        if (__DEV__) {
            console.error('[Consultations API] fetchConsultations error:', apiError);
        }
        throw apiError;
    }
}

/**
 * Fetch patient's next consultation
 */
export async function fetchNextConsultation(): Promise<Consultation | null> {
    try {
        const response = await apiClient.get<ApiResponse<Consultation | null>>('/patient/v1/booking/next');
        if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            return response.data.data;
        }
        return (response.data as unknown as Consultation) ?? null;
    } catch (error) {
        const apiError = normalizeApiError(error);
        if (__DEV__) {
            console.warn('[Consultations API] fetchNextConsultation error:', apiError);
        }
        return null;
    }
}

/**
 * Fetch clinics available for booking
 */
export async function fetchClinics(): Promise<ClinicSummary[]> {
    try {
        const response = await apiClient.get<ApiResponse<ClinicSummary[]> | ClinicSummary[]>(
            '/patient/v1/booking/clinics'
        );
        if (Array.isArray(response.data)) {
            return response.data;
        }
        if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            const list = response.data.data;
            return Array.isArray(list) ? list : [];
        }
        return [];
    } catch (error) {
        throw normalizeApiError(error);
    }
}

/**
 * Sync or register the authenticated patient in Halaxy before booking
 */
export async function syncHalaxyPatient(clinicId?: string | number): Promise<{ halaxyPatientId: string; created: boolean }> {
    try {
        const response = await apiClient.post<ApiResponse<{ halaxyPatientId: string; created: boolean }>>(
            '/patient/v1/booking/halaxy/patient',
            clinicId ? { clinicId: String(clinicId) } : {}
        );
        return extractData(response.data);
    } catch (error) {
        throw normalizeApiError(error);
    }
}

/**
 * Fetch available booking dates for a clinic
 */
export async function fetchAvailableDates(
    clinicId: string | number,
    fromDate?: string,
    days?: number | string
): Promise<string[]> {
    try {
        const advanceDays =
            days ??
            process.env.EXPO_PUBLIC_ADVANCE_BOOKING_DAYS ??
            process.env.ADVANCE_BOOKING_DAYS ??
            30;

        const params: Record<string, string> = {};
        if (fromDate) params.from = fromDate;
        if (advanceDays) params.days = String(advanceDays);

        const queryString = new URLSearchParams(params).toString();
        const url = `/patient/v1/booking/clinics/${clinicId}/available-dates${queryString ? `?${queryString}` : ''}`;

        const response = await apiClient.get<any>(url);

        const resData = response.data;

        // If returned as { success: true, data: { dates: [...] } }
        if (resData?.data?.dates && Array.isArray(resData.data.dates)) {
            return resData.data.dates;
        }

        // If returned as { success: true, data: [...] }
        if (Array.isArray(resData?.data)) {
            return resData.data;
        }

        // If raw array [...]
        if (Array.isArray(resData?.dates)) {
            return resData.dates;
        }
        if (Array.isArray(resData)) {
            return resData;
        }

        return [];
    } catch (error) {
        throw normalizeApiError(error);
    }
}

/**
 * Fetch slots grouped by prescriber for a specific clinic and date
 */
export async function fetchPrescriberSlots(
    clinicId: string | number,
    date: string
): Promise<any[]> {
    try {
        const response = await apiClient.get<any>(
            `/patient/v1/booking/clinics/${clinicId}/prescribers?date=${date}`
        );

        const resData = response.data;

        // If returned as { success: true, data: { prescribers: [...] } }
        let prescribersList: any[] = [];
        if (Array.isArray(resData?.data?.prescribers)) {
            prescribersList = resData.data.prescribers;
        } else if (Array.isArray(resData?.prescribers)) {
            prescribersList = resData.prescribers;
        } else if (Array.isArray(resData?.data)) {
            prescribersList = resData.data;
        } else if (Array.isArray(resData)) {
            prescribersList = resData;
        }

        // Normalize each prescriber entry so slots (object or array) are easy to iterate
        return prescribersList.map((entry) => {
            const rawSlots = entry.slots;
            let normalizedSlots: { time: string; label: string; booked: boolean; disabled?: boolean }[] = [];

            if (rawSlots && typeof rawSlots === 'object' && !Array.isArray(rawSlots)) {
                // Key-value pairs: { "19:00": { label: "7:00 PM", booked: false }, ... }
                normalizedSlots = Object.entries(rawSlots)
                    .filter(([, slotObj]: [string, any]) => !slotObj?.booked)
                    .map(([timeKey, slotObj]: [string, any]) => ({
                        time: timeKey,
                        label: slotObj?.label || timeKey,
                        booked: false,
                        disabled: !!slotObj?.disabled,
                    }));
            } else if (Array.isArray(rawSlots)) {
                normalizedSlots = rawSlots
                    .filter((s: any) => !s?.booked)
                    .map((s: any) => ({
                        time: typeof s === 'string' ? s : s.time || s.startTime,
                        label: s.label || s.time || s.startTime,
                        booked: false,
                        disabled: !!s.disabled,
                    }));
            }

            return {
                ...entry,
                prescriber: entry.prescriber || {
                    id: entry.id,
                    name: entry.name,
                    identity: entry.identity,
                    specialisation: entry.specialisation,
                },
                slots: normalizedSlots,
            };
        });
    } catch (error) {
        throw normalizeApiError(error);
    }
}

/**
 * Fetch consultation fee details for a clinic (determines if repeat/follow-up payment is required)
 */
export async function fetchClinicFee(clinicId: string | number): Promise<{
    fee: number;
    feeFormatted: string;
    isFollowUp: boolean;
    requiresPayment: boolean;
}> {
    try {
        const response = await apiClient.get<ApiResponse<any> | any>(
            `/patient/v1/booking/clinics/${clinicId}/fee`
        );
        const raw = response.data?.data ?? response.data;
        const fee = typeof raw?.fee === 'number' ? raw.fee : parseFloat(raw?.fee || '0') || 0;
        return {
            fee,
            feeFormatted: raw?.feeFormatted || `$${fee.toFixed(2)}`,
            isFollowUp: !!raw?.isFollowUp,
            requiresPayment: fee > 0,
        };
    } catch (error) {
        return {
            fee: 0,
            feeFormatted: '$0.00',
            isFollowUp: false,
            requiresPayment: false,
        };
    }
}

/**
 * Fetch timeslots for a specific clinic and date
 */
export async function fetchClinicSlots(clinicId: string | number, date: string): Promise<string[]> {
    try {
        const response = await apiClient.get<ApiResponse<string[] | { time: string }[]> | any>(
            `/patient/v1/booking/clinics/${clinicId}/slots?date=${date}`
        );
        const raw = response.data?.data ?? response.data;
        if (Array.isArray(raw)) {
            return raw.map((item) => (typeof item === 'string' ? item : item.time || ''));
        }
        return [];
    } catch (error) {
        throw normalizeApiError(error);
    }
}

/**
 * Create a new consultation booking
 */
export async function createBooking(dto: CreateBookingDto): Promise<Consultation> {
    try {
        const payload: Record<string, any> = {
            clinicId: String(dto.clinicId),
            date: dto.date,
            startTime: dto.startTime,
        };
        if (dto.prescriberId) {
            payload.prescriberId = String(dto.prescriberId);
        }
        if (dto.consent) {
            payload.consent = dto.consent;
        }
        if (dto.contactPhone) {
            payload.contactPhone = dto.contactPhone;
        }

        const response = await apiClient.post<ApiResponse<Consultation>>('/patient/v1/booking', payload);
        return extractData(response.data);
    } catch (error) {
        throw normalizeApiError(error);
    }
}

/**
 * Cancel an existing consultation
 */
export async function cancelConsultation(id: string | number): Promise<{ success: boolean; message?: string }> {
    try {
        const response = await apiClient.post<ApiResponse<any>>(`/patient/v1/booking/${id}/cancel`);
        return {
            success: true,
            message: response.data?.message ?? 'Consultation cancelled successfully.',
        };
    } catch (error) {
        throw normalizeApiError(error);
    }
}

/**
 * Reschedule an existing consultation
 */
export async function rescheduleConsultation(
    id: string | number,
    dto: RescheduleBookingDto
): Promise<Consultation> {
    try {
        const response = await apiClient.post<ApiResponse<Consultation>>(`/patient/v1/booking/${id}/reschedule`, {
            date: dto.date,
            startTime: dto.startTime,
            ...(dto.prescriberId ? { prescriberId: String(dto.prescriberId) } : {}),
        });
        return extractData(response.data);
    } catch (error) {
        throw normalizeApiError(error);
    }
}

/**
 * Fetch meeting URL for consultation
 */
export async function fetchMeetingUrl(id: string | number): Promise<string | null> {
    try {
        const response = await apiClient.get<ApiResponse<{ meetingUrl?: string; url?: string }>>(
            `/patient/v1/booking/${id}/meeting-url`
        );
        const data: any = response.data?.data ?? response.data;
        return data?.meetingUrl || data?.url || null;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

/**
 * Start checkout/payment for a consultation booking
 */
export async function startBookingCheckout(bookingId: string | number): Promise<any> {
    try {
        const response = await apiClient.post<ApiResponse<any>>(
            `/patient/v1/orders/booking/${bookingId}/checkout`
        );
        const data: any = response.data?.data ?? response.data;
        return data;
    } catch (error) {
        throw normalizeApiError(error);
    }
}
