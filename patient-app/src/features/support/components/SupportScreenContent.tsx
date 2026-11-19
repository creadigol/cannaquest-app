import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import { useSupportSummary, useSupportTickets } from '../hooks/useSupport';
import { TicketCard } from './TicketCard';
import { CreateTicketModal } from './CreateTicketModal';
import { TicketDetailModal } from './TicketDetailModal';
import type { Ticket, TicketPriority, TicketStatus } from '../api/support.types';

const STATUS_TABS: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'waiting', label: 'Waiting' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
];

const PRIORITY_FILTERS: Array<{ key: string; label: string; dot?: string }> = [
    { key: 'all', label: 'All Priorities' },
    { key: 'urgent', label: 'Urgent', dot: '#dc2626' },
    { key: 'high', label: 'High', dot: '#ea580c' },
    { key: 'medium', label: 'Medium', dot: '#0d9488' },
    { key: 'low', label: 'Low', dot: '#2f8fab' },
];

function BackArrowIcon({ color = colors.foreground }: { color?: string }) {
    return (
        <View style={styles.arrowContainer}>
            <View style={[styles.arrowShaft, { backgroundColor: color }]} />
            <View style={[styles.arrowHead, { borderColor: color }]} />
        </View>
    );
}

export function SupportScreenContent() {
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedPriority, setSelectedPriority] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

    const { ticketId: paramTicketId } = useLocalSearchParams<{ ticketId?: string }>();

    useEffect(() => {
        if (paramTicketId) {
            setActiveTicketId(paramTicketId);
        }
    }, [paramTicketId]);

    // Animations for unread update bell
    const bellAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const pulseLoop = Animated.loop(
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 1800,
                useNativeDriver: true,
            })
        );
        pulseLoop.start();

        const bellLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(bellAnim, { toValue: -14, duration: 80, useNativeDriver: true }),
                Animated.timing(bellAnim, { toValue: 14, duration: 100, useNativeDriver: true }),
                Animated.timing(bellAnim, { toValue: -10, duration: 90, useNativeDriver: true }),
                Animated.timing(bellAnim, { toValue: 10, duration: 90, useNativeDriver: true }),
                Animated.timing(bellAnim, { toValue: -4, duration: 70, useNativeDriver: true }),
                Animated.timing(bellAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
                Animated.delay(3000),
            ])
        );
        bellLoop.start();

        return () => {
            pulseLoop.stop();
            bellLoop.stop();
        };
    }, [bellAnim, pulseAnim]);

    const bellRotate = bellAnim.interpolate({
        inputRange: [-18, 18],
        outputRange: ['-18deg', '18deg'],
    });

    const pulseScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.85, 1.8],
    });

    const pulseOpacity = pulseAnim.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0.8, 0.4, 0],
    });

    const queryParams = {
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
        search: searchQuery.trim() || undefined,
    };

    const { data: listing, isLoading, error, refetch, isRefetching } = useSupportTickets(queryParams);
    const { data: summary } = useSupportSummary();

    const tickets = listing?.items || [];
    const counts = listing?.counts;

    return (
        <View style={styles.root}>
            {/* Top Bar with Back Navigation & New Ticket Action */}
            <View style={styles.topBar}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
                    accessibilityLabel="Back"
                >
                    <BackArrowIcon />
                </Pressable>

                <View style={styles.topBarCenter}>
                    <Text style={styles.eyebrow}>CANNAQUEST SUPPORT</Text>
                    <Text style={styles.pageTitle}>Support tickets</Text>
                </View>

                <Pressable
                    onPress={() => setShowCreateModal(true)}
                    style={({ pressed }) => [styles.newTicketBtn, pressed && styles.pressed]}
                >
                    <Text style={styles.newTicketBtnText}>+ New</Text>
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={() => {
                            void refetch();
                        }}
                        tintColor={colors.primaryGreen}
                    />
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Unread Updates Callout Banner matching cannaquest-micro */}
                {summary && summary.unreadCount > 0 && (
                    <Pressable
                        onPress={() => {
                            const targetTicket =
                                summary.items?.find((t) => t.unread) ||
                                tickets.find((t) => t.unread) ||
                                summary.items?.[0] ||
                                tickets[0];
                            if (targetTicket) {
                                setActiveTicketId(targetTicket.id);
                            } else {
                                setSelectedStatus('all');
                            }
                        }}
                        style={({ pressed }) => [
                            styles.unreadCalloutBanner,
                            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                        ]}
                    >
                        <View style={styles.unreadCalloutIconWrap}>
                            <Animated.View
                                style={[
                                    styles.bellSonarRing,
                                    {
                                        transform: [{ scale: pulseScale }],
                                        opacity: pulseOpacity,
                                    },
                                ]}
                            />
                            <Animated.Text
                                style={[
                                    styles.unreadCalloutIconText,
                                    {
                                        transform: [{ rotate: bellRotate }],
                                    },
                                ]}
                            >
                                🔔
                            </Animated.Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={styles.unreadCalloutTitleRow}>
                                <Text style={styles.unreadCalloutTitle}>
                                    {summary.unreadCount} ticket{summary.unreadCount > 1 ? 's have' : ' has'} new updates
                                </Text>
                                <View style={styles.newBadgePill}>
                                    <View style={styles.liveGreenDot} />
                                    <Text style={styles.newBadgeText}>NEW REPLY</Text>
                                </View>
                            </View>
                            <Text style={styles.unreadCalloutSubtitle}>
                                Support staff has replied to your request. Tap here to view the response & details.
                            </Text>
                        </View>
                        <View style={styles.viewReplyBtnPill}>
                            <Text style={styles.viewReplyBtnText}>View</Text>
                            <Text style={styles.viewReplyBtnArrow}>→</Text>
                        </View>
                    </Pressable>
                )}

                {/* Info Callout Banner matching patient-portal */}
                <View style={styles.infoBanner}>
                    <View style={styles.infoIconWrap}>
                        <Text style={styles.infoIcon}>💬</Text>
                    </View>
                    <Text style={styles.infoText}>
                        Describe what happened and our team will reply here. A green badge indicates when there’s a new reply.
                    </Text>
                </View>

                {/* Status Stats Row matching ticket-rows.module.css */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statusChipsContainer}
                >
                    {STATUS_TABS.map((tab) => {
                        const isSelected = selectedStatus === tab.key;
                        const count =
                            tab.key === 'all'
                                ? listing?.total ?? 0
                                : counts?.[tab.key as TicketStatus] ?? 0;

                        return (
                            <Pressable
                                key={tab.key}
                                onPress={() => setSelectedStatus(tab.key)}
                                style={({ pressed }) => [
                                    styles.statusChip,
                                    isSelected && styles.statusChipActive,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusChipLabel,
                                        isSelected && styles.statusChipLabelActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                                <View
                                    style={[
                                        styles.countBadge,
                                        isSelected && styles.countBadgeActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.countBadgeText,
                                            isSelected && styles.countBadgeTextActive,
                                        ]}
                                    >
                                        {count}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* Search Box */}
                <View style={styles.searchRow}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search ticket number or subject…"
                        placeholderTextColor={colors.mutedForeground}
                        style={styles.searchInput}
                        returnKeyType="search"
                        autoCapitalize="none"
                        clearButtonMode="while-editing"
                    />
                    {Boolean(searchQuery) && (
                        <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                            <Text style={styles.clearBtnText}>✕</Text>
                        </Pressable>
                    )}
                </View>

                {/* Priority Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.prioFiltersContainer}
                >
                    {PRIORITY_FILTERS.map((p) => {
                        const isSelected = selectedPriority === p.key;
                        return (
                            <Pressable
                                key={p.key}
                                onPress={() => setSelectedPriority(p.key)}
                                style={({ pressed }) => [
                                    styles.prioFilterChip,
                                    isSelected && styles.prioFilterChipActive,
                                    pressed && styles.pressed,
                                ]}
                            >
                                {p.dot && (
                                    <View style={[styles.prioDot, { backgroundColor: p.dot }]} />
                                )}
                                <Text
                                    style={[
                                        styles.prioFilterLabel,
                                        isSelected && styles.prioFilterLabelActive,
                                    ]}
                                >
                                    {p.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* Error Banner with Retry */}
                {Boolean(error) && (
                    <View style={styles.errorBanner}>
                        <View style={styles.errorIconWrap}>
                            <Text style={styles.errorIcon}>⚠️</Text>
                        </View>
                        <View style={styles.errorContent}>
                            <Text style={styles.errorTitle}>Could not load tickets</Text>
                            <Text style={styles.errorMessage}>
                                {error?.message || 'Access restricted or server connection failed.'}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => void refetch()}
                            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
                        >
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </Pressable>
                    </View>
                )}

                {/* Tickets List */}
                {isLoading && !isRefetching ? (
                    <View style={styles.loaderWrap}>
                        <ActivityIndicator size="large" color={colors.primaryGreen} />
                        <Text style={styles.loadingText}>Loading tickets…</Text>
                    </View>
                ) : tickets.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconWrap}>
                            <Text style={styles.emptyIcon}>🎫</Text>
                        </View>
                        <Text style={styles.emptyTitle}>No tickets found</Text>
                        <Text style={styles.emptyText}>
                            {searchQuery || selectedStatus !== 'all' || selectedPriority !== 'all'
                                ? 'Try adjusting your search query or filter filters.'
                                : 'Need assistance with prescriptions, consultations, or orders? Create your first ticket.'}
                        </Text>
                        <Pressable
                            onPress={() => setShowCreateModal(true)}
                            style={({ pressed }) => [styles.createFirstBtn, pressed && styles.pressed]}
                        >
                            <Text style={styles.createFirstBtnText}>+ Create a Ticket</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.ticketsList}>
                        {tickets.map((ticket) => (
                            <TicketCard
                                key={ticket.id}
                                ticket={ticket}
                                onPress={(t) => setActiveTicketId(t.id)}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Create Ticket Modal */}
            <CreateTicketModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={(newTicketId) => {
                    setShowCreateModal(false);
                    void refetch();
                    setActiveTicketId(newTicketId);
                }}
            />

            {/* Ticket Detail Modal */}
            <TicketDetailModal
                ticketId={activeTicketId}
                visible={Boolean(activeTicketId)}
                onClose={() => {
                    setActiveTicketId(null);
                    void refetch();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: radii.full,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowContainer: {
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    arrowShaft: {
        width: 14,
        height: 2.2,
        borderRadius: 1.1,
        position: 'absolute',
        left: 2,
    },
    arrowHead: {
        width: 8,
        height: 8,
        borderLeftWidth: 2.2,
        borderTopWidth: 2.2,
        borderRadius: 1,
        position: 'absolute',
        left: 1.5,
        transform: [{ rotate: '-45deg' }],
    },
    topBarCenter: {
        alignItems: 'center',
    },
    eyebrow: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: colors.primaryGreen,
        textTransform: 'uppercase',
    },
    pageTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.foreground,
        marginTop: 1,
    },
    newTicketBtn: {
        backgroundColor: colors.primaryGreen,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radii.full,
        ...shadows.sm,
    },
    newTicketBtnText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl * 2,
        gap: spacing.md,
    },
    unreadCalloutBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        borderWidth: 1.5,
        borderColor: '#10b981',
        borderRadius: radii.lg,
        padding: spacing.md,
        gap: spacing.sm,
        ...shadows.sm,
    },
    unreadCalloutIconWrap: {
        width: 38,
        height: 38,
        borderRadius: radii.full,
        backgroundColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    bellSonarRing: {
        position: 'absolute',
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(16, 185, 129, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.7)',
    },
    unreadCalloutIconText: {
        fontSize: 18,
    },
    unreadCalloutTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    unreadCalloutTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#065f46',
    },
    newBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#059669',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    liveGreenDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#a7f3d0',
    },
    newBadgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '800',
    },
    unreadCalloutSubtitle: {
        fontSize: 12,
        color: '#047857',
        lineHeight: 16,
    },
    viewReplyBtnPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#059669',
        borderRadius: radii.full,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginLeft: 4,
    },
    viewReplyBtnText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '800',
    },
    viewReplyBtnArrow: {
        color: '#a7f3d0',
        fontSize: 12,
        fontWeight: '800',
    },
    unreadCalloutChevron: {
        fontSize: 20,
        fontWeight: '700',
        color: '#059669',
        marginLeft: 4,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: radii.lg,
        padding: spacing.md,
        gap: spacing.sm,
    },
    infoIconWrap: {
        width: 32,
        height: 32,
        borderRadius: radii.full,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoIcon: {
        fontSize: 15,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#166534',
        lineHeight: 17,
        fontWeight: '500',
    },
    statusChipsContainer: {
        gap: 8,
        paddingVertical: 2,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        borderRadius: radii.full,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    statusChipActive: {
        backgroundColor: '#0f172a',
        borderColor: '#0f172a',
    },
    statusChipLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.foreground,
    },
    statusChipLabelActive: {
        color: colors.white,
    },
    countBadge: {
        backgroundColor: 'rgba(0,0,0,0.06)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: radii.full,
        minWidth: 18,
        alignItems: 'center',
    },
    countBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    countBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.mutedForeground,
    },
    countBadgeTextActive: {
        color: colors.white,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        height: 44,
        ...shadows.sm,
    },
    searchIcon: {
        fontSize: 14,
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: colors.foreground,
        height: '100%',
    },
    clearBtn: {
        padding: 4,
    },
    clearBtnText: {
        fontSize: 13,
        color: colors.mutedForeground,
    },
    prioFiltersContainer: {
        gap: 6,
    },
    prioFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        borderRadius: radii.full,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 5,
    },
    prioFilterChipActive: {
        backgroundColor: '#f1f5f9',
        borderColor: '#94a3b8',
    },
    prioDot: {
        width: 7,
        height: 7,
        borderRadius: radii.full,
    },
    prioFilterLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.foreground,
    },
    prioFilterLabelActive: {
        color: '#0f172a',
        fontWeight: '700',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
        borderRadius: radii.md,
        padding: spacing.md,
        gap: spacing.sm,
    },
    errorIconWrap: {
        width: 32,
        height: 32,
        borderRadius: radii.full,
        backgroundColor: '#ffe4e6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorIcon: {
        fontSize: 14,
    },
    errorContent: {
        flex: 1,
    },
    errorTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#9f1239',
    },
    errorMessage: {
        fontSize: 11,
        color: '#be123c',
        marginTop: 2,
    },
    retryBtn: {
        backgroundColor: '#be123c',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radii.sm,
    },
    retryBtnText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    loaderWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl * 2,
        gap: spacing.sm,
    },
    loadingText: {
        fontSize: 13,
        color: colors.mutedForeground,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        padding: spacing.xxl,
        marginTop: spacing.md,
        ...shadows.sm,
    },
    emptyIconWrap: {
        width: 54,
        height: 54,
        borderRadius: radii.full,
        backgroundColor: colors.emeraldChipBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    emptyIcon: {
        fontSize: 26,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.foreground,
    },
    emptyText: {
        fontSize: 13,
        color: colors.mutedForeground,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
        maxWidth: 280,
    },
    createFirstBtn: {
        backgroundColor: colors.primaryGreen,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radii.full,
        marginTop: spacing.lg,
        ...shadows.sm,
    },
    createFirstBtnText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    ticketsList: {
        gap: spacing.md,
    },
    pressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
});
