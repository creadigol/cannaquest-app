export type TicketPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TicketStatus =
    | 'open'
    | 'in_progress'
    | 'waiting'
    | 'resolved'
    | 'closed'
    | 'revoked';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
    open: 'Open',
    in_progress: 'In progress',
    waiting: 'Waiting for reply',
    resolved: 'Resolved',
    closed: 'Closed',
    revoked: 'Revoked',
};

export interface Attachment {
    id: string;
    fileName: string;
    mime: string;
    size: number;
    url?: string;
    storageKey?: string;
}

export interface TicketMessage {
    id: string;
    kind: 'request' | 'reply' | 'event' | 'revoke';
    body: string;
    authorName: string;
    fromAdmin: boolean;
    createdAt: string;
    attachments: Attachment[];
}

export interface Ticket {
    id: string;
    reference: string;
    subject: string;
    description?: string;
    panel: string;
    tenantId?: string;
    reporterName: string;
    reporterEmail?: string | null;
    reporterPhone?: string | null;
    status: TicketStatus;
    priority: TicketPriority;
    pageContext: string;
    affectedPages?: string[];
    targetRole?: 'support' | 'developer';
    revokedCount?: number;
    canRevoke?: boolean;
    closedAt?: string | null;
    resolvedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    version: number;
    unread: boolean;
    attachmentCount: number;
    replyCount: number;
}

export interface TicketDetail extends Ticket {
    messages: TicketMessage[];
    lastMessageId: string;
}

export interface TicketListing {
    items: Ticket[];
    total: number;
    page: number;
    pages: number;
    counts: Record<TicketStatus, number>;
}

export interface SupportSummary {
    unreadCount: number;
    items: Ticket[];
    isAdmin: boolean;
}

export interface SupportContext {
    userId: string;
    panel: string;
    tenantId: string;
    displayName: string;
    headerToken: string;
}

export interface CreateTicketPayload {
    requestId: string;
    subject: string;
    description: string;
    priority: TicketPriority;
    pageContext?: string;
    targetRole?: 'support' | 'developer';
    attachmentIds?: string[];
}

export interface ReplyTicketPayload {
    body: string;
    attachmentIds?: string[];
}
