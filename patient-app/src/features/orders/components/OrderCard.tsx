import React, { useState } from 'react';
import {
    Alert,
    Image,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import { OrderStatusPill } from './OrderStatusPill';
import { OrderMiniProgressSteps } from './OrderMiniProgressSteps';
import type { OrderItem, OrderSummary } from '../api/orders.types';

// Category fallback thumbnails
const jarImg = require('@/../assets/images/product-categories/jar.webp');
const oilImg = require('@/../assets/images/product-categories/oil.webp');
const edibleImg = require('@/../assets/images/product-categories/edible.webp');
const deviceImg = require('@/../assets/images/product-categories/device.webp');

export function OrderCategoryThumbnail({ item }: { item?: OrderItem | null }) {
    if (!item) {
        return (
            <View style={styles.thumbnailBox}>
                <Text style={styles.thumbnailPlaceholder}>📦</Text>
            </View>
        );
    }

    const prod = item.product;
    const cat = prod?.category?.toLowerCase() || prod?.form?.category?.toLowerCase() || '';
    const isDevice = prod?.is_addon_device || cat.includes('device') || cat.includes('vapor');

    let imageSrc = jarImg;
    if (isDevice) {
        imageSrc = deviceImg;
    } else if (cat.includes('oil') || cat.includes('tincture')) {
        imageSrc = oilImg;
    } else if (cat.includes('edible') || cat.includes('gummy') || cat.includes('capsule')) {
        imageSrc = edibleImg;
    } else if (prod?.image_url) {
        return (
            <View style={styles.thumbnailBox}>
                <Image
                    resizeMode="contain"
                    source={{ uri: prod.image_url }}
                    style={styles.thumbnailImage}
                />
            </View>
        );
    }

    return (
        <View style={styles.thumbnailBox}>
            <Image resizeMode="contain" source={imageSrc} style={styles.thumbnailImage} />
        </View>
    );
}

interface Props {
    order: OrderSummary;
    onPressOrder: (order: OrderSummary) => void;
}

export function OrderCard({ order, onPressOrder }: Props) {
    const [copied, setCopied] = useState(false);

    // PayID pending detection: payment_method === 'payid' and status === '1' or SUBMITTED
    const isPendingPayId =
        order.payment_method === 'payid' &&
        (order.status === '1' || order.status === 'SUBMITTED');

    const primaryItem = order.items?.[0];
    const extraCount = (order.items?.length || 1) - 1;

    const formattedDate = new Date(order.created_at).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    const copyReference = (ref: string) => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        Alert.alert('Reference Copied', ref);
    };

    return (
        <View style={styles.card}>
            <Pressable
                onPress={() => onPressOrder(order)}
                style={({ pressed }) => [styles.pressableContainer, pressed && styles.cardPressed]}
            >
                {/* ── Row 1: ID + Status Pill ───────────────────── */}
                <View style={styles.headerRow}>
                    <View style={styles.titleCol}>
                        <Text numberOfLines={1} style={styles.orderUuid}>
                            {order.uuid}
                        </Text>
                        <Text style={styles.orderDate}>{formattedDate}</Text>
                    </View>
                    <OrderStatusPill
                        color={order.status_config?.color ?? 'gray'}
                        label={order.status_config?.label ?? order.status ?? 'Pending'}
                    />
                </View>

                {/* ── Row 2: Mini Progress Steps ───────────────── */}
                {order.progress_steps && order.progress_steps.length > 0 && (
                    <OrderMiniProgressSteps steps={order.progress_steps} />
                )}

                {/* ── Shipping Summary / Tracking Link (Multi-consignment or Direct) ───────── */}
                {order.tracking_url ? (
                    <View style={styles.cardTrackingRow}>
                        <View style={styles.cardTrackingLeft}>
                            <Text style={styles.truckIcon}>🚚</Text>
                            <Text numberOfLines={1} style={styles.cardTrackingSummaryText}>
                                {order.shipping_summary || 'Tracking available'}
                            </Text>
                        </View>
                        <Pressable
                            hitSlop={8}
                            onPress={(e) => {
                                e.stopPropagation();
                                if (order.tracking_url) {
                                    Linking.openURL(order.tracking_url).catch(() => {
                                        Alert.alert('Notice', 'Could not open tracking link.');
                                    });
                                }
                            }}
                            style={styles.cardTrackBtn}
                        >
                            <Text style={styles.cardTrackBtnText}>Track ↗</Text>
                        </Pressable>
                    </View>
                ) : order.shipping_summary ? (
                    <View style={styles.shippingSummaryRow}>
                        <Text style={styles.truckIcon}>🚚</Text>
                        <Text numberOfLines={1} style={styles.shippingSummaryText}>
                            {order.shipping_summary}
                        </Text>
                    </View>
                ) : null}

                {/* ── Hairline ─────────────────────────────────── */}
                <View style={styles.hairline} />

                {/* ── Row 3: Product preview + total + chevron ───── */}
                <View style={styles.productSummaryRow}>
                    <OrderCategoryThumbnail item={primaryItem} />

                    <View style={styles.productInfoCol}>
                        <Text numberOfLines={1} style={styles.productName}>
                            {primaryItem?.product_name || 'Prescription Order'}
                        </Text>
                        {extraCount > 0 && (
                            <Text style={styles.extraCount}>
                                +{extraCount} more item{extraCount > 1 ? 's' : ''}
                            </Text>
                        )}
                    </View>

                    <View style={styles.totalWrap}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>
                            ${Number(order.total_amount).toFixed(2)}
                        </Text>
                    </View>

                    <Text style={styles.chevron}>›</Text>
                </View>
            </Pressable>

            {/* ── Row 4: PayID Pending Payment Banner (Inline) ───── */}
            {isPendingPayId && (
                <View style={styles.payIdCard}>
                    <View style={styles.payIdTopRow}>
                        <View style={styles.bankIconCircle}>
                            <Text style={styles.bankIcon}>🏛️</Text>
                        </View>
                        <View style={styles.payIdTitleCol}>
                            <Text style={styles.payIdTitle}>Payment Pending</Text>
                            <Text style={styles.payIdSub}>
                                Transfer{' '}
                                <Text style={styles.boldText}>
                                    ${Number(order.total_amount).toFixed(2)}
                                </Text>{' '}
                                using reference{' '}
                                <Text style={styles.monoRef}>
                                    {order.payid_reference || order.uuid}
                                </Text>
                            </Text>
                        </View>
                    </View>

                    {/* Reference Copy Action */}
                    <View style={styles.refRow}>
                        <View>
                            <Text style={styles.refLabel}>Your Reference</Text>
                            <Text style={styles.refCode}>
                                {order.payid_reference || order.uuid}
                            </Text>
                        </View>
                        <Pressable
                            hitSlop={8}
                            onPress={() => copyReference(order.payid_reference || order.uuid)}
                            style={styles.copyBtn}
                        >
                            <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
                        </Pressable>
                    </View>

                    {/* Action button */}
                    <Pressable
                        onPress={() => onPressOrder(order)}
                        style={({ pressed }) => [styles.payIdActionBtn, pressed && styles.cardPressed]}
                    >
                        <Text style={styles.payIdActionBtnText}>View & Complete Payment</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    bankIcon: {
        fontSize: 14,
    },
    bankIconCircle: {
        alignItems: 'center',
        backgroundColor: '#dbeafe',
        borderRadius: radii.full,
        height: 28,
        justifyContent: 'center',
        width: 28,
    },
    boldText: {
        fontWeight: '700',
    },
    card: {
        backgroundColor: colors.surfaceCardBg,
        borderColor: colors.surfaceCardBorder,
        borderRadius: radii.xl,
        borderWidth: 1,
        marginBottom: spacing.md,
        overflow: 'hidden',
        ...shadows.tier1,
    },
    cardPressed: {
        opacity: 0.85,
    },
    chevron: {
        color: colors.mutedForeground,
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 4,
    },
    copyBtn: {
        borderColor: 'rgba(14, 48, 23, 0.3)',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    copyBtnText: {
        color: colors.primaryGreen,
        fontSize: 11,
        fontWeight: '600',
    },
    extraCount: {
        color: colors.mutedForeground,
        fontSize: 11,
        marginTop: 2,
    },
    hairline: {
        backgroundColor: colors.border,
        height: 1,
        marginVertical: 10,
    },
    headerRow: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    monoRef: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: '700',
    },
    orderDate: {
        color: colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    orderUuid: {
        color: colors.foreground,
        fontSize: 15,
        fontWeight: '700',
    },
    payIdActionBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.lg,
        justifyContent: 'center',
        marginTop: 8,
        paddingVertical: 10,
    },
    payIdActionBtnText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    payIdCard: {
        backgroundColor: '#eff6ff',
        borderTopColor: '#bfdbfe',
        borderTopWidth: 1,
        gap: 8,
        padding: spacing.md,
    },
    payIdSub: {
        color: '#1d4ed8',
        fontSize: 11,
        lineHeight: 16,
        marginTop: 2,
    },
    payIdTitle: {
        color: '#1e3a8a',
        fontSize: 13,
        fontWeight: '700',
    },
    payIdTitleCol: {
        flex: 1,
    },
    payIdTopRow: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        gap: 10,
    },
    pressableContainer: {
        padding: spacing.md,
    },
    productInfoCol: {
        flex: 1,
        paddingRight: 8,
    },
    productName: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '600',
    },
    productSummaryRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    refCode: {
        color: colors.foreground,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 13,
        fontWeight: '700',
    },
    refLabel: {
        color: '#64748b',
        fontSize: 10,
    },
    refRow: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        borderRadius: radii.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    shippingSummaryRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
    },
    shippingSummaryText: {
        color: colors.mutedForeground,
        fontSize: 12,
    },
    cardTrackingRow: {
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        borderRadius: radii.md,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    cardTrackingLeft: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        gap: 6,
        paddingRight: 6,
    },
    cardTrackingSummaryText: {
        color: '#166534',
        fontSize: 11,
        fontWeight: '600',
    },
    cardTrackBtn: {
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.full,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    cardTrackBtnText: {
        color: colors.white,
        fontSize: 11,
        fontWeight: '700',
    },
    thumbnailBox: {
        alignItems: 'center',
        backgroundColor: colors.surfaceCardBg,
        borderRadius: radii.md,
        height: 42,
        justifyContent: 'center',
        overflow: 'hidden',
        width: 42,
    },
    thumbnailImage: {
        height: '85%',
        width: '85%',
    },
    thumbnailPlaceholder: {
        fontSize: 18,
    },
    titleCol: {
        flex: 1,
        paddingRight: 8,
    },
    totalLabel: {
        color: colors.mutedForeground,
        fontSize: 10,
        textAlign: 'right',
    },
    totalValue: {
        color: colors.foreground,
        fontSize: 15,
        fontWeight: '700',
    },
    totalWrap: {
        alignItems: 'flex-end',
    },
    truckIcon: {
        fontSize: 12,
    },
});
