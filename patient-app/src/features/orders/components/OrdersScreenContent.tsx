import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme/tokens';
import { OrderCard } from './OrderCard';
import { OrderDetailModal } from './OrderDetailModal';
import { getOrderDetail, getOrders, type OrdersTab } from '../api/orders.api';
import type { OrderDetail, OrderSummary } from '../api/orders.types';

const TABS: { key: OrdersTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
];

export function OrdersScreenContent() {
    const [activeTab, setActiveTab] = useState<OrdersTab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    const loadOrders = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            console.log(`[OrdersScreen] Loading orders (tab: ${activeTab}, search: "${searchQuery}")`);
            const data = await getOrders(activeTab, searchQuery);
            setOrders(data);
        } catch (error) {
            console.error('[OrdersScreen] Error loading orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, searchQuery]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const handleSelectOrder = async (orderSummary: OrderSummary) => {
        setDetailLoading(true);
        try {
            console.log('[OrdersScreen] Opening detail modal for order:', orderSummary.uuid);
            const detail = await getOrderDetail(orderSummary.uuid);
            setSelectedOrder(detail);
            setDetailModalVisible(true);
        } catch {
            // Fallback to summary information
            setSelectedOrder({
                ...orderSummary,
                customer_name: 'Patient',
            });
            setDetailModalVisible(true);
        } finally {
            setDetailLoading(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* ── Page Header ───────────────────────────────────── */}
            <View style={styles.pageTitleBlock}>
                <Text style={styles.pageTitle}>Orders</Text>
                <Text style={styles.pageSubtitle}>Track your medication orders</Text>
            </View>

            {/* ── Filter Tabs ───────────────────────────────────── */}
            <View style={styles.tabRow}>
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <Pressable
                            key={tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            style={({ pressed }) => [
                                styles.tabChip,
                                isActive && styles.tabChipActive,
                                pressed && styles.tabPressed,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.tabChipText,
                                    isActive && styles.tabChipTextActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* ── Search Input ─────────────────────────────────── */}
            <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    autoCapitalize="words"
                    autoCorrect={true}
                    clearButtonMode="while-editing"
                    onChangeText={setSearchQuery}
                    placeholder="Search by order ID or product…"
                    placeholderTextColor={colors.mutedForeground}
                    style={styles.searchInput}
                    value={searchQuery}
                />
            </View>
        </View>
    );

    const renderEmpty = () => {
        if (loading) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator color={colors.primaryGreen} size="large" />
                    <Text style={styles.loadingText}>Loading your orders…</Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>
                    {searchQuery ? 'No orders found' : 'No orders yet'}
                </Text>
                <Text style={styles.emptySub}>
                    {searchQuery
                        ? 'Try a different search term'
                        : 'Your orders will appear here once placed'}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                contentContainerStyle={styles.listContent}
                data={orders}
                keyExtractor={(item) => String(item.uuid || item.id)}
                ListEmptyComponent={renderEmpty}
                ListHeaderComponent={renderHeader}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                refreshControl={
                    <RefreshControl
                        colors={[colors.primaryGreen]}
                        onRefresh={() => loadOrders(true)}
                        refreshing={refreshing}
                        tintColor={colors.primaryGreen}
                    />
                }
                renderItem={({ item }) => (
                    <OrderCard order={item} onPressOrder={handleSelectOrder} />
                )}
                showsVerticalScrollIndicator={false}
            />

            {/* Global Detail Loading Overlay */}
            {detailLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator color={colors.primaryGreen} size="large" />
                </View>
            )}

            {/* Order Detail Modal */}
            <OrderDetailModal
                onClose={() => setDetailModalVisible(false)}
                onRefreshNeeded={() => loadOrders(true)}
                order={selectedOrder}
                visible={detailModalVisible}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        flex: 1,
    },
    emptyCard: {
        alignItems: 'center',
        backgroundColor: colors.surfaceCardBg,
        borderColor: colors.surfaceCardBorder,
        borderRadius: radii.xl,
        borderWidth: 1,
        justifyContent: 'center',
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: 48,
        ...shadows.tier1,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyIcon: {
        fontSize: 36,
        marginBottom: 10,
        opacity: 0.6,
    },
    emptySub: {
        color: colors.mutedForeground,
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
    },
    emptyTitle: {
        color: colors.foreground,
        fontSize: 16,
        fontWeight: '700',
    },
    headerContainer: {
        gap: spacing.md,
        marginBottom: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 16 : 14,
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: 32,
    },
    loadingOverlay: {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        ...StyleSheet.absoluteFill,
        justifyContent: 'center',
        zIndex: 99,
    },
    loadingText: {
        color: colors.mutedForeground,
        fontSize: 13,
        marginTop: 10,
    },
    pageSubtitle: {
        color: colors.mutedForeground,
        fontSize: 13,
        marginTop: 2,
    },
    pageTitle: {
        color: colors.foreground,
        fontSize: 22,
        fontWeight: '700',
    },
    pageTitleBlock: {
        marginBottom: 2,
    },
    searchContainer: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: radii.xl,
        borderWidth: 1,
        flexDirection: 'row',
        height: 44,
        paddingHorizontal: 12,
        ...shadows.tier1,
    },
    searchIcon: {
        fontSize: 14,
        marginRight: 8,
        opacity: 0.5,
    },
    searchInput: {
        color: colors.foreground,
        flex: 1,
        fontSize: 13,
        height: '100%',
    },
    tabChip: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderColor: 'transparent',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 7,
    },
    tabChipActive: {
        backgroundColor: colors.primaryGreen,
        borderColor: colors.primaryGreen,
    },
    tabChipText: {
        color: colors.mutedForeground,
        fontSize: 13,
        fontWeight: '600',
    },
    tabChipTextActive: {
        color: colors.white,
    },
    tabPressed: {
        opacity: 0.8,
    },
    tabRow: {
        flexDirection: 'row',
        gap: 8,
    },
});
