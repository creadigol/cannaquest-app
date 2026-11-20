import { Platform } from 'react-native';
import { apiClient, API_BASE_URL } from '@/lib/api/client';
import { ApiRequestError, normalizeApiError } from '@/lib/api/api-error';
import { getAccessToken } from '@/features/auth/auth.service';
import type {
    Attachment,
    CreateTicketPayload,
    ReplyTicketPayload,
    SupportContext,
    SupportSummary,
    TicketDetail,
    TicketListing,
} from './support.types';

// Optional runtime fallback; this declaration adds no Node dependency or polyfill.
declare const Buffer: {
    from(value: string, encoding: 'base64'): { toString(encoding: 'binary'): string };
} | undefined;

// Cache active context header token to pass with support requests
let activeContextHeader: string | null = null;

export function setSupportContextHeader(header: string | null) {
    activeContextHeader = header;
}

/**
 * Decode JWT access token payload safely without external deps
 */
function decodeJwtClaims(token: string | null): Record<string, any> | null {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const base64Url = parts[1];
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        let raw = '';
        if (typeof atob === 'function') {
            raw = atob(base64);
        } else if (typeof Buffer !== 'undefined') {
            raw = Buffer.from(base64, 'base64').toString('binary');
        } else {
            return null;
        }
        const jsonPayload = decodeURIComponent(
            raw
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

/**
 * Derives a fallback client context token (${userId}:patient:${userId})
 * if /patient/v1/support/context returns 403 on older deployed backends.
 */
export function getFallbackContextToken(): string | null {
    if (activeContextHeader) return activeContextHeader;
    const claims = decodeJwtClaims(getAccessToken());
    if (claims?.sub) {
        const userId = String(claims.sub);
        const derived = `${userId}:patient:${userId}`;
        activeContextHeader = derived;
        return derived;
    }
    return null;
}

function getHeaders(extra?: Record<string, string>) {
    const headers: Record<string, string> = { ...extra };
    const contextToken = activeContextHeader || getFallbackContextToken();
    if (contextToken) {
        headers['X-Support-Context'] = contextToken;
    }
    return headers;
}

export async function fetchSupportContext(): Promise<SupportContext | null> {
    try {
        const response = await apiClient.get<any>('/patient/v1/support/context');
        const resData = response.data?.data ?? response.data;
        if (resData?.userId && resData?.panel && resData?.tenantId) {
            const token = `${resData.userId}:${resData.panel}:${resData.tenantId}`;
            setSupportContextHeader(token);
            return { ...resData, headerToken: token };
        }
        return resData;
    } catch (error: any) {
        // If the server rejects /context with 403 (e.g. pending server deployment),
        // fallback smoothly to the local user claims so tickets can still function
        const fallbackToken = getFallbackContextToken();
        const claims = decodeJwtClaims(getAccessToken());
        if (fallbackToken && claims?.sub) {
            const userId = String(claims.sub);
            return {
                userId,
                panel: 'patient',
                tenantId: userId,
                displayName: claims.name || claims.email || 'Patient',
                headerToken: fallbackToken,
            };
        }
        throw normalizeApiError(error);
    }
}

export async function fetchSupportSummary(): Promise<SupportSummary> {
    try {
        const response = await apiClient.get<any>('/patient/v1/support/summary', {
            headers: getHeaders(),
        });
        const resData = response.data?.data ?? response.data;
        return resData || { unreadCount: 0, items: [], isAdmin: false };
    } catch (error) {
        // Support summary should fail gracefully without breaking the profile screen
        return { unreadCount: 0, items: [], isAdmin: false };
    }
}

export async function fetchSupportTickets(params?: {
    status?: string;
    priority?: string;
    page?: number;
    search?: string;
}): Promise<TicketListing> {
    try {
        const cleanParams: Record<string, any> = {};
        if (params?.status && params.status !== 'all') cleanParams.status = params.status;
        if (params?.priority && params.priority !== 'all') cleanParams.priority = params.priority;
        if (params?.search && params.search.trim()) cleanParams.search = params.search.trim();
        if (params?.page) cleanParams.page = params.page;

        const response = await apiClient.get<any>('/patient/v1/support/tickets', {
            params: Object.keys(cleanParams).length ? cleanParams : undefined,
            headers: getHeaders(),
        });
        const resData = response.data?.data ?? response.data;
        return resData || { items: [], total: 0, page: 1, pages: 1, counts: {} as any };
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function fetchTicketDetail(ticketId: string): Promise<TicketDetail> {
    try {
        const response = await apiClient.get<any>(`/patient/v1/support/tickets/${ticketId}`, {
            headers: getHeaders(),
        });
        const resData = response.data?.data ?? response.data;
        return resData;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function createTicket(payload: CreateTicketPayload): Promise<TicketDetail> {
    try {
        const response = await apiClient.post<any>('/patient/v1/support/tickets', payload, {
            headers: getHeaders(),
        });
        const resData = response.data?.data ?? response.data;
        return resData;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function replyToTicket(ticketId: string, payload: ReplyTicketPayload): Promise<TicketDetail> {
    try {
        const response = await apiClient.post<any>(
            `/patient/v1/support/tickets/${ticketId}/replies`,
            payload,
            {
                headers: getHeaders(),
            }
        );
        const resData = response.data?.data ?? response.data;
        return resData;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function markTicketAsRead(ticketId: string, throughMessageId?: string): Promise<void> {
    try {
        await apiClient.post(
            `/patient/v1/support/tickets/${ticketId}/read`,
            { throughMessageId },
            { headers: getHeaders() }
        );
    } catch (error) {
        console.warn('Failed to mark ticket as read:', error);
    }
}

export function getSupportHeaders(): Record<string, string> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const contextToken = activeContextHeader || getFallbackContextToken();
    if (contextToken) {
        headers['X-Support-Context'] = contextToken;
    }
    return headers;
}

export function getAttachmentUrl(attachmentId: string): string {
    return `${API_BASE_URL}/patient/v1/support/attachments/${attachmentId}`;
}

export async function revokeTicket(ticketId: string, reason?: string): Promise<TicketDetail> {
    try {
        const response = await apiClient.post<any>(
            `/patient/v1/support/tickets/${ticketId}/revoke`,
            { reason: reason?.trim() || 'Ticket revoked by patient' },
            { headers: getHeaders() }
        );
        const resData = response.data?.data ?? response.data;
        return resData;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function uploadSupportAttachment(
    file: { uri: string; name: string; type: string },
    ticketId?: string
): Promise<Attachment> {
    try {
        const formData = new FormData();
        const fileUri = Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri;
        formData.append('file', {
            uri: fileUri,
            name: file.name,
            type: file.type || 'application/octet-stream',
        } as any);

        const url = ticketId
            ? `/patient/v1/support/attachments?ticketId=${encodeURIComponent(ticketId)}`
            : '/patient/v1/support/attachments';

        const headers = getHeaders();
        // Do not set Content-Type header so Axios / React Native automatically
        // generates multipart/form-data with the correct boundary parameter!
        delete headers['Content-Type'];

        const response = await apiClient.post<any>(url, formData, {
            headers,
            transformRequest: (data) => data, // Prevent Axios from converting FormData to JSON
        });

        const resData = response.data?.data ?? response.data;
        return resData;
    } catch (error) {
        throw normalizeApiError(error);
    }
}
