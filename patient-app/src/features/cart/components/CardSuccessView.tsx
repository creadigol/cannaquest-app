import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme/tokens';
import type { StartCheckoutResponse } from '../api/cart.types';

interface Props {
    orderInfo: StartCheckoutResponse;
    onViewOrder: () => void;
    onDone: () => void;
    onBackToCart?: () => void;
}

export function CardSuccessView({ orderInfo, onViewOrder, onDone, onBackToCart }: Props) {
    const orderRef = orderInfo.orderUuid || orderInfo.orderId || orderInfo.referenceNumber || 'CQ-ORDER';
    const amount = Number(orderInfo.totalAmount ?? 0);

    return (
        <View style={styles.card}>
            {/* Animated / Vibrant Green Check Badge */}
            <View style={styles.badgeWrapper}>
                <View style={styles.iconCircleOuter}>
                    <View style={styles.iconCircleInner}>
                        <Text style={styles.iconCheck}>✓</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.subtitle}>
                Your order #{orderRef} has been confirmed and forwarded to the fulfilling pharmacy for dispensing.
            </Text>

            {/* Receipt Summary Box */}
            <View style={styles.receiptBox}>
                <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Order Number</Text>
                    <Text style={styles.receiptValue}>#{orderRef}</Text>
                </View>

                {amount > 0 ? (
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Total Paid</Text>
                        <Text style={styles.receiptAmount}>${amount.toFixed(2)} AUD</Text>
                    </View>
                ) : null}

                <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Payment Method</Text>
                    <View style={styles.pillBadge}>
                        <Text style={styles.pillText}>Credit / Debit Card</Text>
                    </View>
                </View>

                <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Status</Text>
                    <View style={[styles.pillBadge, styles.paidBadge]}>
                        <Text style={styles.paidBadgeText}>● Confirmed</Text>
                    </View>
                </View>
            </View>

            {/* Dispensary Fulfillment Notice */}
            <View style={styles.noticeBox}>
                <Text style={styles.noticeIcon}>📦</Text>
                <View style={styles.noticeTextWrap}>
                    <Text style={styles.noticeTitle}>What happens next?</Text>
                    <Text style={styles.noticeDesc}>
                        The dispensing pharmacist will review and verify your prescription. You will receive real-time dispatch updates and tracking via SMS/email.
                    </Text>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <Pressable
                    onPress={onViewOrder}
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                >
                    <Text style={styles.primaryBtnText}>View My Orders →</Text>
                </Pressable>

                {onBackToCart && (
                    <Pressable
                        onPress={onBackToCart}
                        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                    >
                        <Text style={styles.secondaryBtnText}>Back to Cart</Text>
                    </Pressable>
                )}

                <Pressable
                    onPress={onDone}
                    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                >
                    <Text style={styles.secondaryBtnText}>Back to Home</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    actions: {
        gap: 12,
        marginTop: spacing.md,
        width: '100%',
    },
    badgeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    card: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        borderRadius: radii.xxl,
        borderWidth: 1,
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
        ...shadows.tier2,
    },
    iconCheck: {
        color: '#ffffff',
        fontFamily: typography.extraBold,
        fontSize: 32,
        lineHeight: 36,
    },
    iconCircleInner: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.full,
        height: 56,
        justifyContent: 'center',
        width: 56,
    },
    iconCircleOuter: {
        alignItems: 'center',
        backgroundColor: 'rgba(14, 48, 23, 0.12)',
        borderRadius: radii.full,
        height: 76,
        justifyContent: 'center',
        width: 76,
    },
    noticeBox: {
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 10,
        marginBottom: spacing.sm,
        padding: spacing.md,
        width: '100%',
    },
    noticeDesc: {
        color: colors.mutedForeground,
        fontFamily: typography.regular,
        fontSize: 12,
        lineHeight: 18,
        marginTop: 2,
    },
    noticeIcon: {
        fontSize: 20,
    },
    noticeTextWrap: {
        flex: 1,
    },
    noticeTitle: {
        color: colors.foreground,
        fontFamily: typography.semiBold,
        fontSize: 13,
    },
    paidBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderColor: 'rgba(34, 197, 94, 0.25)',
    },
    paidBadgeText: {
        color: '#15803d',
        fontFamily: typography.bold,
        fontSize: 11,
    },
    pillBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderColor: 'rgba(0, 0, 0, 0.08)',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    pillText: {
        color: colors.foreground,
        fontFamily: typography.medium,
        fontSize: 11,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    primaryBtn: {
        alignItems: 'center',
        backgroundColor: colors.accentLime,
        borderRadius: radii.xl,
        justifyContent: 'center',
        paddingVertical: 15,
        width: '100%',
        ...shadows.tier2,
    },
    primaryBtnText: {
        color: '#064e3b',
        fontFamily: typography.extraBold,
        fontSize: 15,
        letterSpacing: 0.3,
    },
    receiptAmount: {
        color: colors.primaryGreen,
        fontFamily: typography.extraBold,
        fontSize: 15,
    },
    receiptBox: {
        backgroundColor: '#fafafa',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        borderRadius: radii.xl,
        borderWidth: 1,
        gap: 12,
        marginVertical: spacing.md,
        padding: spacing.md,
        width: '100%',
    },
    receiptLabel: {
        color: colors.mutedForeground,
        fontFamily: typography.medium,
        fontSize: 12,
    },
    receiptRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    receiptValue: {
        color: colors.foreground,
        fontFamily: typography.bold,
        fontSize: 13,
    },
    secondaryBtn: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: radii.xl,
        borderWidth: 1,
        justifyContent: 'center',
        paddingVertical: 14,
        width: '100%',
    },
    secondaryBtnText: {
        color: colors.foreground,
        fontFamily: typography.semiBold,
        fontSize: 13,
    },
    subtitle: {
        color: colors.mutedForeground,
        fontFamily: typography.regular,
        fontSize: 13,
        lineHeight: 19,
        marginTop: 6,
        textAlign: 'center',
    },
    title: {
        color: colors.foreground,
        fontFamily: typography.extraBold,
        fontSize: 22,
        textAlign: 'center',
    },
});
