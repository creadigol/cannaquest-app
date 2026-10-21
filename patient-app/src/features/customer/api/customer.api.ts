import { apiClient } from '@/lib/api/client';
import { ApiRequestError, normalizeApiError } from '@/lib/api/api-error';
import type { ApiResponse } from '@/features/auth/api/auth.types';
import type {
    ComplianceDocument,
    Customer,
    PaymentMethod,
    SaveSignatureDto,
    UpdateAddressDto,
    UpdateProfileDto,
} from './customer.types';

export async function fetchCurrentCustomer(): Promise<Customer | null> {
    try {
        const response = await apiClient.get<ApiResponse<Customer>>('/patient/v1/customers/me');
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
    } catch (error) {
        const apiError = normalizeApiError(error);
        if (__DEV__) {
            console.error('[Customer API] /customers/me', {
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

export async function updateCustomerProfile(data: UpdateProfileDto): Promise<Customer | null> {
    try {
        const response = await apiClient.patch<ApiResponse<Customer>>('/patient/v1/customers/me/profile', data);
        if (!response.data.success) {
            throw new ApiRequestError({
                kind: response.data.statusCode === 401 ? 'invalid_credentials' : 'unknown',
                message: response.data.message ?? 'Failed to update profile.',
                status: response.data.statusCode,
                correlationId: response.data.correlationId,
                responseData: response.data,
            });
        }
        return response.data.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function updateCustomerAddress(data: UpdateAddressDto): Promise<Customer | null> {
    try {
        const response = await apiClient.patch<ApiResponse<Customer>>('/patient/v1/customers/me/address', data);
        if (!response.data.success) {
            throw new ApiRequestError({
                kind: response.data.statusCode === 401 ? 'invalid_credentials' : 'unknown',
                message: response.data.message ?? 'Failed to update address.',
                status: response.data.statusCode,
                correlationId: response.data.correlationId,
                responseData: response.data,
            });
        }
        return response.data.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function saveCustomerSignature(data: SaveSignatureDto): Promise<void> {
    try {
        const response = await apiClient.post<ApiResponse<void>>('/patient/v1/customers/me/signature', data);
        if (!response.data.success) {
            throw new ApiRequestError({
                kind: response.data.statusCode === 401 ? 'invalid_credentials' : 'unknown',
                message: response.data.message ?? 'Failed to save signature.',
                status: response.data.statusCode,
                correlationId: response.data.correlationId,
                responseData: response.data,
            });
        }
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function clearCustomerSignature(): Promise<void> {
    try {
        const response = await apiClient.delete<ApiResponse<void>>('/patient/v1/customers/me/signature');
        if (!response.data.success) {
            throw new ApiRequestError({
                kind: response.data.statusCode === 401 ? 'invalid_credentials' : 'unknown',
                message: response.data.message ?? 'Failed to clear signature.',
                status: response.data.statusCode,
                correlationId: response.data.correlationId,
                responseData: response.data,
            });
        }
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function fetchCustomerDocuments(): Promise<ComplianceDocument[]> {
    try {
        const response = await apiClient.get<ApiResponse<ComplianceDocument[]>>('/patient/v1/documents');
        if (!response.data.success) {
            return [];
        }
        return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
        if (__DEV__) console.warn('[Customer API] /documents failed, falling back to empty list', error);
        return [];
    }
}

export async function fetchCustomerPaymentMethods(): Promise<PaymentMethod[]> {
    try {
        const response = await apiClient.get<ApiResponse<PaymentMethod[]>>('/patient/v1/payment-methods');
        if (!response.data.success) {
            return [];
        }
        return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
        if (__DEV__) console.warn('[Customer API] /payment-methods failed, falling back to empty list', error);
        return [];
    }
}

export async function deleteCustomerPaymentMethod(id: string | number): Promise<void> {
    try {
        const response = await apiClient.delete<ApiResponse<void>>(`/patient/v1/payment-methods/${id}`);
        if (!response.data.success) {
            throw new ApiRequestError({
                kind: response.data.statusCode === 401 ? 'invalid_credentials' : 'unknown',
                message: response.data.message ?? 'Failed to remove card.',
                status: response.data.statusCode,
                correlationId: response.data.correlationId,
                responseData: response.data,
            });
        }
    } catch (error) {
        throw normalizeApiError(error);
    }
}
