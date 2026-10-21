import { apiClient } from '@/lib/api/client';
import { ApiRequestError, normalizeApiError } from '@/lib/api/api-error';
import type { ApiResponse } from '@/features/auth/api/auth.types';
import type { CareJourney, ConsumptionCalendar, DashboardSummary } from './dashboard.types';

function payloadOf<T>(response: ApiResponse<T>) {
  if (!response.success) {
    throw new ApiRequestError({
      kind: response.statusCode === 401 ? 'invalid_credentials' : 'unknown',
      message: response.message ?? 'The request was not successful.',
      status: response.statusCode,
      correlationId: response.correlationId,
      responseData: response,
    });
  }
  return response.data;
}

async function get<TResponse>(url: string) {
  try {
    const response = await apiClient.get<ApiResponse<TResponse>>(url);
    if (!response.data.success) {
      throw new ApiRequestError({
        kind: response.data.statusCode === 401 ? 'invalid_credentials' : 'unknown',
        message: response.data.message ?? 'The request was not successful.',
        status: response.data.statusCode,
        correlationId: response.data.correlationId,
        responseData: response.data,
      });
    }
    return response.data;
  } catch (error) {
    const apiError = normalizeApiError(error);
    if (__DEV__) {
      console.error(`[Dashboard API] ${url}`, {
        kind: apiError.kind,
        status: apiError.status,
        message: apiError.message,
        responseData: apiError.responseData,
        correlationId: apiError.correlationId,
      });
    }
    throw apiError;
  }
}

import { getOrders } from '@/features/orders/api/orders.api';

export async function fetchDashboardSummary(): Promise<DashboardSummary | null> {
  const [summaryRes, activeOrdersList] = await Promise.allSettled([
    get<any>('/patient/v1/dashboard/summary').catch(() => null),
    getOrders('active').catch(() => []),
  ]);

  const rawSummary = summaryRes.status === 'fulfilled' && summaryRes.value ? payloadOf(summaryRes.value) : null;
  const activeOrders = activeOrdersList.status === 'fulfilled' ? activeOrdersList.value : [];

  const rawActiveOrder = activeOrders.length > 0 ? activeOrders[0] : null;

  const nextConsultRaw = rawSummary?.next_consultation || rawSummary?.nextConsultation;
  const nextConsultation = nextConsultRaw
    ? {
        prescriberName: nextConsultRaw.prescriber_name || nextConsultRaw.prescriberName || 'Your Prescriber',
        formattedDate: nextConsultRaw.formatted_date || nextConsultRaw.formattedDate || '',
        timeUntil: nextConsultRaw.time_until || nextConsultRaw.timeUntil || '',
        bookDate: nextConsultRaw.book_date || nextConsultRaw.bookDate || '',
        startTime: nextConsultRaw.start_time || nextConsultRaw.startTime || '',
        canJoin: Boolean(nextConsultRaw.can_join ?? nextConsultRaw.canJoin),
      }
    : null;

  const mappedActiveOrder = rawActiveOrder
    ? {
        id: rawActiveOrder.id,
        uuid: rawActiveOrder.uuid,
        shippingSummary: rawActiveOrder.shipping_summary,
        status: rawActiveOrder.status,
        statusConfig: rawActiveOrder.status_config,
        itemsCount: rawActiveOrder.items?.length || 0,
        totalAmount: rawActiveOrder.total_amount,
        progressSteps: (rawActiveOrder.progress_steps || []).map((step) => ({
          name: step.name,
          status: step.status as 'completed' | 'current' | 'upcoming',
        })),
      }
    : null;

  return {
    questionnaireCompleted: Boolean(rawSummary?.questionnaire_completed ?? rawSummary?.questionnaireCompleted),
    profileCompleted: Boolean(rawSummary?.profile_completed ?? rawSummary?.profileCompleted),
    nextConsultation,
    activePrescriptionsCount: Number(rawSummary?.active_prescriptions_count ?? rawSummary?.activePrescriptionsCount ?? 0),
    orderablePrescriptions: rawSummary?.orderable_prescriptions || rawSummary?.orderablePrescriptions || [],
    recentOrders: (rawSummary?.recent_orders || rawSummary?.recentOrders || []).map((o: any) => ({
      id: o.id,
      uuid: o.uuid,
      status: o.status,
      shippingSummary: o.shipping_summary || o.shippingSummary,
    })),
    activeOrdersCount: activeOrders.length,
    activeOrder: mappedActiveOrder,
    activeOrders: mappedActiveOrder ? [mappedActiveOrder] : [],
  };
}

export async function fetchCareJourney(): Promise<CareJourney | null> {
  const response = await get<CareJourney>('/patient/v1/dashboard/care-journey');
  return payloadOf(response);
}

export async function fetchConsumptionCalendar(): Promise<ConsumptionCalendar | null> {
  const response = await get<ConsumptionCalendar>('/patient/v1/dashboard/consumption-calendar');
  return payloadOf(response);
}

export async function dismissCareJourney(): Promise<{ dismissed: boolean } | null> {
  const response = await apiClient.post<ApiResponse<{ dismissed: boolean }>>('/patient/v1/dashboard/care-journey/dismiss');
  if (!response.data.success) {
    throw new ApiRequestError({
      kind: response.data.statusCode === 401 ? 'invalid_credentials' : 'unknown',
      message: response.data.message ?? 'The request was not successful.',
      status: response.data.statusCode,
      correlationId: response.data.correlationId,
      responseData: response.data,
    });
  }
  return response.data.data;
}