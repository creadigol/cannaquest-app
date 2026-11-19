import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createTicket,
    fetchSupportContext,
    fetchSupportSummary,
    fetchSupportTickets,
    fetchTicketDetail,
    markTicketAsRead,
    replyToTicket,
    revokeTicket,
    uploadSupportAttachment,
} from '../api/support.api';
import type { CreateTicketPayload, ReplyTicketPayload } from '../api/support.types';

export const SUPPORT_KEYS = {
    all: ['support'] as const,
    context: () => [...SUPPORT_KEYS.all, 'context'] as const,
    summary: () => [...SUPPORT_KEYS.all, 'summary'] as const,
    tickets: (params?: Record<string, any>) => [...SUPPORT_KEYS.all, 'tickets', params] as const,
    detail: (id: string) => [...SUPPORT_KEYS.all, 'detail', id] as const,
};

export function useSupportContext() {
    return useQuery({
        queryKey: SUPPORT_KEYS.context(),
        queryFn: fetchSupportContext,
        staleTime: 1000 * 60 * 10,
    });
}

export function useSupportSummary() {
    return useQuery({
        queryKey: SUPPORT_KEYS.summary(),
        queryFn: fetchSupportSummary,
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
        retry: false,
    });
}

export function useSupportTickets(params?: {
    status?: string;
    priority?: string;
    page?: number;
    search?: string;
}) {
    return useQuery({
        queryKey: SUPPORT_KEYS.tickets(params),
        queryFn: () => fetchSupportTickets(params),
        staleTime: 1000 * 30,
    });
}

export function useTicketDetail(ticketId: string | null) {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: SUPPORT_KEYS.detail(ticketId || ''),
        queryFn: async () => {
            if (!ticketId) throw new Error('Ticket ID is required');
            const data = await fetchTicketDetail(ticketId);
            if (data.unread && data.lastMessageId) {
                void markTicketAsRead(ticketId, data.lastMessageId);
                void queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.summary() });
                void queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.tickets() });
            }
            return data;
        },
        enabled: Boolean(ticketId),
        staleTime: 1000 * 15,
    });
}

export function useCreateTicket() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateTicketPayload) => createTicket(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.all });
        },
    });
}

export function useReplyToTicket() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ ticketId, payload }: { ticketId: string; payload: ReplyTicketPayload }) =>
            replyToTicket(ticketId, payload),
        onSuccess: (data, variables) => {
            void queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.detail(variables.ticketId) });
            void queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.tickets() });
            void queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.summary() });
        },
    });
}

export function useRevokeTicket() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: string | { ticketId: string; reason?: string }) => {
            const ticketId = typeof args === 'string' ? args : args.ticketId;
            const reason = typeof args === 'string' ? undefined : args.reason;
            return revokeTicket(ticketId, reason);
        },
        onSuccess: (data, args) => {
            const ticketId = typeof args === 'string' ? args : args.ticketId;
            void queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.detail(ticketId) });
            void queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.tickets() });
            void queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.summary() });
        },
    });
}

export function useUploadAttachment() {
    return useMutation({
        mutationFn: ({ file, ticketId }: { file: { uri: string; name: string; type: string }; ticketId?: string }) =>
            uploadSupportAttachment(file, ticketId),
    });
}
