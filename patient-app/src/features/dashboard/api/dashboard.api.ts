import { apiClient } from '@/lib/api/client';
import { ApiRequestError, normalizeApiError } from '@/lib/api/api-error';
import type { ApiResponse } from '@/features/auth/api/auth.types';
import type { CareJourney, ConsumptionCalendar, DashboardSummary, OrderablePrescription } from './dashboard.types';

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
import { fetchPrescriptions } from '@/features/prescriptions/api/prescriptions.api';

export async function fetchDashboardSummary(): Promise<DashboardSummary | null> {
  const [summaryRes, activeOrdersList, currentRxRes] = await Promise.allSettled([
    get<any>('/patient/v1/dashboard/summary').catch(() => null),
    getOrders('active').catch(() => []),
    fetchPrescriptions('current').catch(() => null),
  ]);

  const rawSummary = summaryRes.status === 'fulfilled' && summaryRes.value ? payloadOf(summaryRes.value) : null;
  const activeOrders = activeOrdersList.status === 'fulfilled' ? activeOrdersList.value : [];
  const currentRxList = currentRxRes.status === 'fulfilled' && currentRxRes.value?.prescriptions ? currentRxRes.value.prescriptions : [];

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

  // Process and normalize orderable prescriptions with comprehensive medication data
  const rawOrderable = rawSummary?.orderable_prescriptions || rawSummary?.orderablePrescriptions || [];
  let orderablePrescriptions: OrderablePrescription[] = [];

  if (Array.isArray(rawOrderable) && rawOrderable.length > 0) {
    orderablePrescriptions = rawOrderable.map((p: any) => {
      const matched = currentRxList.find(
        (rx) => String(rx.id) === String(p.id) || String(rx.productId) === String(p.id || p.productId)
      );
      return {
        id: String(p.id ?? matched?.id),
        prescriptionId: String(p.prescription_id ?? p.prescriptionId ?? matched?.id ?? p.id),
        productId: String(p.product_id ?? p.productId ?? matched?.productId ?? p.id),
        name: p.name || p.product_name || p.productName || matched?.productName || 'Prescribed Product',
        form: p.form || p.product_form || p.productForm || matched?.productForm || null,
        brand: p.brand || p.manufacturer || matched?.manufacturer || null,
        manufacturer: p.manufacturer || p.brand || matched?.manufacturer || null,
        strength: p.strength || matched?.strength || null,
        packageSize: p.package_size || p.packageSize || matched?.packageSize || null,
        remainingRepeats: p.remaining_repeats ?? p.remainingRepeats ?? matched?.remainingRepeats,
        repeatTimes: p.repeat_times ?? p.repeatTimes ?? matched?.repeatTimes,
        repeatsFilled: p.repeats_filled ?? p.repeatsFilled ?? matched?.repeatsFilled,
        unitPrice: Number(p.unit_price ?? p.unitPrice ?? p.price ?? matched?.unitPrice ?? 0),
        thcContent: p.thc_content ?? p.thcContent,
        cbdContent: p.cbd_content ?? p.cbdContent,
        canOrder: p.can_order ?? p.canOrder ?? matched?.canOrder ?? true,
        imageUrl: p.image_url ?? p.imageUrl ?? matched?.imageUrl ?? null,
      };
    });
  } else if (currentRxList.length > 0) {
    // If backend dashboard summary didn't return orderable_prescriptions, populate from current eligible prescriptions
    orderablePrescriptions = currentRxList
      .filter((rx) => rx.canOrder || rx.status === 'APPROVED' || rx.status === 'ASSIGNED')
      .slice(0, 3)
      .map((rx) => ({
        id: String(rx.id),
        prescriptionId: String(rx.id),
        productId: String(rx.productId || rx.id),
        name: rx.productName || 'Prescribed Product',
        form: rx.productForm,
        brand: rx.manufacturer,
        manufacturer: rx.manufacturer,
        strength: rx.strength,
        packageSize: rx.packageSize,
        remainingRepeats: rx.remainingRepeats,
        repeatTimes: rx.repeatTimes,
        repeatsFilled: rx.repeatsFilled,
        unitPrice: rx.unitPrice,
        canOrder: rx.canOrder,
        imageUrl: rx.imageUrl,
      }));
  }

  return {
    questionnaireCompleted: Boolean(rawSummary?.questionnaire_completed ?? rawSummary?.questionnaireCompleted),
    profileCompleted: Boolean(rawSummary?.profile_completed ?? rawSummary?.profileCompleted),
    nextConsultation,
    activePrescriptionsCount: Number(rawSummary?.active_prescriptions_count ?? rawSummary?.activePrescriptionsCount ?? currentRxList.length),
    orderablePrescriptions,
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