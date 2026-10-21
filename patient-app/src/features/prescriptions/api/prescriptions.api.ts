import { apiClient } from '@/lib/api/client';
import { normalizeApiError } from '@/lib/api/api-error';
import type { ApiResponse } from '@/features/auth/api/auth.types';
import type {
  PrescriberOption,
  Prescription,
  PrescriptionsListResponse,
} from './prescriptions.types';

function extractData<T>(payload: ApiResponse<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiResponse<T>).data as T;
  }
  return payload as T;
}

/**
 * Fetch prescriptions list for either 'current' or 'past' tab
 */
export async function fetchPrescriptions(
  tab: 'current' | 'past' = 'current',
  search?: string
): Promise<PrescriptionsListResponse> {
  try {
    const params: Record<string, string> = { tab };
    if (search?.trim()) {
      params.search = search.trim();
    }
    console.log('[Prescriptions API] Fetching prescriptions...', params);
    const response = await apiClient.get<ApiResponse<PrescriptionsListResponse>>(
      '/patient/v1/prescriptions',
      { params }
    );
    const data = extractData(response.data);
    console.log('[Prescriptions API] fetchPrescriptions success:', {
      count: data?.prescriptions?.length ?? 0,
      counts: data?.counts,
    });
    return {
      prescriptions: data?.prescriptions || [],
      counts: data?.counts || { current: 0, past: 0 },
    };
  } catch (error) {
    const err = normalizeApiError(error);
    console.error('[Prescriptions API] fetchPrescriptions failed:', {
      message: err.message,
      status: err.status,
      correlationId: err.correlationId,
    });
    throw err;
  }
}

/**
 * Get detailed fill history and info for a specific prescription
 */
export async function fetchPrescriptionDetail(
  prescriptionId: string | number
): Promise<Prescription> {
  try {
    console.log('[Prescriptions API] Fetching prescription detail for ID:', prescriptionId);
    const response = await apiClient.get<ApiResponse<Prescription>>(
      `/patient/v1/prescriptions/${prescriptionId}`
    );
    const data = extractData(response.data);
    console.log('[Prescriptions API] fetchPrescriptionDetail success:', {
      id: data?.id,
      productName: data?.productName,
      status: data?.status,
    });
    return data;
  } catch (error) {
    const err = normalizeApiError(error);
    console.error('[Prescriptions API] fetchPrescriptionDetail failed:', {
      prescriptionId,
      message: err.message,
      status: err.status,
    });
    throw err;
  }
}

/**
 * Fetch prescribers the patient has previously consulted with
 */
export async function fetchMyPrescribers(): Promise<PrescriberOption[]> {
  try {
    console.log('[Prescriptions API] Fetching my prescribers list...');
    const response = await apiClient.get<ApiResponse<PrescriberOption[]>>(
      '/patient/v1/prescriptions/my-prescribers'
    );
    const data = extractData(response.data);
    const list = Array.isArray(data) ? data : [];
    console.log('[Prescriptions API] fetchMyPrescribers success:', { count: list.length });
    return list;
  } catch (error) {
    const err = normalizeApiError(error);
    console.error('[Prescriptions API] fetchMyPrescribers failed:', err.message);
    throw err;
  }
}

/**
 * Select a nominated prescriber for an approved external prescription
 */
export async function selectPrescriptionPrescriber(
  prescriptionId: string | number,
  prescriberId: string | number
): Promise<{ message: string; id: string; status: string }> {
  try {
    console.log('[Prescriptions API] Nominating prescriber:', { prescriptionId, prescriberId });
    const response = await apiClient.post<
      ApiResponse<{ message: string; id: string; status: string }>
    >(`/patient/v1/prescriptions/${prescriptionId}/select-prescriber`, {
      prescriberId: String(prescriberId),
    });
    const result = extractData(response.data);
    console.log('[Prescriptions API] selectPrescriptionPrescriber success:', result);
    return result;
  } catch (error) {
    const err = normalizeApiError(error);
    console.error('[Prescriptions API] selectPrescriptionPrescriber failed:', err.message);
    throw err;
  }
}

/**
 * Upload a customer prescription file
 */
export async function uploadPrescription(
  formData: FormData
): Promise<{ id: string; status: string; message: string }> {
  try {
    console.log('[Prescriptions API] Uploading prescription file to S3 via backend...');
    const response = await apiClient.post<
      ApiResponse<{ id: string; status: string; message: string }>
    >('/patient/v1/prescriptions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const result = extractData(response.data);
    console.log('[Prescriptions API] Prescription uploaded to S3 successfully:', result);
    return result;
  } catch (error) {
    const err = normalizeApiError(error);
    console.error('[Prescriptions API] uploadPrescription failed:', {
      message: err.message,
      status: err.status,
      correlationId: err.correlationId,
    });
    throw err;
  }
}
