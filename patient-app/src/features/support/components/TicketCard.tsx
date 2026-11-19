import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { Ticket, TicketPriority, TicketStatus } from '../api/support.types';
import { TICKET_STATUS_LABELS } from '../api/support.types';

interface Props {
    ticket: Ticket;
    onPress: (ticket: Ticket) => void;
}

// Config matching patient-portal ticket-rows.module.css
const PRIORITY_THEME: Record<
    TicketPriority,
    {
        accent: string;
        bg: string;
        border: string;
        badgeBg: string;
        badgeText: string;
        badgeBorder: string;
        label: string;
        icon: string;
    }
> = {
    urgent: {
        accent: '#dc2626',
        bg: '#fff5f5',
        border: 'rgba(220, 38, 38, 0.35)',
        badgeBg: '#ef4444',
        badgeText: '#ffffff',
        badgeBorder: '#b91c1c',
        label: 'Urgent',
        icon: '⚠️',
    },
    high: {
        accent: '#ea580c',
        bg: '#fffaf5',
        border: 'rgba(234, 88, 12, 0.30)',
        badgeBg: '#fff7ed',
        badgeText: '#c2410c',
        badgeBorder: '#fdba74',
        label: 'High',
        icon: '▲',
    },
    medium: {
        accent: '#0d9488',
        bg: '#f0fdfa',
        border: 'rgba(13, 148, 136, 0.28)',
        badgeBg: '#ccfbf1',
        badgeText: '#0f766e',
        badgeBorder: '#99f6e4',
        label: 'Medium',
        icon: '—',
    },
    low: {
        accent: '#2f8fab',
        bg: '#f0f9ff',
        border: 'rgba(47, 143, 171, 0.28)',
        badgeBg: '#e0f2fe',
        badgeText: '#0369a1',
        badgeBorder: '#bae6fd',
        label: 'Low',
        icon: '•',
    },
};

const STATUS_PILL: Record<TicketStatus, { bg: string; text: string }> = {
    open: { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669' },
    in_progress: { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb' },
    waiting: { bg: 'rgba(245, 158, 11, 0.14)', text: '#d97706' },
    resolved: { bg: 'rgba(16, 185, 129, 0.15)', text: '#047857' },
    closed: { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569' },
    revoked: { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626' },
};

export function TicketCard({ ticket, onPress }: Props) {
    const theme = PRIORITY_THEME[ticket.priority] || PRIORITY_THEME.medium;
    const statusStyle = STATUS_PILL[ticket.status] || STATUS_PILL.open;

    // Subtle pulsing animation for urgent tickets matching web heartbeat
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (ticket.priority === 'urgent') {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 0.45,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            );
            animation.start();
            return () => animation.stop();
        }
    }, [ticket.priority, pulseAnim]);

    const formattedDate = (() => {
        try {
            const d = new Date(ticket.updatedAt || ticket.createdAt);
            return d.toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return ticket.updatedAt || '—';
        }
    })();

    return (
        <Pressable
            onPress={() => onPress(ticket)}
            style={({ pressed }) => [
                styles.container,
                {
                    backgroundColor: theme.bg,
                    borderColor: ticket.unread ? '#059669' : theme.border,
                    borderWidth: ticket.unread ? 2 : 1.5,
                },
                ticket.unread && styles.unreadShadow,
                pressed && styles.pressed,
            ]}
        >
            {/* Left Priority Accent Bar */}
            {ticket.priority === 'urgent' ? (
                <Animated.View
                    style={[
                        styles.accentBar,
                        {
                            backgroundColor: theme.accent,
                            opacity: pulseAnim,
                        },
                    ]}
                />
            ) : (
                <View
                    style={[
                        styles.accentBar,
                        {
                            backgroundColor: ticket.unread ? '#059669' : theme.accent,
                        },
                    ]}
                />
            )}

            <View style={styles.innerContent}>
                {/* Header: Ticket Reference, Status Badge, Unread Dot */}
                <View style={styles.topRow}>
                    <View style={styles.refRow}>
                        <Text style={[styles.refText, ticket.priority === 'urgent' && styles.urgentRefText]}>
                            {ticket.reference || `#${ticket.id.slice(0, 8)}`}
                        </Text>
                        {ticket.unread && (
                            <View style={styles.newUpdateBadge}>
                                <View style={styles.newUpdateDot} />
                                <Text style={styles.newUpdateText}>New update</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.badgesRow}>
                        {/* Status Badge */}
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                                {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                            </Text>
                        </View>

                        {/* Priority Badge */}
                        <View
                            style={[
                                styles.prioBadge,
                                {
                                    backgroundColor: theme.badgeBg,
                                    borderColor: theme.badgeBorder,
                                },
                            ]}
                        >
                            <Text style={styles.prioIcon}>{theme.icon}</Text>
                            <Text style={[styles.prioBadgeText, { color: theme.badgeText }]}>
                                {theme.label}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Subject Line */}
                <Text numberOfLines={2} style={styles.subjectText}>
                    {ticket.subject}
                </Text>

                {/* Footer Metadata */}
                <View style={styles.footerRow}>
                    <View style={styles.metaLeft}>
                        {ticket.unread ? (
                            <View style={styles.unreadMetaTag}>
                                <Text style={styles.unreadMetaTagText}>⚡ Reply received</Text>
                            </View>
                        ) : null}

                        {ticket.pageContext ? (
                            <View style={styles.tagWrap}>
                                <Text numberOfLines={1} style={styles.tagText}>
                                    📍 {ticket.pageContext}
                                </Text>
                            </View>
                        ) : null}

                        {ticket.replyCount > 0 ? (
                            <View style={styles.countPill}>
                                <Text style={styles.countPillText}>💬 {ticket.replyCount}</Text>
                            </View>
                        ) : null}

                        {ticket.attachmentCount > 0 ? (
                            <View style={styles.countPill}>
                                <Text style={styles.countPillText}>📎 {ticket.attachmentCount}</Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.metaRight}>
                        <Text style={styles.timeText}>{formattedDate}</Text>
                        <Text style={styles.chevron}>›</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: radii.lg,
        borderWidth: 1.5,
        marginVertical: 6,
        overflow: 'hidden',
        position: 'relative',
        ...shadows.sm,
    },
    pressed: {
        opacity: 0.88,
        transform: [{ scale: 0.99 }],
    },
    unreadShadow: {
        ...shadows.md,
    },
    accentBar: {
        bottom: 6,
        left: 0,
        position: 'absolute',
        top: 6,
        width: 5,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    innerContent: {
        paddingBottom: spacing.md,
        paddingLeft: spacing.lg + 4,
        paddingRight: spacing.md,
        paddingTop: spacing.md,
    },
    topRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs + 2,
    },
    refRow: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    newUpdateBadge: {
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        borderRadius: 6,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 5,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    newUpdateDot: {
        backgroundColor: '#059669',
        borderRadius: 4,
        height: 6,
        width: 6,
    },
    newUpdateText: {
        color: '#047857',
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    unreadMetaTag: {
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
        borderRadius: 4,
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    unreadMetaTagText: {
        color: '#15803d',
        fontSize: 10.5,
        fontWeight: '700',
    },
    refText: {
        color: colors.textSecondary,
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    urgentRefText: {
        color: '#dc2626',
    },
    badgesRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    statusBadge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    prioBadge: {
        alignItems: 'center',
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    prioIcon: {
        fontSize: 10,
    },
    prioBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    subjectText: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 20,
        marginBottom: spacing.sm,
    },
    footerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    metaLeft: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tagWrap: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderRadius: 4,
        maxWidth: 140,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    tagText: {
        color: colors.textSecondary,
        fontSize: 10.5,
        fontWeight: '500',
    },
    countPill: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    countPillText: {
        color: colors.textSecondary,
        fontSize: 10.5,
        fontWeight: '600',
    },
    metaRight: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    timeText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '500',
    },
    chevron: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 2,
    },
});
