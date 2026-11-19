import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import { useSupportSummary, useSupportTickets } from '../hooks/useSupport';
import { TicketCard } from './TicketCard';
import { CreateTicketModal } from './CreateTicketModal';
import { TicketDetailModal } from './TicketDetailModal';
import type { Ticket, TicketStatus } from '../api/support.types';

interface Props {
    visible: boolean;
    onClose: () => void;
}

const FILTER_TABS: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'waiting', label: 'Waiting' },
    { key: 'resolved', label: 'Resolved' },
];

export function SupportCenterModal({ visible, onClose }: Props) {
    const [selectedTab, setSelectedTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

    const queryParams = {
        status: selectedTab !== 'all' ? selectedTab : undefined,
        search: searchQuery.trim() || undefined,
    };

    const { data: listing, isLoading, error, refetch, isRefetching } = useSupportTickets(queryParams);
    const { data: summary } = useSupportSummary();

    if (!visible) return null;

    const tickets = listing?.items || [];
    const counts = listing?.counts;

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Support & Assistance</Text>
                            <Text style={styles.subtitle}>Help desk, orders, prescriptions & inquiries</Text>
                        </View>
                        <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </Pressable>
                    </View>

                    {/* Unread Alert Callout Banner */}
                    {summary && summary.unreadCount > 0 && (
                        <Pressable
                            onPress={() => {
                                const target =
                                    summary.items?.find((t) => t.unread) ||
                                    tickets.find((t) => t.unread) ||
                                    tickets[0];
                                if (target) {
                                    setActiveTicketId(target.id);
                                }
                            }}
                            style={({ pressed }) => [
                                styles.unreadCalloutBanner,
                                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                            ]}
                        >
                            <Text style={styles.unreadCalloutIcon}>🔔</Text>
                            <View style={{ flex: 1 }}>
                                <View style={styles.unreadCalloutTitleRow}>
                                    <Text style={styles.unreadCalloutTitle}>
                                        {summary.unreadCount} ticket{summary.unreadCount > 1 ? 's have' : ' has'} updates
                                    </Text>
                                    <View style={styles.newBadgePill}>
                                        <Text style={styles.newBadgeText}>NEW</Text>
                                    </View>
                                </View>
                                <Text style={styles.unreadCalloutSubtitle}>
                                    Our support team has replied to your request. Tap here to view the response.
                                </Text>
                            </View>
                            <Text style={{ fontSize: 18, color: '#059669', fontWeight: '800' }}>→</Text>
                        </Pressable>
                    )}

                    {/* New Ticket Button & Search Row */}
                    <View style={styles.actionRow}>
                        <Pressable
                            onPress={() => setShowCreateModal(true)}
                            style={styles.newTicketBtn}
                        >
                            <Text style={styles.newTicketBtnText}>+ New Support Ticket</Text>
                        </Pressable>

                        <View style={styles.searchBox}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                placeholder="Search tickets..."
                                placeholderTextColor={colors.textTertiary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={styles.searchInput}
                            />
                            {searchQuery.length > 0 && (
                                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                                    <Text style={styles.clearSearch}>✕</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* Filter Tabs */}
                    <View style={styles.tabsWrapper}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                            {FILTER_TABS.map((tab) => {
                                const active = selectedTab === tab.key;
                                const count =
                                    tab.key === 'all'
                                        ? listing?.total
                                        : counts?.[tab.key as TicketStatus];

                                return (
                                    <Pressable
                                        key={tab.key}
                                        onPress={() => setSelectedTab(tab.key)}
                                        style={[styles.tabPill, active && styles.tabPillActive]}
                                    >
                                        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                                            {tab.label}
                                        </Text>
                                        {count !== undefined && count !== null ? (
                                            <View
                                                style={[
                                                    styles.tabCountBadge,
                                                    active && styles.tabCountBadgeActive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.tabCountText,
                                                        active && styles.tabCountTextActive,
                                                    ]}
                                                >
                                                    {count}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Ticket List */}
                    {error ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>⚠️</Text>
                            <Text style={styles.emptyTitle}>Could not load tickets</Text>
                            <Text style={styles.emptySub}>
                                {(error as any)?.message || 'Please check your connection and try again.'}
                            </Text>
                            <Pressable onPress={() => refetch()} style={styles.emptyActionBtn}>
                                <Text style={styles.emptyActionText}>Try Again</Text>
                            </Pressable>
                        </View>
                    ) : isLoading && !isRefetching ? (
                        <View style={styles.centerLoading}>
                            <ActivityIndicator color={colors.primaryGreen} size="large" />
                            <Text style={styles.loadingText}>Loading support tickets...</Text>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContainer}
                            refreshControl={
                                <RefreshControl
                                    refreshing={isRefetching}
                                    onRefresh={refetch}
                                    colors={[colors.primaryGreen]}
                                />
                            }
                        >
                            {tickets.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyIcon}>🎫</Text>
                                    <Text style={styles.emptyTitle}>No Tickets Found</Text>
                                    <Text style={styles.emptySub}>
                                        {selectedTab !== 'all'
                                            ? `No tickets currently in "${selectedTab}".`
                                            : "You haven't submitted any support requests yet."}
                                    </Text>
                                    <Pressable
                                        onPress={() => setShowCreateModal(true)}
                                        style={styles.emptyActionBtn}
                                    >
                                        <Text style={styles.emptyActionText}>Submit First Ticket</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                tickets.map((t) => (
                                    <TicketCard
                                        key={t.id}
                                        ticket={t}
                                        onPress={(ticket) => setActiveTicketId(ticket.id)}
                                    />
                                ))
                            )}
                        </ScrollView>
                    )}

                    {/* Create Ticket Modal */}
                    <CreateTicketModal
                        visible={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={(id) => {
                            setShowCreateModal(false);
                            setActiveTicketId(id);
                        }}
                    />

                    {/* Ticket Conversation Detail Modal */}
                    <TicketDetailModal
                        ticketId={activeTicketId}
                        visible={Boolean(activeTicketId)}
                        onClose={() => setActiveTicketId(null)}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: 'rgba(15, 30, 18, 0.50)',
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        height: '92%',
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        paddingTop: 18,
    },
    header: {
        alignItems: 'center',
        borderBottomColor: colors.borderLight,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 12.5,
        marginTop: 2,
    },
    closeBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceNeutral,
        borderRadius: radii.full,
        width: 32,
        height: 32,
    },
    closeBtnText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
        includeFontPadding: false,
        textAlign: 'center',
        textAlignVertical: 'center',
        transform: [{ translateY: Platform.OS === 'android' ? -1 : 0 }],
    },
    unreadCalloutBanner: {
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        borderColor: '#10b981',
        borderRadius: radii.md,
        borderWidth: 1.5,
        flexDirection: 'row',
        gap: 10,
        marginHorizontal: 20,
        marginTop: 12,
        padding: 12,
    },
    unreadCalloutIcon: {
        fontSize: 18,
    },
    unreadCalloutTitleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
        marginBottom: 2,
    },
    unreadCalloutTitle: {
        color: '#065f46',
        fontSize: 13,
        fontWeight: '800',
    },
    newBadgePill: {
        backgroundColor: '#059669',
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    newBadgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '800',
    },
    unreadCalloutSubtitle: {
        color: '#047857',
        fontSize: 11.5,
        lineHeight: 15,
    },
    actionRow: {
        paddingHorizontal: 20,
        paddingTop: 14,
        gap: 10,
    },
    newTicketBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.md,
        paddingVertical: 12,
        ...shadows.sm,
    },
    newTicketBtnText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    searchBox: {
        alignItems: 'center',
        backgroundColor: colors.surfaceNeutral,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchIcon: {
        fontSize: 13,
        marginRight: 6,
    },
    searchInput: {
        color: colors.textPrimary,
        flex: 1,
        fontSize: 13,
        padding: 0,
    },
    clearSearch: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
        paddingHorizontal: 4,
    },
    tabsWrapper: {
        borderBottomColor: colors.borderLight,
        borderBottomWidth: 1,
        marginTop: 10,
    },
    tabsScroll: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        gap: 8,
    },
    tabPill: {
        alignItems: 'center',
        backgroundColor: colors.surfaceNeutral,
        borderRadius: 20,
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    tabPillActive: {
        backgroundColor: colors.primaryGreen,
    },
    tabLabel: {
        color: colors.textSecondary,
        fontSize: 12.5,
        fontWeight: '600',
    },
    tabLabelActive: {
        color: colors.white,
        fontWeight: '700',
    },
    tabCountBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    tabCountBadgeActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    tabCountText: {
        color: colors.textSecondary,
        fontSize: 10.5,
        fontWeight: '700',
    },
    tabCountTextActive: {
        color: colors.white,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
    },
    centerLoading: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 10,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
        paddingHorizontal: 20,
    },
    emptyIcon: {
        fontSize: 42,
        marginBottom: 10,
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    emptySub: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 18,
    },
    emptyActionBtn: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderRadius: radii.md,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    emptyActionText: {
        color: colors.primaryGreen,
        fontSize: 13,
        fontWeight: '700',
    },
});
