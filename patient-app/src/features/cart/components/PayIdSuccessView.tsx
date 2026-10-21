import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { FeeBreakdown, StartCheckoutResponse } from '../api/cart.types';

interface Props {
    orderInfo: StartCheckoutResponse;
    feeBreakdown?: FeeBreakdown | null;
    onViewOrder: () => void;
    onDone: () => void;
    onBackToCart?: () => void;
}

export function PayIdSuccessView({ orderInfo, feeBreakdown, onViewOrder, onDone, onBackToCart }: Props) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [hasMarkedPaid, setHasMarkedPaid] = useState(false);

    const copyToClipboard = (text: string, key: string) => {
        setCopiedKey(key);
        Alert.alert('Copied to Clipboard', text);
        setTimeout(() => setCopiedKey(null), 2500);
    };

    const ref = orderInfo.payidReference || orderInfo.referenceNumber || 'CQ-ORDER';
    const amount = Number(orderInfo.totalAmount ?? feeBreakdown?.total ?? 0);

    const payIdAddress = feeBreakdown?.payidDetails?.address || 'payments@cannaquest.com.au';
    const payIdBsb = feeBreakdown?.payidDetails?.bsb || '082356';
    const payIdAccount = feeBreakdown?.payidDetails?.accountNumber || '775600933';
    const payIdAccountName = feeBreakdown?.payidDetails?.accountName || 'CannaQuest Australia Pty Ltd';
    const expiryHours = Number(feeBreakdown?.payidDetails?.expiryHours || 72);

    // Calculate dynamic cutoff from payid_expiry_hours
    const now = new Date();
    const expiryDate = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
    const formattedExpiryDate = expiryDate.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    const formattedExpiryTime = expiryDate.toLocaleTimeString('en-AU', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
    const expiryDaysText = expiryHours >= 24
        ? `Pay within ${Math.round(expiryHours / 24)} days (${expiryHours}h)`
        : `Pay within ${expiryHours} hours`;

    return (
        <View style={styles.card}>
            {/* Header Badge & Title */}
            <View style={styles.badgeWrapper}>
                <View style={styles.iconCircleOuter}>
                    <View style={styles.iconCircleInner}>
                        <Text style={styles.iconBank}>🏛️</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.title}>Order Placed via PayID</Text>
            <Text style={styles.subtitle}>
                Order #{orderInfo.orderUuid || orderInfo.orderId || ref} has been created and is awaiting payment.
            </Text>

            {/* ── Expiry / Deadline Timeline Card ── */}
            <View style={styles.deadlineCard}>
                <View style={styles.deadlineHeader}>
                    <View style={styles.clockIconWrap}>
                        <Text style={styles.clockIcon}>⏳</Text>
                    </View>
                    <View style={styles.deadlineTitleWrap}>
                        <Text style={styles.deadlineTitle}>Payment Window Active</Text>
                        <Text style={styles.deadlineNumberDays}>{expiryDaysText}</Text>
                    </View>
                    <View style={styles.urgentPill}>
                        <Text style={styles.urgentPillText}>Expires Soon</Text>
                    </View>
                </View>

                {/* Visual Timeline Bar */}
                <View style={styles.timelineTrack}>
                    <View style={styles.timelineTrackActive} />
                </View>

                {/* Timeline dates row */}
                <View style={styles.timelineLabelsRow}>
                    <View style={styles.timelineLabelCol}>
                        <Text style={styles.timelineSubLabel}>Placed On</Text>
                        <Text style={styles.timelineMainLabel}>Today</Text>
                    </View>
                    <View style={[styles.timelineLabelCol, styles.alignRight]}>
                        <Text style={styles.timelineSubLabel}>Payment Deadline</Text>
                        <Text style={styles.timelineDeadlineText}>
                            {formattedExpiryDate} · {formattedExpiryTime}
                        </Text>
                    </View>
                </View>

                <Text style={styles.timelineDisclaimer}>
                    If payment is not received by this cutoff, reserved prescription items will be returned to dispensary stock.
                </Text>
            </View>

            {/* ── PayID / Bank Transfer Instructions Box (Clean Blue Card) ── */}
            <View style={styles.payIdPanel}>
                <View style={styles.payIdHeader}>
                    <View style={styles.payIdIconCircle}>
                        <Text style={styles.payIdIcon}>🏛️</Text>
                    </View>
                    <View style={styles.payIdHeaderTextCol}>
                        <Text style={styles.payIdHeaderTitle}>PayID / Bank Transfer</Text>
                        <Text style={styles.payIdHeaderSub}>
                            Transfer the exact amount using your reference number below.
                        </Text>
                    </View>
                    <View style={styles.feeFreeBadge}>
                        <Text style={styles.feeFreeText}>0% Fees</Text>
                    </View>
                </View>

                {/* PayID Address */}
                <View style={styles.copyDetailCard}>
                    <Text style={styles.copyDetailLabel}>PayID</Text>
                    <View style={styles.copyDetailValueRow}>
                        <Text style={styles.copyDetailValueText}>{payIdAddress}</Text>
                        <Pressable
                            hitSlop={8}
                            onPress={() => copyToClipboard(payIdAddress, 'payid-addr')}
                            style={({ pressed }) => [styles.copyPillBtn, pressed && styles.pressed]}
                        >
                            <Text style={styles.copyPillText}>
                                {copiedKey === 'payid-addr' ? 'Copied!' : 'Copy'}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Account Name */}
                <View style={styles.copyDetailCard}>
                    <Text style={styles.copyDetailLabel}>Account Name</Text>
                    <View style={styles.copyDetailValueRow}>
                        <Text style={styles.copyDetailValueText}>{payIdAccountName}</Text>
                        <Pressable
                            hitSlop={8}
                            onPress={() => copyToClipboard(payIdAccountName, 'account-name')}
                            style={({ pressed }) => [styles.copyPillBtn, pressed && styles.pressed]}
                        >
                            <Text style={styles.copyPillText}>
                                {copiedKey === 'account-name' ? 'Copied!' : 'Copy'}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* BSB + Account */}
                <View style={styles.twoColRow}>
                    <View style={[styles.copyDetailCard, styles.flex1]}>
                        <Text style={styles.copyDetailLabel}>BSB</Text>
                        <Text style={styles.copyDetailValueText}>{payIdBsb}</Text>
                    </View>
                    <View style={[styles.copyDetailCard, styles.flex1]}>
                        <Text style={styles.copyDetailLabel}>Account Number</Text>
                        <Text style={styles.copyDetailValueText}>{payIdAccount}</Text>
                    </View>
                </View>

                {/* Amount + Reference */}
                <View style={styles.twoColRow}>
                    <View style={[styles.copyDetailCard, styles.flex1]}>
                        <Text style={styles.copyDetailLabel}>Amount Due</Text>
                        <Text style={styles.amountDueText}>
                            ${amount > 0 ? amount.toFixed(2) : '0.00'}
                        </Text>
                    </View>
                    <View style={[styles.copyDetailCard, styles.flex1]}>
                        <Text style={styles.copyDetailLabel}>Your Reference</Text>
                        <View style={styles.copyDetailValueRow}>
                            <Text numberOfLines={1} style={styles.monoRefText}>{ref}</Text>
                            <Pressable
                                hitSlop={8}
                                onPress={() => copyToClipboard(ref, 'ref')}
                                style={({ pressed }) => [styles.copyPillBtn, pressed && styles.pressed]}
                            >
                                <Text style={styles.copyPillText}>
                                    {copiedKey === 'ref' ? 'Copied!' : 'Copy'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                <View style={styles.importantNoteBox}>
                    <Text style={styles.importantNoteText}>
                        <Text style={styles.boldText}>Important: </Text>
                        Include your reference number in the transaction description so we can match your payment.
                        Orders are processed once payment clears — typically same business day.
                    </Text>
                </View>

                {/* Mark as Paid Action Button */}
                <Pressable
                    onPress={() => {
                        setHasMarkedPaid(true);
                        Alert.alert('Payment Recorded', 'Thank you! We will verify your transfer and update your order status.');
                    }}
                    style={({ pressed }) => [
                        styles.markAsPaidButton,
                        hasMarkedPaid && styles.markAsPaidButtonSuccess,
                        pressed && styles.pressed,
                    ]}
                >
                    <Text style={styles.markAsPaidIcon}>✓</Text>
                    <Text style={styles.markAsPaidText}>
                        {hasMarkedPaid ? "Payment Submitted for Verification" : "I've Made the Payment"}
                    </Text>
                </Pressable>
            </View>

            {/* ── Itemized Order Breakdown Card ── */}
            {feeBreakdown && (
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardTitle}>ORDER SUMMARY BREAKDOWN</Text>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Subtotal</Text>
                        <Text style={styles.breakdownVal}>
                            ${Number(feeBreakdown.subtotal ?? 0).toFixed(2)}
                        </Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Shipping</Text>
                        <Text style={styles.breakdownVal}>
                            {Number(feeBreakdown.shippingFee ?? 0) > 0
                                ? `$${Number(feeBreakdown.shippingFee).toFixed(2)}`
                                : 'Free'}
                        </Text>
                    </View>

                    {Number(feeBreakdown.platformFee ?? 0) > 0 && (
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Platform fee</Text>
                            <Text style={styles.breakdownVal}>
                                ${Number(feeBreakdown.platformFee).toFixed(2)}
                            </Text>
                        </View>
                    )}

                    {Number(feeBreakdown.pharmacistFee ?? 0) > 0 && (
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Pharmacist fee</Text>
                            <Text style={styles.breakdownVal}>
                                ${Number(feeBreakdown.pharmacistFee).toFixed(2)}
                            </Text>
                        </View>
                    )}

                    {Number(feeBreakdown.tax ?? 0) > 0 && (
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>GST (10%)</Text>
                            <Text style={styles.breakdownVal}>
                                ${Number(feeBreakdown.tax).toFixed(2)}
                            </Text>
                        </View>
                    )}

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Payment Processing Fee</Text>
                        <View style={styles.zeroFeeRow}>
                            <View style={styles.feeFreeBadge}>
                                <Text style={styles.feeFreeText}>0% Fees</Text>
                            </View>
                            <Text style={styles.waivedText}>(Waived for PayID!)</Text>
                        </View>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryTotalRow}>
                        <Text style={styles.summaryTotalLabel}>Total Amount Due</Text>
                        <Text style={styles.summaryTotalVal}>
                            ${amount > 0 ? amount.toFixed(2) : Number(feeBreakdown.total ?? 0).toFixed(2)}
                        </Text>
                    </View>
                </View>
            )}

            {/* ── Navigation Actions ── */}
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
        gap: 10,
        marginTop: spacing.md,
        width: '100%',
    },
    alignRight: {
        alignItems: 'flex-end',
    },
    amountDueText: {
        color: '#1e3a8a',
        fontSize: 18,
        fontWeight: '800',
        marginTop: 2,
    },
    badgeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    boldText: {
        fontWeight: '700',
    },
    card: {
        alignItems: 'center',
        backgroundColor: colors.surfaceCardBg,
        borderColor: colors.surfaceCardBorder,
        borderRadius: radii.xxl,
        borderWidth: 1,
        marginTop: spacing.sm,
        padding: spacing.md,
        ...shadows.tier2,
    },
    clockIcon: {
        fontSize: 16,
    },
    clockIconWrap: {
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        borderRadius: radii.full,
        height: 32,
        justifyContent: 'center',
        width: 32,
    },
    copyDetailCard: {
        backgroundColor: colors.white,
        borderColor: '#bfdbfe',
        borderRadius: radii.lg,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    copyDetailLabel: {
        color: '#1d4ed8',
        fontSize: 11,
        fontWeight: '600',
    },
    copyDetailValueRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    copyDetailValueText: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    copyPillBtn: {
        backgroundColor: '#dbeafe',
        borderRadius: radii.full,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    copyPillText: {
        color: '#1d4ed8',
        fontSize: 11,
        fontWeight: '700',
    },
    deadlineCard: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        borderRadius: radii.xl,
        borderWidth: 1,
        gap: 8,
        marginVertical: spacing.sm,
        padding: spacing.md,
        width: '100%',
    },
    deadlineHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    deadlineDeadlineText: {
        color: '#b45309',
        fontSize: 12,
        fontWeight: '800',
    },
    deadlineNumberDays: {
        color: '#92400e',
        fontSize: 12,
        fontWeight: '600',
    },
    deadlineTitle: {
        color: '#78350f',
        fontSize: 13,
        fontWeight: '700',
    },
    deadlineTitleWrap: {
        flex: 1,
    },
    feeFreeBadge: {
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    feeFreeText: {
        color: '#15803d',
        fontSize: 11,
        fontWeight: '700',
    },
    flex1: {
        flex: 1,
    },
    iconBank: {
        fontSize: 28,
    },
    iconCircleInner: {
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        borderRadius: 24,
        height: 48,
        justifyContent: 'center',
        width: 48,
    },
    iconCircleOuter: {
        alignItems: 'center',
        backgroundColor: '#dbeafe',
        borderRadius: 30,
        height: 60,
        justifyContent: 'center',
        width: 60,
    },
    importantNoteBox: {
        backgroundColor: '#dbeafe',
        borderRadius: radii.lg,
        padding: 10,
    },
    importantNoteText: {
        color: '#1e40af',
        fontSize: 11,
        lineHeight: 16,
    },
    markAsPaidButton: {
        alignItems: 'center',
        backgroundColor: '#059669',
        borderRadius: radii.xl,
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'center',
        marginTop: 4,
        paddingVertical: 12,
    },
    markAsPaidButtonSuccess: {
        backgroundColor: '#047857',
    },
    markAsPaidIcon: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    markAsPaidText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    monoRefText: {
        color: colors.foreground,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 13,
        fontWeight: '700',
    },
    payIdHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    payIdHeaderTextCol: {
        flex: 1,
        gap: 2,
    },
    payIdHeaderSub: {
        color: '#1d4ed8',
        fontSize: 11,
    },
    payIdHeaderTitle: {
        color: '#1e3a8a',
        fontSize: 14,
        fontWeight: '700',
    },
    payIdIcon: {
        fontSize: 16,
    },
    payIdIconCircle: {
        alignItems: 'center',
        backgroundColor: '#dbeafe',
        borderRadius: radii.full,
        height: 34,
        justifyContent: 'center',
        width: 34,
    },
    payIdPanel: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
        borderRadius: radii.xl,
        borderWidth: 1,
        gap: 10,
        padding: spacing.md,
        width: '100%',
    },
    pressed: {
        opacity: 0.8,
    },
    primaryBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.xl,
        justifyContent: 'center',
        paddingVertical: 14,
        width: '100%',
    },
    primaryBtnText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    secondaryBtn: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: radii.xl,
        borderWidth: 1,
        justifyContent: 'center',
        paddingVertical: 13,
        width: '100%',
    },
    secondaryBtnText: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '600',
    },
    subtitle: {
        color: colors.mutedForeground,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
        textAlign: 'center',
    },
    timelineDeadlineText: {
        color: '#b45309',
        fontSize: 12,
        fontWeight: '800',
    },
    timelineDisclaimer: {
        color: '#92400e',
        fontSize: 10,
        fontStyle: 'italic',
        lineHeight: 14,
        marginTop: 2,
    },
    timelineLabelCol: {
        gap: 2,
    },
    timelineLabelsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    timelineMainLabel: {
        color: colors.foreground,
        fontSize: 12,
        fontWeight: '700',
    },
    timelineSubLabel: {
        color: '#78350f',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    timelineTrack: {
        backgroundColor: '#fde68a',
        borderRadius: radii.full,
        height: 6,
        overflow: 'hidden',
        width: '100%',
    },
    timelineTrackActive: {
        backgroundColor: '#d97706',
        borderRadius: radii.full,
        height: '100%',
        width: '35%',
    },
    title: {
        color: colors.foreground,
        fontSize: 20,
        fontWeight: '700',
    },
    twoColRow: {
        flexDirection: 'row',
        gap: 8,
    },
    urgentPill: {
        backgroundColor: '#fee2e2',
        borderColor: '#fca5a5',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    urgentPillText: {
        color: '#b91c1c',
        fontSize: 10,
        fontWeight: '700',
    },
    summaryCard: {
        backgroundColor: '#ffffff',
        borderColor: colors.border,
        borderRadius: radii.xl,
        borderWidth: 1,
        marginTop: spacing.md,
        padding: spacing.md,
        width: '100%',
        ...shadows.tier1,
    },
    summaryCardTitle: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
    },
    breakdownLabel: {
        color: colors.foreground,
        fontSize: 13,
    },
    breakdownVal: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '600',
    },
    zeroFeeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    waivedText: {
        color: colors.statusEmerald,
        fontSize: 11,
        fontWeight: '600',
    },
    summaryDivider: {
        backgroundColor: colors.border,
        height: 1,
        marginVertical: 8,
    },
    summaryTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
    },
    summaryTotalLabel: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    summaryTotalVal: {
        color: '#1e3a8a',
        fontSize: 17,
        fontWeight: '800',
    },
});
