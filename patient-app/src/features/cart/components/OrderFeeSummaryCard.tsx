import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { FeeBreakdown, ShippingMethod } from '../api/cart.types';

interface Props {
    feeBreakdown: FeeBreakdown | null;
    shippingMethod: ShippingMethod;
    paymentMethod: 'card' | 'payid';
}

export function OrderFeeSummaryCard({ feeBreakdown, shippingMethod, paymentMethod }: Props) {
    if (!feeBreakdown) return null;

    const isPickup = shippingMethod === 'pickup';
    const isPayId = paymentMethod === 'payid';

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>ORDER SUMMARY</Text>

            <View style={styles.row}>
                <Text style={styles.label}>Subtotal</Text>
                <Text style={styles.value}>${Number(feeBreakdown.subtotal).toFixed(2)}</Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>Shipping</Text>
                {isPickup ? (
                    <Text style={styles.freeBadge}>Free (Pickup)</Text>
                ) : (
                    <Text style={styles.value}>${Number(feeBreakdown.shippingFee).toFixed(2)}</Text>
                )}
            </View>

            {Number(feeBreakdown.platformFee ?? 0) > 0 && (
                <View style={styles.row}>
                    <Text style={styles.label}>Platform Fee</Text>
                    <Text style={styles.value}>${Number(feeBreakdown.platformFee).toFixed(2)}</Text>
                </View>
            )}

            {Number(feeBreakdown.pharmacistFee ?? 0) > 0 && (
                <View style={styles.row}>
                    <Text style={styles.label}>Pharmacist Fee</Text>
                    <Text style={styles.value}>${Number(feeBreakdown.pharmacistFee).toFixed(2)}</Text>
                </View>
            )}

            {Number(feeBreakdown.tax ?? 0) > 0 && (
                <View style={styles.row}>
                    <Text style={styles.label}>GST (10%)</Text>
                    <Text style={styles.value}>${Number(feeBreakdown.tax).toFixed(2)}</Text>
                </View>
            )}

            <View style={styles.row}>
                <Text style={styles.label}>Payment Processing Fee</Text>
                {isPayId ? (
                    <View style={styles.payIdWaivedRow}>
                        <Text style={styles.freeBadge}>0% Fees</Text>
                        <Text style={styles.waivedText}>(Waived!)</Text>
                    </View>
                ) : (
                    <Text style={styles.value}>
                        ${Number(feeBreakdown.paymentGatewayCost ?? 0).toFixed(2)}
                    </Text>
                )}
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${Number(feeBreakdown.total).toFixed(2)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surfaceCardBg,
        borderColor: colors.surfaceCardBorder,
        borderRadius: radii.xl,
        borderWidth: 1,
        gap: 8,
        marginTop: spacing.md,
        padding: spacing.md,
        ...shadows.tier1,
    },
    cardTitle: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    divider: {
        backgroundColor: colors.border,
        height: 1,
        marginVertical: 4,
    },
    freeBadge: {
        color: colors.statusEmerald,
        fontSize: 13,
        fontWeight: '700',
    },
    label: {
        color: colors.mutedForeground,
        fontSize: 13,
    },
    payIdWaivedRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    row: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalLabel: {
        color: colors.foreground,
        fontSize: 15,
        fontWeight: '700',
    },
    totalRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 2,
    },
    totalValue: {
        color: colors.foreground,
        fontSize: 18,
        fontWeight: '700',
    },
    value: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '600',
    },
    waivedText: {
        color: colors.statusEmerald,
        fontSize: 11,
        fontStyle: 'italic',
    },
});
