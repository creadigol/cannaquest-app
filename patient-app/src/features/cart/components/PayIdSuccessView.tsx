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
    const amount = Number(feeBreakdown?.total ?? orderInfo.totalAmount ?? 0);

    const payIdAddress = feeBreakdown?.payidDetails?.address || 'payments@cannaquest.com.au';
    const payIdBsb = feeBreakdown?.payidDetails?.bsb || '082356';
    const payIdAccount = feeBreakdown?.payidDetails?.accountNumber || '775600933';
    const payIdAccountName = feeBreakdown?.payidDetails?.accountName || 'CannaQuest Australia Pty Ltd';
    const expiryHours = Number(feeBreakdown?.payidDetails?.expiryHours || 72);

    // Live ticker for accurate second-by-second countdown & progress
    const [nowMs, setNowMs] = useState(Date.now());
    React.useEffect(() => {
        const timer = setInterval(() => {
            setNowMs(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Calculate dynamic cutoff from payid_expiry_hours
    const orderCreatedAt = (orderInfo as any).createdAt || (orderInfo as any).created_at
        ? new Date((orderInfo as any).createdAt || (orderInfo as any).created_at).getTime()
        : nowMs;
    const expiryDate = new Date(orderCreatedAt + expiryHours * 60 * 60 * 1000);
    const expiryMs = expiryDate.getTime();
    const diffMs = Math.max(0, expiryMs - nowMs);
    const totalDurationMs = Math.max(1, expiryMs - orderCreatedAt);
    const elapsedMs = Math.max(0, nowMs - orderCreatedAt);
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

    const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secondsRemaining = Math.floor((diffMs % (1000 * 60)) / 1000);
    const isExpired = diffMs <= 0;
    const isUrgent = hoursRemaining < 24 && !isExpired;
    const isCritical = hoursRemaining < 4 && !isExpired;

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

    const countdownText = isExpired
        ? 'Cutoff reached'
        : hoursRemaining >= 24
        ? `${Math.ceil(hoursRemaining / 24)} days (${hoursRemaining}h)`
        : `${hoursRemaining}h ${minutesRemaining}m ${secondsRemaining}s`;

    return (
        <View style={styles.card}>
            {/* Header Badge & Title */}
            <View style={styles.badgeWrapper}>
                <View style={styles.iconCircleOuter}>
                    <View style={styles.iconCircleInner}>
                        <Text style={styles.iconBank}>🏛️</Text>
                    </View>
                </View>
                <View style={styles.statusSuccessPill}>
                    <Text style={styles.statusSuccessPillText}>✓ Order Created</Text>
                </View>
            </View>

            <Text style={styles.title}>Order Placed via PayID</Text>
            <Text style={styles.subtitle}>
                Order #{orderInfo.orderUuid || orderInfo.orderId || ref} has been confirmed and is awaiting bank transfer.
            </Text>

            {/* ── Expiry / Deadline Timeline Card (Live Progress) ── */}
            <View style={[
                styles.deadlineCard,
                isCritical && styles.deadlineCardCritical,
                isExpired && styles.deadlineCardExpired,
            ]}>
                <View style={styles.deadlineHeader}>
                    <View style={[
                        styles.clockIconWrap,
                        isCritical && styles.clockIconWrapCritical,
                        isExpired && styles.clockIconWrapExpired,
                    ]}>
                        <Text style={styles.clockIcon}>{isExpired ? '⌛' : isCritical ? '🔥' : '⏳'}</Text>
                    </View>
                    <View style={styles.deadlineTitleWrap}>
                        <Text style={[
                            styles.deadlineTitle,
                            isCritical && styles.deadlineTitleCritical,
                            isExpired && styles.deadlineTitleExpired,
                        ]}>
                            {isExpired ? 'Payment Window Expired' : 'Payment Window Active'}
                        </Text>
                        <Text style={styles.deadlineNumberDays}>
                            {isExpired ? 'Order placement window has closed' : `Pay within ${countdownText}`}
                        </Text>
                    </View>
                    <View style={[
                        styles.urgentPill,
                        !isUrgent && !isExpired && styles.urgentPillNormal,
                        isCritical && styles.urgentPillCritical,
                        isExpired && styles.urgentPillExpired,
                    ]}>
                        <Text style={[
                            styles.urgentPillText,
                            !isUrgent && !isExpired && styles.urgentPillTextNormal,
                            isCritical && styles.urgentPillTextCritical,
                            isExpired && styles.urgentPillTextExpired,
                        ]}>
                            {isExpired ? 'Expired' : isCritical ? 'Critical' : isUrgent ? 'Closing Soon' : 'Active'}
                        </Text>
                    </View>
                </View>

                {/* Visual Timeline Bar */}
                <View style={styles.timelineTrack}>
                    <View style={[
                        styles.timelineTrackActive,
                        { width: `${progressPercent}%` },
                        !isUrgent && !isExpired && styles.timelineTrackNormal,
                        isCritical && styles.timelineTrackCritical,
                        isExpired && styles.timelineTrackExpired,
                    ]} />
                    {!isExpired && progressPercent > 4 && progressPercent < 97 && (
                        <View style={[
                            styles.timelineMarker,
                            { left: `${progressPercent}%` },
                            isCritical && styles.timelineMarkerCritical,
                        ]} />
                    )}
                </View>

                {/* Timeline dates row */}
                <View style={styles.timelineLabelsRow}>
                    <View style={styles.timelineLabelCol}>
                        <Text style={styles.timelineSubLabel}>Placed On</Text>
                        <Text style={styles.timelineMainLabel}>Today</Text>
                    </View>
                    <View style={styles.alignCenter}>
                        <Text style={styles.timelineSubLabel}>Timeline</Text>
                        <Text style={styles.timelineElapsedLabel}>{progressPercent}% elapsed</Text>
                    </View>
                    <View style={[styles.timelineLabelCol, styles.alignRight]}>
                        <Text style={styles.timelineSubLabel}>Payment Deadline</Text>
                        <Text style={[
                            styles.timelineDeadlineText,
                            isCritical && styles.timelineDeadlineTextCritical,
                            isExpired && styles.timelineDeadlineTextExpired,
                        ]}>
                            {formattedExpiryDate} · {formattedExpiryTime}
                        </Text>
                    </View>
                </View>

                <Text style={styles.timelineDisclaimer}>
                    {isExpired
                        ? 'Reserved dispensary stock has been automatically released back to inventory.'
                        : 'If payment is not received by this cutoff, reserved prescription items will be released back to pharmacy inventory.'}
                </Text>
            </View>

            {/* ── PayID / Bank Transfer Instructions Box (Clean, Elegant Card) ── */}
            <View style={styles.payIdPanel}>
                <View style={styles.payIdHeader}>
                    <View style={styles.payIdIconCircle}>
                        <Text style={styles.payIdIcon}>🏛️</Text>
                    </View>
                    <View style={styles.payIdHeaderTextCol}>
                        <Text style={styles.payIdHeaderTitle}>PayID / Direct Bank Transfer</Text>
                        <Text style={styles.payIdHeaderSub}>
                            Transfer the exact amount using your unique reference below.
                        </Text>
                    </View>
                    <View style={styles.feeFreeBadge}>
                        <Text style={styles.feeFreeText}>No Card Surcharge</Text>
                    </View>
                </View>

                {/* PayID Address */}
                <View style={styles.copyDetailCard}>
                    <Text style={styles.copyDetailLabel}>PayID Identifier</Text>
                    <View style={styles.copyDetailValueRow}>
                        <Text style={styles.copyDetailValueText}>{payIdAddress}</Text>
                        <Pressable
                            hitSlop={8}
                            onPress={() => copyToClipboard(payIdAddress, 'payid-addr')}
                            style={({ pressed }) => [
                                styles.copyPillBtn,
                                copiedKey === 'payid-addr' && styles.copyPillBtnCopied,
                                pressed && styles.pressed,
                            ]}
                        >
                            <Text style={[
                                styles.copyPillText,
                                copiedKey === 'payid-addr' && styles.copyPillTextCopied,
                            ]}>
                                {copiedKey === 'payid-addr' ? '✓ Copied' : 'Copy'}
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
                            style={({ pressed }) => [
                                styles.copyPillBtn,
                                copiedKey === 'account-name' && styles.copyPillBtnCopied,
                                pressed && styles.pressed,
                            ]}
                        >
                            <Text style={[
                                styles.copyPillText,
                                copiedKey === 'account-name' && styles.copyPillTextCopied,
                            ]}>
                                {copiedKey === 'account-name' ? '✓ Copied' : 'Copy'}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* BSB + Account */}
                <View style={styles.twoColRow}>
                    <View style={[styles.copyDetailCard, styles.flex1]}>
                        <Text style={styles.copyDetailLabel}>BSB</Text>
                        <View style={styles.copyDetailValueRow}>
                            <Text style={styles.copyDetailValueText}>{payIdBsb}</Text>
                            <Pressable
                                hitSlop={8}
                                onPress={() => copyToClipboard(payIdBsb, 'bsb')}
                                style={({ pressed }) => [
                                    styles.copyPillBtn,
                                    copiedKey === 'bsb' && styles.copyPillBtnCopied,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <Text style={[
                                    styles.copyPillText,
                                    copiedKey === 'bsb' && styles.copyPillTextCopied,
                                ]}>
                                    {copiedKey === 'bsb' ? '✓' : 'Copy'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                    <View style={[styles.copyDetailCard, styles.flex1]}>
                        <Text style={styles.copyDetailLabel}>Account Number</Text>
                        <View style={styles.copyDetailValueRow}>
                            <Text style={styles.copyDetailValueText}>{payIdAccount}</Text>
                            <Pressable
                                hitSlop={8}
                                onPress={() => copyToClipboard(payIdAccount, 'acc-num')}
                                style={({ pressed }) => [
                                    styles.copyPillBtn,
                                    copiedKey === 'acc-num' && styles.copyPillBtnCopied,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <Text style={[
                                    styles.copyPillText,
                                    copiedKey === 'acc-num' && styles.copyPillTextCopied,
                                ]}>
                                    {copiedKey === 'acc-num' ? '✓' : 'Copy'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Amount + Reference */}
                <View style={styles.twoColRow}>
                    <View style={[styles.copyDetailCard, styles.flex1, styles.amountHighlightCard]}>
                        <Text style={styles.amountLabelHighlight}>Total Amount Due</Text>
                        <Text style={styles.amountDueText}>
                            ${amount > 0 ? amount.toFixed(2) : '0.00'}
                        </Text>
                    </View>
                    <View style={[styles.copyDetailCard, styles.flex1, styles.referenceHighlightCard]}>
                        <Text style={styles.refLabelHighlight}>Your Reference</Text>
                        <View style={styles.copyDetailValueRow}>
                            <Text numberOfLines={1} style={styles.monoRefText}>{ref}</Text>
                            <Pressable
                                hitSlop={8}
                                onPress={() => copyToClipboard(ref, 'ref')}
                                style={({ pressed }) => [
                                    styles.copyPillBtnRef,
                                    copiedKey === 'ref' && styles.copyPillBtnCopied,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <Text style={[
                                    styles.copyPillTextRef,
                                    copiedKey === 'ref' && styles.copyPillTextCopied,
                                ]}>
                                    {copiedKey === 'ref' ? '✓ Copied' : 'Copy'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                <View style={styles.importantNoteBox}>
                    <Text style={styles.importantNoteText}>
                        <Text style={styles.boldText}>Required Step: </Text>
                        Please input <Text style={styles.boldReference}>{ref}</Text> into your banking app's description/reference field so your payment can be matched automatically.
                    </Text>
                </View>

                {/* Mark as Paid Action Button (Hidden if Expired) */}
                {!isExpired && (
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
                        <Text style={styles.markAsPaidIcon}>{hasMarkedPaid ? '✓' : '💳'}</Text>
                        <Text style={styles.markAsPaidText}>
                            {hasMarkedPaid ? 'Payment Submitted for Verification' : "I've Made the Payment"}
                        </Text>
                    </Pressable>
                )}
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
    alignCenter: {
        alignItems: 'center',
    },
    alignRight: {
        alignItems: 'flex-end',
    },
    amountDueText: {
        color: '#1e3a8a',
        fontSize: 20,
        fontWeight: '800',
        marginTop: 3,
        letterSpacing: -0.5,
    },
    amountHighlightCard: {
        backgroundColor: '#f8fafc',
        borderColor: '#cbd5e1',
    },
    amountLabelHighlight: {
        color: '#475569',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    badgeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    boldReference: {
        color: '#1e3a8a',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: '800',
    },
    boldText: {
        color: '#1e3a8a',
        fontWeight: '700',
    },
    breakdownLabel: {
        color: colors.foreground,
        fontSize: 13,
    },
    breakdownRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    breakdownVal: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '600',
    },
    card: {
        alignItems: 'center',
        backgroundColor: colors.surfaceCardBg,
        borderColor: colors.surfaceCardBorder,
        borderRadius: radii.xxl,
        borderWidth: 1,
        marginTop: spacing.sm,
        padding: spacing.lg,
        ...shadows.tier2,
    },
    clockIcon: {
        fontSize: 16,
    },
    clockIconWrap: {
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        borderColor: '#fde68a',
        borderRadius: radii.full,
        borderWidth: 1,
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    clockIconWrapCritical: {
        backgroundColor: '#ffedd5',
        borderColor: '#fed7aa',
    },
    clockIconWrapExpired: {
        backgroundColor: '#fee2e2',
        borderColor: '#fecaca',
    },
    copyDetailCard: {
        backgroundColor: colors.white,
        borderColor: '#e2e8f0',
        borderRadius: radii.lg,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        ...shadows.tier1,
    },
    copyDetailLabel: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    copyDetailValueRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    copyDetailValueText: {
        color: '#0f172a',
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
        marginRight: 8,
    },
    copyPillBtn: {
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    copyPillBtnCopied: {
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
    },
    copyPillBtnRef: {
        alignItems: 'center',
        backgroundColor: '#dbeafe',
        borderColor: '#93c5fd',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    copyPillText: {
        color: '#475569',
        fontSize: 11,
        fontWeight: '700',
    },
    copyPillTextCopied: {
        color: '#15803d',
    },
    copyPillTextRef: {
        color: '#1d4ed8',
        fontSize: 11,
        fontWeight: '700',
    },
    deadlineCard: {
        backgroundColor: '#fffdf5',
        borderColor: '#fef08a',
        borderRadius: radii.xl,
        borderWidth: 1,
        gap: 10,
        marginVertical: spacing.md,
        padding: spacing.md,
        width: '100%',
        ...shadows.tier1,
    },
    deadlineCardCritical: {
        backgroundColor: '#fff7ed',
        borderColor: '#fed7aa',
    },
    deadlineCardExpired: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
    },
    deadlineHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
    },
    deadlineNumberDays: {
        color: '#92400e',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 1,
    },
    deadlineTitle: {
        color: '#78350f',
        fontSize: 14,
        fontWeight: '800',
    },
    deadlineTitleCritical: {
        color: '#c2410c',
    },
    deadlineTitleExpired: {
        color: '#b91c1c',
    },
    deadlineTitleWrap: {
        flex: 1,
    },
    feeFreeBadge: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 9,
        paddingVertical: 3,
    },
    feeFreeText: {
        color: '#059669',
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
        backgroundColor: '#f0fdf4',
        borderRadius: 26,
        height: 52,
        justifyContent: 'center',
        width: 52,
    },
    iconCircleOuter: {
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        borderRadius: 34,
        height: 68,
        justifyContent: 'center',
        width: 68,
    },
    importantNoteBox: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
        borderRadius: radii.lg,
        borderWidth: 1,
        padding: 12,
    },
    importantNoteText: {
        color: '#1e40af',
        fontSize: 12,
        lineHeight: 18,
    },
    markAsPaidButton: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.xl,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        marginTop: 6,
        paddingVertical: 14,
        ...shadows.tier2,
    },
    markAsPaidButtonSuccess: {
        backgroundColor: '#047857',
    },
    markAsPaidIcon: {
        color: colors.white,
        fontSize: 15,
        fontWeight: '700',
    },
    markAsPaidText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    monoRefText: {
        color: '#1e3a8a',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    payIdHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        paddingBottom: 2,
    },
    payIdHeaderTextCol: {
        flex: 1,
        gap: 2,
    },
    payIdHeaderSub: {
        color: '#64748b',
        fontSize: 12,
        lineHeight: 16,
    },
    payIdHeaderTitle: {
        color: '#0f172a',
        fontSize: 15,
        fontWeight: '800',
    },
    payIdIcon: {
        fontSize: 18,
    },
    payIdIconCircle: {
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderColor: '#e2e8f0',
        borderRadius: radii.full,
        borderWidth: 1,
        height: 38,
        justifyContent: 'center',
        width: 38,
    },
    payIdPanel: {
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: radii.xl,
        borderWidth: 1,
        gap: 10,
        padding: spacing.md,
        width: '100%',
        ...shadows.tier1,
    },
    pressed: {
        opacity: 0.8,
        transform: [{ scale: 0.99 }],
    },
    primaryBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.xl,
        justifyContent: 'center',
        paddingVertical: 15,
        width: '100%',
        ...shadows.tier2,
    },
    primaryBtnText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    referenceHighlightCard: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    refLabelHighlight: {
        color: '#1d4ed8',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    secondaryBtn: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: '#e2e8f0',
        borderRadius: radii.xl,
        borderWidth: 1,
        justifyContent: 'center',
        paddingVertical: 14,
        width: '100%',
    },
    secondaryBtnText: {
        color: '#334155',
        fontSize: 13,
        fontWeight: '700',
    },
    statusSuccessPill: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        borderRadius: radii.full,
        borderWidth: 1,
        marginTop: 6,
        paddingHorizontal: 10,
        paddingVertical: 2,
    },
    statusSuccessPillText: {
        color: '#059669',
        fontSize: 11,
        fontWeight: '700',
    },
    subtitle: {
        color: '#64748b',
        fontSize: 13,
        lineHeight: 19,
        marginTop: 4,
        textAlign: 'center',
        paddingHorizontal: spacing.sm,
    },
    summaryCard: {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderRadius: radii.xl,
        borderWidth: 1,
        marginTop: spacing.md,
        padding: spacing.md,
        width: '100%',
        ...shadows.tier1,
    },
    summaryCardTitle: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    summaryDivider: {
        backgroundColor: '#f1f5f9',
        height: 1,
        marginVertical: 8,
    },
    summaryTotalLabel: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    summaryTotalRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 4,
    },
    summaryTotalVal: {
        color: '#0f172a',
        fontSize: 18,
        fontWeight: '800',
    },
    timelineDeadlineText: {
        color: '#b45309',
        fontSize: 12,
        fontWeight: '800',
    },
    timelineDeadlineTextCritical: {
        color: '#c2410c',
    },
    timelineDeadlineTextExpired: {
        color: '#dc2626',
    },
    timelineDisclaimer: {
        color: '#92400e',
        fontSize: 10,
        fontStyle: 'italic',
        lineHeight: 14,
        marginTop: 3,
    },
    timelineElapsedLabel: {
        color: '#b45309',
        fontSize: 11,
        fontWeight: '700',
    },
    timelineLabelCol: {
        gap: 2,
    },
    timelineLabelsRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    timelineMainLabel: {
        color: colors.foreground,
        fontSize: 12,
        fontWeight: '700',
    },
    timelineMarker: {
        backgroundColor: '#ffffff',
        borderColor: '#d97706',
        borderRadius: radii.full,
        borderWidth: 2,
        height: 14,
        marginLeft: -7,
        marginTop: -3,
        position: 'absolute',
        top: 0,
        width: 14,
        ...shadows.tier1,
    },
    timelineMarkerCritical: {
        borderColor: '#ea580c',
    },
    timelineSubLabel: {
        color: '#78350f',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    timelineTrack: {
        backgroundColor: '#fef3c7',
        borderColor: 'rgba(217, 119, 6, 0.25)',
        borderRadius: radii.full,
        borderWidth: 1,
        height: 8,
        overflow: 'visible',
        position: 'relative',
        width: '100%',
    },
    timelineTrackActive: {
        backgroundColor: '#f59e0b',
        borderRadius: radii.full,
        height: '100%',
    },
    timelineTrackCritical: {
        backgroundColor: '#ea580c',
    },
    timelineTrackExpired: {
        backgroundColor: '#dc2626',
    },
    timelineTrackNormal: {
        backgroundColor: '#10b981',
    },
    title: {
        color: colors.foreground,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    twoColRow: {
        flexDirection: 'row',
        gap: 8,
    },
    urgentPill: {
        backgroundColor: '#fef3c7',
        borderColor: '#fde68a',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 9,
        paddingVertical: 3,
    },
    urgentPillCritical: {
        backgroundColor: '#ffedd5',
        borderColor: '#fed7aa',
    },
    urgentPillExpired: {
        backgroundColor: '#fee2e2',
        borderColor: '#fca5a5',
    },
    urgentPillNormal: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
    },
    urgentPillText: {
        color: '#b45309',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    urgentPillTextCritical: {
        color: '#c2410c',
    },
    urgentPillTextExpired: {
        color: '#dc2626',
    },
    urgentPillTextNormal: {
        color: '#059669',
    },
    waivedText: {
        color: '#059669',
        fontSize: 11,
        fontWeight: '600',
    },
    zeroFeeRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
    },
});
