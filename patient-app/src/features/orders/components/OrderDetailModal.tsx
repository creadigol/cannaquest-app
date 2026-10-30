import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import { OrderStatusPill } from './OrderStatusPill';
import { OrderCategoryThumbnail } from './OrderCard';
import { claimPayIdPayment } from '../api/orders.api';
import type { OrderDetail, OrderProgressStep } from '../api/orders.types';

interface Props {
    visible: boolean;
    order: OrderDetail | null;
    onClose: () => void;
    onRefreshNeeded?: () => void;
}

export function OrderDetailModal({ visible, order, onClose, onRefreshNeeded }: Props) {
    const [breakdownOpen, setBreakdownOpen] = useState(true);
    const [showPayIdDetails, setShowPayIdDetails] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [nowMs, setNowMs] = useState(Date.now());

    const isPayid = order?.payment_method === 'payid';

    // Live ticker for time tracking
    useEffect(() => {
        if (!visible || !isPayid) return;
        const interval = setInterval(() => {
            setNowMs(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, [visible, isPayid]);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.25,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    if (!order) return null;

    const copyToClipboard = (text: string, key: string) => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1800);
        Alert.alert('Copied to clipboard', text);
    };

    const handleClaimPayId = async () => {
        setIsClaiming(true);
        try {
            await claimPayIdPayment(order.uuid);
            Alert.alert('Payment Recorded', "Thank you! We've noted your payment and will verify it promptly.");
            onRefreshNeeded?.();
            onClose();
        } catch (error) {
            console.error('[OrderDetailModal] Claim error:', error);
            Alert.alert('Notice', 'Could not record payment. Please check your network or try again.');
        } finally {
            setIsClaiming(false);
        }
    };

    // Calculate current step badge
    const steps = order.progress_steps || [];
    const currentStep =
        steps.find((s) => s.status === 'current') ??
        steps.find((s) => s.status === 'ended') ??
        steps[steps.length - 1];

    const currentStepColor =
        currentStep?.status === 'completed'
            ? 'emerald'
            : currentStep?.status === 'current'
            ? 'amber'
            : currentStep?.status === 'ended' || currentStep?.status === 'failed'
            ? 'red'
            : 'gray';

    const orderItems = order.items || [];
    const isPickup = order.is_pickup ?? false;
    const payIdExpiryHours = order.payid_settings?.payid_expiry_hours || 72;

    const createdTimeMs = order.created_at ? new Date(order.created_at).getTime() : nowMs;
    const computedExpiryTime = order.payid_expires_at 
        ? new Date(order.payid_expires_at).getTime()
        : (order.created_at ? createdTimeMs + payIdExpiryHours * 60 * 60 * 1000 : null);
    
    const isExpired = ['11', 'PAYID_EXPIRED', '3', 'CANCELLED', '5'].includes(String(order.status || '')) ||
        (isPayid && computedExpiryTime !== null && computedExpiryTime <= nowMs && order.status !== '2' && order.status !== 'PAID');
    const canPay = !isExpired && (order.can_pay ?? (isPayid && (order.status === '1' || order.status === 'SUBMITTED')));

    // Elapsed percentage and countdown for PayID payment window
    const totalDurationMs = computedExpiryTime && createdTimeMs ? Math.max(1, computedExpiryTime - createdTimeMs) : (payIdExpiryHours * 3600 * 1000);
    const elapsedMs = Math.max(0, nowMs - createdTimeMs);
    const rawProgress = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));
    const progressPercent = isExpired ? 100 : Math.round(rawProgress);

    const msRemaining = computedExpiryTime ? Math.max(0, computedExpiryTime - nowMs) : 0;
    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const secondsRemaining = Math.floor((msRemaining % (1000 * 60)) / 1000);

    const isUrgent = !isExpired && msRemaining < (24 * 60 * 60 * 1000); // under 24 hours
    const isCritical = !isExpired && msRemaining < (4 * 60 * 60 * 1000); // under 4 hours

    let countdownBadgeText = 'Active Window';
    if (isExpired) {
        countdownBadgeText = 'Window Expired';
    } else if (hoursRemaining > 24) {
        const days = Math.floor(hoursRemaining / 24);
        countdownBadgeText = `${days}d ${hoursRemaining % 24}h remaining`;
    } else if (hoursRemaining > 0) {
        countdownBadgeText = `${hoursRemaining}h ${minutesRemaining}m remaining`;
    } else if (minutesRemaining > 0) {
        countdownBadgeText = `${minutesRemaining}m ${secondsRemaining}s remaining`;
    } else {
        countdownBadgeText = `${secondsRemaining}s remaining`;
    }

    // Pricing breakdown fallback
    const subtotal = order.breakdown?.subtotal ?? order.total_amount;
    const shippingFee = order.breakdown?.shippingFee ?? 0;
    const platformFee = order.breakdown?.platformFee ?? 0;
    const pharmacistFee = order.breakdown?.pharmacistFee ?? 0;
    const tax = order.breakdown?.tax ?? 0;
    const paymentGatewayCost = order.breakdown?.paymentGatewayCost ?? 0;

    const payIdAddress = order.payid_settings?.payid_address || 'payments@cannaquest.com.au';
    const payIdBsb = order.payid_settings?.payid_bsb || '082356';
    const payIdAccount = order.payid_settings?.payid_account_number || '775600933';
    const payIdAccountName = order.payid_settings?.payid_account_name || 'CannaQuest Australia Pty Ltd';
    const payIdRef = order.payid_reference || order.uuid;

    return (
        <Modal
            animationType="slide"
            presentationStyle="pageSheet"
            transparent={false}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* ── Modal Header ─────────────────────────────────── */}
                <View style={styles.header}>
                    <Pressable
                        hitSlop={12}
                        onPress={onClose}
                        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                    >
                        <Text style={styles.backChevron}>‹</Text>
                        <Text style={styles.backButtonText}>Back to Orders</Text>
                    </Pressable>
                    <Pressable hitSlop={12} onPress={onClose} style={styles.closeIconBtn}>
                        <Text style={styles.closeIconText}>✕</Text>
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Order Title + Date ───────────────────────────── */}
                    <View style={styles.titleSection}>
                        <Text style={styles.titleOrderUuid}>Order {order.uuid}</Text>
                        <Text style={styles.placedDate}>
                            Placed on {new Date(order.created_at).toLocaleDateString('en-AU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </Text>
                    </View>

                    {/* ── 1. Status & Vertical Progress Steps Timeline ──── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.sectionHeaderLabel}>STATUS</Text>
                            <OrderStatusPill
                                color={currentStepColor}
                                label={currentStep?.name ?? order.status_config?.label ?? 'In Progress'}
                            />
                        </View>

                        <View style={styles.timelineWrap}>
                            {steps.map((step: OrderProgressStep, i: number) => {
                                const isLast = i === steps.length - 1;
                                const isCompleted = step.status === 'completed';
                                const isCurrent = step.status === 'current';
                                const isEnded = step.status === 'ended' || step.status === 'failed';

                                let iconSymbol = '○';
                                let circleBg = '#f1f5f9';
                                let iconColor = '#94a3b8';

                                if (isCompleted) {
                                    iconSymbol = '✓';
                                    circleBg = '#15a05a';
                                    iconColor = colors.white;
                                } else if (isCurrent) {
                                    iconSymbol = '⏳';
                                    circleBg = '#ecfdf5';
                                    iconColor = colors.primaryGreen;
                                } else if (isEnded) {
                                    iconSymbol = '✕';
                                    circleBg = '#fee2e2';
                                    iconColor = '#e23c3c';
                                }

                                return (
                                    <View key={`${step.name}-${i}`} style={styles.timelineItem}>
                                        <View style={styles.timelineLeftCol}>
                                            <View style={styles.timelineNodeWrapper}>
                                                {isCurrent && (
                                                    <Animated.View
                                                        style={[
                                                            styles.timelinePulseRing,
                                                            {
                                                                transform: [{ scale: pulseAnim }],
                                                                opacity: pulseAnim.interpolate({
                                                                    inputRange: [1, 1.25],
                                                                    outputRange: [0.65, 0],
                                                                }),
                                                            },
                                                        ]}
                                                    />
                                                )}
                                                <View
                                                    style={[
                                                        styles.timelineIconCircle,
                                                        { backgroundColor: circleBg },
                                                        isCurrent && styles.timelineIconCircleCurrent,
                                                        isCompleted && styles.timelineIconCircleCompleted,
                                                    ]}
                                                >
                                                    <Text style={[styles.timelineIconText, { color: iconColor }]}>
                                                        {iconSymbol}
                                                    </Text>
                                                </View>
                                            </View>
                                            {!isLast && (
                                                <View
                                                    style={[
                                                        styles.timelineLine,
                                                        isCompleted && styles.timelineLineCompleted,
                                                    ]}
                                                />
                                            )}
                                        </View>
                                        <View style={[styles.timelineRightCol, isLast && styles.timelineRightColLast]}>
                                            <Text
                                                style={[
                                                    styles.timelineStepName,
                                                    isCurrent && styles.timelineStepCurrent,
                                                    step.status === 'pending' && styles.timelineStepPending,
                                                ]}
                                            >
                                                {step.name}
                                            </Text>
                                            {step.completed_at && (
                                                <Text style={styles.timelineStepDate}>
                                                    {new Date(step.completed_at).toLocaleString('en-AU', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                    })}
                                                </Text>
                                            )}
                                            {step.completed_by && (
                                                <Text style={styles.timelineStepBy}>by {step.completed_by}</Text>
                                            )}
                                            {/* Show tracking banner when this step is Approved & Shipped and has tracking URL */}
                                            {step.name.toLowerCase().includes('shipped') &&
                                                (step.status === 'completed' || step.status === 'current') &&
                                                order.tracking_url && (
                                                    <View style={styles.stepTrackingBanner}>
                                                        <View style={styles.stepTrackingBannerHeader}>
                                                            <Text style={styles.stepTrackingIcon}>📦</Text>
                                                            <Text style={styles.stepTrackingTitle}>Delivery Tracking Active</Text>
                                                        </View>
                                                        <Text numberOfLines={1} style={styles.stepTrackingUrlText}>
                                                            {order.tracking_url}
                                                        </Text>
                                                        <View style={styles.stepTrackingButtonsRow}>
                                                            <Pressable
                                                                onPress={() => {
                                                                    if (order.tracking_url) {
                                                                        Linking.openURL(order.tracking_url).catch(() => {
                                                                            Alert.alert('Notice', 'Could not open tracking URL.');
                                                                        });
                                                                    }
                                                                }}
                                                                style={({ pressed }) => [styles.trackOnlineBtn, pressed && styles.pressed]}
                                                            >
                                                                <Text style={styles.trackOnlineBtnText}>Track Shipment ↗</Text>
                                                            </Pressable>
                                                            <Pressable
                                                                onPress={() => copyToClipboard(order.tracking_url!, 'step-tracking')}
                                                                style={({ pressed }) => [styles.copyTrackingBtn, pressed && styles.pressed]}
                                                            >
                                                                <Text style={styles.copyTrackingBtnText}>
                                                                    {copiedKey === 'step-tracking' ? 'Copied!' : 'Copy Link'}
                                                                </Text>
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* ── 2. Order Items ───────────────────────────────── */}
                    {orderItems.length > 0 && (
                        <View style={styles.sectionWrap}>
                            <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
                            <View style={[styles.card, styles.p0]}>
                                {orderItems.map((item, idx) => (
                                    <View
                                        key={`${item.id}-${idx}`}
                                        style={[styles.itemRow, idx < orderItems.length - 1 && styles.hairline]}
                                    >
                                        <OrderCategoryThumbnail item={item} />
                                        <View style={styles.itemDetails}>
                                            <Text numberOfLines={2} style={styles.itemName}>
                                                {item.product_name}
                                            </Text>
                                            {item.brand ? (
                                                <Text style={styles.itemBrand}>{item.brand}</Text>
                                            ) : null}
                                            {item.dispenser_name ? (
                                                <Text style={styles.itemDispenser}>
                                                    Dispenser: {item.dispenser_name}
                                                </Text>
                                            ) : null}
                                            <Text style={styles.itemPriceQty}>
                                                Qty: {item.quantity} · ${Number(item.unit_price).toFixed(2)} each
                                            </Text>
                                            {item.disapproval_reason ? (
                                                <Text style={styles.disapprovalReason}>
                                                    {item.disapproval_reason}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <Text style={styles.itemTotal}>
                                            ${Number(item.amount).toFixed(2)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── 3. Order Summary & Pricing Breakdown ─────────── */}
                    <View style={styles.sectionWrap}>
                        <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
                        <View style={styles.card}>
                            <View style={styles.summaryTotalRow}>
                                <Text style={styles.summaryTotalLabel}>Total amount</Text>
                                <Text style={styles.summaryTotalValue}>
                                    ${Number(order.total_amount).toFixed(2)}
                                </Text>
                            </View>

                            <Pressable
                                hitSlop={8}
                                onPress={() => setBreakdownOpen(!breakdownOpen)}
                                style={styles.toggleBreakdownBtn}
                            >
                                <Text style={styles.toggleBreakdownText}>
                                    {breakdownOpen ? 'Hide breakdown' : 'View breakdown'}
                                </Text>
                                <Text style={styles.toggleBreakdownChevron}>
                                    {breakdownOpen ? '▲' : '▼'}
                                </Text>
                            </Pressable>

                            {breakdownOpen && (
                                <View style={styles.breakdownList}>
                                    <View style={styles.breakdownRow}>
                                        <Text style={styles.breakdownLabel}>Subtotal</Text>
                                        <Text style={styles.breakdownVal}>${Number(subtotal).toFixed(2)}</Text>
                                    </View>

                                    <View style={styles.breakdownRow}>
                                        <Text style={styles.breakdownLabel}>Shipping</Text>
                                        {isPickup ? (
                                            <Text style={styles.freeBadge}>Free (Pickup)</Text>
                                        ) : (
                                            <Text style={styles.breakdownVal}>
                                                {shippingFee > 0 ? `$${Number(shippingFee).toFixed(2)}` : 'Free'}
                                            </Text>
                                        )}
                                    </View>

                                    {platformFee > 0 && (
                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>Platform fee</Text>
                                            <Text style={styles.breakdownVal}>${Number(platformFee).toFixed(2)}</Text>
                                        </View>
                                    )}

                                    {pharmacistFee > 0 && (
                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>Pharmacist fee</Text>
                                            <Text style={styles.breakdownVal}>${Number(pharmacistFee).toFixed(2)}</Text>
                                        </View>
                                    )}

                                    {tax > 0 && (
                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>GST (10%)</Text>
                                            <Text style={styles.breakdownVal}>${Number(tax).toFixed(2)}</Text>
                                        </View>
                                    )}

                                    <View style={styles.breakdownRow}>
                                        <Text style={styles.breakdownLabel}>Payment Processing Fee</Text>
                                        {isPayid ? (
                                            <View style={styles.payIdWaivedRow}>
                                                <Text style={styles.freeBadge}>0% Fees</Text>
                                                <Text style={styles.waivedText}>(Waived!)</Text>
                                            </View>
                                        ) : paymentGatewayCost > 0 ? (
                                            <Text style={styles.breakdownVal}>${Number(paymentGatewayCost).toFixed(2)}</Text>
                                        ) : (
                                            <Text style={styles.breakdownVal}>$0.00</Text>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* ── 4. Delivery / Pickup Information ─────────────── */}
                    <View style={styles.sectionWrap}>
                        <Text style={styles.sectionTitle}>
                            {isPickup ? 'PICKUP INFORMATION' : 'DELIVERY INFORMATION'}
                        </Text>
                        <View style={styles.card}>
                            <View style={styles.gridTwoCols}>
                                <View style={styles.gridCell}>
                                    <Text style={styles.fieldLabel}>CUSTOMER</Text>
                                    <Text style={styles.fieldVal}>{order.customer_name || 'Patient'}</Text>
                                </View>
                                <View style={styles.gridCell}>
                                    <Text style={styles.fieldLabel}>PHONE</Text>
                                    <Text style={styles.fieldVal}>{order.customer_phone || '—'}</Text>
                                </View>
                            </View>

                            <View style={styles.fieldRow}>
                                <Text style={styles.fieldLabel}>
                                    {isPickup ? 'PICKUP LOCATION' : 'SHIPPING ADDRESS'}
                                </Text>
                                <Text style={styles.fieldVal}>
                                    {isPickup
                                        ? order.pickup_location || 'Designated Partner Dispensary'
                                        : order.customer_address || 'Standard Registered Address'}
                                </Text>
                            </View>

                            {order.reference_number && (
                                <View style={styles.fieldRow}>
                                    <Text style={styles.fieldLabel}>REFERENCE NUMBER</Text>
                                    <Text style={[styles.fieldVal, styles.monoVal]}>
                                        {order.reference_number}
                                    </Text>
                                </View>
                            )}

                            {/* Tracking URL */}
                            {order.tracking_url && !isPickup && (
                                <View style={styles.trackingBox}>
                                    <Text style={styles.trackingBoxTitle}>TRACKING URL</Text>
                                    <View style={styles.trackingLinkRow}>
                                        <Text numberOfLines={1} style={styles.trackingLinkText}>
                                            {order.tracking_url}
                                        </Text>
                                        <Pressable
                                            onPress={() => copyToClipboard(order.tracking_url!, 'tracking')}
                                            style={styles.copyPillBtn}
                                        >
                                            <Text style={styles.copyPillText}>
                                                {copiedKey === 'tracking' ? 'Copied!' : 'Copy'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            )}

                            {/* Consignments */}
                            {order.consignments && order.consignments.length > 0 && (
                                <View style={styles.consignmentsContainer}>
                                    <Text style={styles.fieldLabel}>CONSIGNMENT TRACKING</Text>
                                    {order.consignments.map((con, index) => (
                                        <View key={con.id ?? index} style={styles.consignmentCard}>
                                            <View style={styles.consignmentHeader}>
                                                <Text style={styles.consignmentTitle}>
                                                    Shipment {index + 1}
                                                </Text>
                                                {con.shipped_at && (
                                                    <Text style={styles.consignmentDate}>
                                                        Shipped {new Date(con.shipped_at).toLocaleDateString()}
                                                    </Text>
                                                )}
                                            </View>
                                            {con.tracking_url && (
                                                <View style={styles.trackingLinkRow}>
                                                    <Text numberOfLines={1} style={styles.trackingLinkText}>
                                                        {con.tracking_url}
                                                    </Text>
                                                    <Pressable
                                                        onPress={() => copyToClipboard(con.tracking_url!, `con-${index}`)}
                                                        style={styles.copyPillBtn}
                                                    >
                                                        <Text style={styles.copyPillText}>
                                                            {copiedKey === `con-${index}` ? 'Copied!' : 'Copy'}
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            )}
                                            {con.notes && (
                                                <Text style={styles.consignmentNotes}>{con.notes}</Text>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* ── 5. PayID Expired Banner (if expired) ────────────── */}
                    {isExpired && isPayid && (
                        <View style={[styles.payIdPanel, { borderColor: '#ef4444', backgroundColor: '#fef2f2' }]}>
                            <View style={styles.payIdHeader}>
                                <View style={[styles.payIdIconCircle, { backgroundColor: '#fee2e2' }]}>
                                    <Text style={[styles.payIdIcon, { color: '#dc2626' }]}>✕</Text>
                                </View>
                                <View style={styles.payIdHeaderTextCol}>
                                    <Text style={[styles.payIdHeaderTitle, { color: '#991b1b' }]}>PayID Expired</Text>
                                    <Text style={[styles.payIdHeaderSub, { color: '#b91c1c' }]}>
                                        Order Cancelled (No Payment Received)
                                    </Text>
                                </View>
                                <View style={[styles.feeFreeBadge, { backgroundColor: '#fee2e2' }]}>
                                    <Text style={[styles.feeFreeText, { color: '#dc2626' }]}>Expired</Text>
                                </View>
                            </View>

                            {/* Payment Expiry Timeline showing closed window */}
                            <View style={[styles.payIdDeadlineContainer, styles.payIdDeadlineContainerExpired]}>
                                <View style={styles.payIdDeadlineTop}>
                                    <View style={[styles.payIdDeadlineClockWrap, styles.payIdDeadlineClockWrapExpired]}>
                                        <Text style={styles.payIdDeadlineClock}>⌛</Text>
                                    </View>
                                    <View style={styles.payIdDeadlineTextWrap}>
                                        <Text style={[styles.payIdDeadlineTitle, styles.payIdDeadlineTitleExpired]}>
                                            Payment Window Closed
                                        </Text>
                                        <Text style={[styles.payIdDeadlineDays, styles.payIdDeadlineDaysExpired]}>
                                            Cutoff reached — order cancelled
                                        </Text>
                                    </View>
                                    <View style={[styles.payIdUrgentPill, styles.payIdUrgentPillExpired]}>
                                        <Text style={[styles.payIdUrgentPillText, styles.payIdUrgentPillTextExpired]}>
                                            Window Expired
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.payIdTimelineTrack}>
                                    <View style={[styles.payIdTimelineTrackFill, styles.payIdTimelineTrackFillExpired, { width: '100%' }]} />
                                </View>

                                <View style={styles.payIdTimelineLabels}>
                                    <View>
                                        <Text style={styles.payIdTimelineSub}>Placed</Text>
                                        <Text style={styles.payIdTimelineVal}>
                                            {new Date(order.created_at).toLocaleDateString('en-AU', {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </Text>
                                    </View>
                                    <View style={styles.alignCenter}>
                                        <Text style={styles.payIdTimelineSub}>Window Progress</Text>
                                        <Text style={styles.payIdTimelineElapsedText}>100% elapsed</Text>
                                    </View>
                                    <View style={styles.alignEnd}>
                                        <Text style={styles.payIdTimelineSub}>Payment Cutoff</Text>
                                        <Text style={[styles.payIdTimelineDeadlineHighlight, styles.payIdTimelineDeadlineHighlightExpired]}>
                                            {computedExpiryTime ? new Date(computedExpiryTime).toLocaleDateString('en-AU', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                            }) + ' · ' + new Date(computedExpiryTime).toLocaleTimeString('en-AU', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true,
                                            }) : 'Cutoff Reached'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.importantNoteBox, { backgroundColor: '#ffffff', borderColor: '#fecaca' }]}>
                                <Text style={[styles.importantNoteText, { color: '#7f1d1d' }]}>
                                    The payment window for this PayID order has expired. No payment was received within the required window, so order placement has stopped and reserved prescriptions have been released. Please place a new order if you would like to proceed.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* ── 5. PayID Inline Instructions Panel (if applicable) ─ */}
                    {!isExpired && canPay && isPayid && showPayIdDetails && (
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

                            {/* Payment Expiry Timeline */}
                            <View style={[
                                styles.payIdDeadlineContainer,
                                isExpired && styles.payIdDeadlineContainerExpired,
                                isCritical && !isExpired && styles.payIdDeadlineContainerCritical,
                            ]}>
                                <View style={styles.payIdDeadlineTop}>
                                    <View style={[
                                        styles.payIdDeadlineClockWrap,
                                        isExpired && styles.payIdDeadlineClockWrapExpired,
                                        isCritical && !isExpired && styles.payIdDeadlineClockWrapCritical,
                                    ]}>
                                        <Text style={styles.payIdDeadlineClock}>
                                            {isExpired ? '⌛' : isCritical ? '🔥' : '⏳'}
                                        </Text>
                                    </View>
                                    <View style={styles.payIdDeadlineTextWrap}>
                                        <Text style={[
                                            styles.payIdDeadlineTitle,
                                            isExpired && styles.payIdDeadlineTitleExpired,
                                            isCritical && !isExpired && styles.payIdDeadlineTitleCritical,
                                        ]}>
                                            {isExpired ? 'Payment Window Closed' : 'Payment Window Active'}
                                        </Text>
                                        <Text style={[
                                            styles.payIdDeadlineDays,
                                            isExpired && styles.payIdDeadlineDaysExpired,
                                            isCritical && !isExpired && styles.payIdDeadlineDaysCritical,
                                        ]}>
                                            {isExpired
                                                ? 'Cutoff reached — order cancelled'
                                                : hoursRemaining >= 24
                                                ? `Pay within ${Math.ceil(hoursRemaining / 24)} days (${hoursRemaining}h)`
                                                : `Pay within ${hoursRemaining}h ${minutesRemaining}m`}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.payIdUrgentPill,
                                        isExpired && styles.payIdUrgentPillExpired,
                                        isCritical && !isExpired && styles.payIdUrgentPillCritical,
                                        !isUrgent && !isExpired && styles.payIdUrgentPillActive,
                                    ]}>
                                        <Text style={[
                                            styles.payIdUrgentPillText,
                                            isExpired && styles.payIdUrgentPillTextExpired,
                                            isCritical && !isExpired && styles.payIdUrgentPillTextCritical,
                                            !isUrgent && !isExpired && styles.payIdUrgentPillTextActive,
                                        ]}>
                                            {countdownBadgeText}
                                        </Text>
                                    </View>
                                </View>

                                {/* Dynamic Visual Timeline Bar */}
                                <View style={styles.payIdTimelineTrack}>
                                    <View style={[
                                        styles.payIdTimelineTrackFill,
                                        { width: `${progressPercent}%` },
                                        isExpired && styles.payIdTimelineTrackFillExpired,
                                        isCritical && !isExpired && styles.payIdTimelineTrackFillCritical,
                                        !isUrgent && !isExpired && styles.payIdTimelineTrackFillNormal,
                                    ]} />
                                    {/* Elapsed progress marker */}
                                    {!isExpired && progressPercent > 5 && progressPercent < 98 && (
                                        <View style={[
                                            styles.payIdTimelineMarker,
                                            { left: `${progressPercent}%` },
                                            isCritical && styles.payIdTimelineMarkerCritical,
                                        ]} />
                                    )}
                                </View>

                                <View style={styles.payIdTimelineLabels}>
                                    <View>
                                        <Text style={styles.payIdTimelineSub}>Placed</Text>
                                        <Text style={styles.payIdTimelineVal}>
                                            {new Date(order.created_at).toLocaleDateString('en-AU', {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </Text>
                                    </View>
                                    <View style={styles.alignCenter}>
                                        <Text style={styles.payIdTimelineSub}>Window Progress</Text>
                                        <Text style={styles.payIdTimelineElapsedText}>
                                            {progressPercent}% elapsed
                                        </Text>
                                    </View>
                                    <View style={styles.alignEnd}>
                                        <Text style={styles.payIdTimelineSub}>Payment Cutoff</Text>
                                        <Text style={[
                                            styles.payIdTimelineDeadlineHighlight,
                                            isExpired && styles.payIdTimelineDeadlineHighlightExpired,
                                            isCritical && !isExpired && styles.payIdTimelineDeadlineHighlightCritical,
                                        ]}>
                                            {computedExpiryTime ? new Date(computedExpiryTime).toLocaleDateString('en-AU', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                            }) + ' · ' + new Date(computedExpiryTime).toLocaleTimeString('en-AU', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true,
                                            }) : '72 Hours'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* PayID Address */}
                            <View style={styles.copyDetailCard}>
                                <Text style={styles.copyDetailLabel}>PayID</Text>
                                <View style={styles.copyDetailValueRow}>
                                    <Text style={styles.copyDetailValueText}>{payIdAddress}</Text>
                                    <Pressable
                                        onPress={() => copyToClipboard(payIdAddress, 'payid-addr')}
                                        style={styles.copyPillBtn}
                                    >
                                        <Text style={styles.copyPillText}>
                                            {copiedKey === 'payid-addr' ? 'Copied!' : 'Copy'}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>

                            {/* Account Name */}
                            {payIdAccountName ? (
                                <View style={styles.copyDetailCard}>
                                    <Text style={styles.copyDetailLabel}>Account Name</Text>
                                    <Text style={styles.copyDetailValueText}>{payIdAccountName}</Text>
                                </View>
                            ) : null}

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
                                        ${Number(order.total_amount).toFixed(2)}
                                    </Text>
                                </View>
                                <View style={[styles.copyDetailCard, styles.flex1]}>
                                    <Text style={styles.copyDetailLabel}>Your Reference</Text>
                                    <View style={styles.copyDetailValueRow}>
                                        <Text style={styles.monoRefText}>{payIdRef}</Text>
                                        <Pressable
                                            onPress={() => copyToClipboard(payIdRef, 'ref')}
                                            style={styles.copyPillBtn}
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
                                    Include your reference number in the transaction description so we can
                                    match your payment. Orders are processed once payment clears — typically
                                    same business day.
                                </Text>
                            </View>

                            {/* Mark as Paid Action Button */}
                            <Pressable
                                disabled={isClaiming}
                                onPress={handleClaimPayId}
                                style={({ pressed }) => [
                                    styles.markAsPaidButton,
                                    pressed && styles.pressed,
                                    isClaiming && styles.btnDisabled,
                                ]}
                            >
                                {isClaiming ? (
                                    <ActivityIndicator color={colors.white} size="small" />
                                ) : (
                                    <>
                                        <Text style={styles.markAsPaidIcon}>✓</Text>
                                        <Text style={styles.markAsPaidText}>I've Made the Payment</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}

                    {/* ── 6. Primary Action Buttons ────────────────────── */}
                    <View style={styles.actionButtonsRow}>
                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                        >
                            <Text style={styles.secondaryBtnText}>Close</Text>
                        </Pressable>

                        {canPay && isPayid && (
                            <Pressable
                                onPress={() => setShowPayIdDetails(!showPayIdDetails)}
                                style={({ pressed }) => [styles.primaryPayBtn, pressed && styles.pressed]}
                            >
                                <Text style={styles.primaryPayBtnIcon}>🏛️</Text>
                                <Text style={styles.primaryPayBtnText}>
                                    {showPayIdDetails ? 'Hide Payment Details' : 'Pay via PayID'}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    actionButtonsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    amountDueText: {
        color: colors.primaryGreen,
        fontSize: 16,
        fontWeight: '700',
    },
    backButton: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    backButtonText: {
        color: colors.mutedForeground,
        fontSize: 14,
        fontWeight: '500',
    },
    backChevron: {
        color: colors.mutedForeground,
        fontSize: 22,
        lineHeight: 22,
    },
    boldText: {
        fontWeight: '700',
    },
    breakdownLabel: {
        color: colors.mutedForeground,
        fontSize: 13,
    },
    breakdownList: {
        borderTopColor: colors.border,
        borderTopWidth: 1,
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    breakdownVal: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '500',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    card: {
        backgroundColor: colors.surfaceCardBg,
        borderColor: colors.surfaceCardBorder,
        borderRadius: radii.xl,
        borderWidth: 1,
        padding: spacing.md,
        ...shadows.tier1,
    },
    cardHeaderRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    closeIconBtn: {
        alignItems: 'center',
        backgroundColor: colors.surfaceCardBg,
        borderRadius: radii.full,
        height: 32,
        justifyContent: 'center',
        width: 32,
    },
    closeIconText: {
        color: colors.mutedForeground,
        fontSize: 13,
        fontWeight: '700',
    },
    consignmentsContainer: {
        gap: 8,
        marginTop: 14,
    },
    consignmentCard: {
        backgroundColor: '#fffbeb',
        borderColor: '#fef3c7',
        borderRadius: radii.lg,
        borderWidth: 1,
        padding: 10,
    },
    consignmentDate: {
        color: '#92400e',
        fontSize: 11,
    },
    consignmentHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    consignmentNotes: {
        color: '#78350f',
        fontSize: 11,
        marginTop: 4,
    },
    consignmentTitle: {
        color: '#92400e',
        fontSize: 12,
        fontWeight: '700',
    },
    container: {
        backgroundColor: colors.background,
        flex: 1,
    },
    copyDetailCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderColor: '#bfdbfe',
        borderRadius: radii.lg,
        borderWidth: 1,
        gap: 4,
        padding: 10,
    },
    copyDetailLabel: {
        color: '#1d4ed8',
        fontSize: 11,
        fontWeight: '500',
    },
    copyDetailValueRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    copyDetailValueText: {
        color: colors.foreground,
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
    copyPillBtn: {
        borderColor: 'rgba(14, 48, 23, 0.25)',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    copyPillText: {
        color: colors.primaryGreen,
        fontSize: 10,
        fontWeight: '600',
    },
    disapprovalReason: {
        color: '#b91c1c',
        fontSize: 11,
        marginTop: 2,
    },
    feeFreeBadge: {
        backgroundColor: '#dcfce7',
        borderRadius: radii.full,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    feeFreeText: {
        color: '#065f46',
        fontSize: 10,
        fontWeight: '700',
    },
    fieldLabel: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    fieldRow: {
        gap: 2,
        marginTop: 10,
    },
    fieldVal: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    flex1: {
        flex: 1,
    },
    gridCell: {
        flex: 1,
        gap: 2,
    },
    gridTwoCols: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    hairline: {
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
    },
    header: {
        alignItems: 'center',
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 16 : 14,
        paddingBottom: 12,
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
    itemBrand: {
        color: colors.mutedForeground,
        fontSize: 11,
    },
    itemDetails: {
        flex: 1,
        gap: 2,
    },
    itemDispenser: {
        color: colors.mutedForeground,
        fontSize: 10,
    },
    itemName: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '700',
    },
    itemPriceQty: {
        color: colors.mutedForeground,
        fontSize: 11,
        marginTop: 2,
    },
    itemRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        padding: spacing.md,
    },
    itemTotal: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    markAsPaidButton: {
        alignItems: 'center',
        backgroundColor: '#059669',
        borderRadius: radii.xl,
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'center',
        paddingVertical: 12,
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
    monoVal: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    p0: {
        padding: 0,
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
    },
    alignCenter: {
        alignItems: 'center',
    },
    alignEnd: {
        alignItems: 'flex-end',
    },
    payIdDeadlineContainer: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        borderRadius: radii.xl,
        borderWidth: 1,
        gap: 10,
        padding: 12,
        ...shadows.tier1,
    },
    payIdDeadlineContainerCritical: {
        backgroundColor: '#fff7ed',
        borderColor: '#fdba74',
    },
    payIdDeadlineContainerExpired: {
        backgroundColor: '#fef2f2',
        borderColor: '#fca5a5',
    },
    payIdDeadlineTop: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    payIdDeadlineClockWrap: {
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        borderRadius: radii.full,
        height: 32,
        justifyContent: 'center',
        width: 32,
    },
    payIdDeadlineClockWrapCritical: {
        backgroundColor: '#ffedd5',
    },
    payIdDeadlineClockWrapExpired: {
        backgroundColor: '#fee2e2',
    },
    payIdDeadlineClock: {
        fontSize: 16,
    },
    payIdDeadlineTextWrap: {
        flex: 1,
        gap: 1,
    },
    payIdDeadlineTitle: {
        color: '#78350f',
        fontSize: 13,
        fontWeight: '700',
    },
    payIdDeadlineTitleCritical: {
        color: '#9a3412',
    },
    payIdDeadlineTitleExpired: {
        color: '#991b1b',
    },
    payIdDeadlineDays: {
        color: '#92400e',
        fontSize: 11,
        fontWeight: '600',
    },
    payIdDeadlineDaysCritical: {
        color: '#c2410c',
        fontWeight: '700',
    },
    payIdDeadlineDaysExpired: {
        color: '#b91c1c',
    },
    payIdUrgentPill: {
        backgroundColor: '#fee2e2',
        borderColor: '#fca5a5',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    payIdUrgentPillActive: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
    },
    payIdUrgentPillCritical: {
        backgroundColor: '#ffedd5',
        borderColor: '#fdba74',
    },
    payIdUrgentPillExpired: {
        backgroundColor: '#fef2f2',
        borderColor: '#fca5a5',
    },
    payIdUrgentPillText: {
        color: '#b91c1c',
        fontSize: 10,
        fontWeight: '700',
    },
    payIdUrgentPillTextActive: {
        color: '#047857',
    },
    payIdUrgentPillTextCritical: {
        color: '#c2410c',
    },
    payIdUrgentPillTextExpired: {
        color: '#dc2626',
    },
    payIdTimelineTrack: {
        backgroundColor: '#fef3c7',
        borderColor: 'rgba(217, 119, 6, 0.2)',
        borderRadius: radii.full,
        borderWidth: 1,
        height: 8,
        position: 'relative',
        width: '100%',
    },
    payIdTimelineTrackFill: {
        backgroundColor: '#f59e0b',
        borderRadius: radii.full,
        height: '100%',
    },
    payIdTimelineTrackFillNormal: {
        backgroundColor: '#10b981',
    },
    payIdTimelineTrackFillCritical: {
        backgroundColor: '#ea580c',
    },
    payIdTimelineTrackFillExpired: {
        backgroundColor: '#dc2626',
    },
    payIdTimelineMarker: {
        backgroundColor: '#ffffff',
        borderColor: '#d97706',
        borderRadius: radii.full,
        borderWidth: 2,
        height: 14,
        marginTop: -3,
        position: 'absolute',
        top: 0,
        width: 14,
        marginLeft: -7,
        ...shadows.tier1,
    },
    payIdTimelineMarkerCritical: {
        borderColor: '#c2410c',
    },
    payIdTimelineLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    payIdTimelineSub: {
        color: '#78350f',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    payIdTimelineVal: {
        color: colors.foreground,
        fontSize: 11,
        fontWeight: '700',
        marginTop: 1,
    },
    payIdTimelineElapsedText: {
        color: '#b45309',
        fontSize: 11,
        fontWeight: '700',
        marginTop: 1,
    },
    payIdTimelineDeadlineHighlight: {
        color: '#b45309',
        fontSize: 11,
        fontWeight: '800',
        marginTop: 1,
    },
    payIdTimelineDeadlineHighlightCritical: {
        color: '#c2410c',
    },
    payIdTimelineDeadlineHighlightExpired: {
        color: '#dc2626',
    },
    placedDate: {
        color: colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    pressed: {
        opacity: 0.8,
    },
    primaryPayBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.xl,
        flex: 2,
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'center',
        paddingVertical: 14,
    },
    primaryPayBtnIcon: {
        fontSize: 14,
    },
    primaryPayBtnText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    scrollContent: {
        gap: spacing.md,
        padding: spacing.md,
        paddingBottom: 40,
    },
    secondaryBtn: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: radii.xl,
        borderWidth: 1,
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 14,
    },
    secondaryBtnText: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '600',
    },
    sectionHeaderLabel: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    sectionTitle: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    sectionWrap: {
        gap: 2,
    },
    stepTrackingBanner: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        borderRadius: radii.lg,
        borderWidth: 1,
        gap: 6,
        marginTop: 8,
        padding: 10,
    },
    stepTrackingBannerHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    stepTrackingButtonsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    stepTrackingIcon: {
        fontSize: 14,
    },
    stepTrackingTitle: {
        color: '#166534',
        fontSize: 12,
        fontWeight: '700',
    },
    stepTrackingUrlText: {
        color: '#15803d',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 11,
    },
    trackOnlineBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.full,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    trackOnlineBtnText: {
        color: colors.white,
        fontSize: 11,
        fontWeight: '700',
    },
    copyTrackingBtn: {
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    copyTrackingBtnText: {
        color: '#15803d',
        fontSize: 11,
        fontWeight: '600',
    },
    summaryDivider: {
        backgroundColor: colors.border,
        height: 1,
        marginVertical: 10,
    },
    summaryTotalLabel: {
        color: colors.foreground,
        fontSize: 15,
        fontWeight: '700',
    },
    summaryTotalRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 2,
    },
    summaryTotalValue: {
        color: colors.foreground,
        fontSize: 18,
        fontWeight: '700',
    },
    freeBadge: {
        color: colors.statusEmerald,
        fontSize: 13,
        fontWeight: '700',
    },
    payIdWaivedRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    waivedText: {
        color: colors.statusEmerald,
        fontSize: 11,
        fontStyle: 'italic',
    },
    timelineNodeWrapper: {
        alignItems: 'center',
        height: 32,
        justifyContent: 'center',
        position: 'relative',
        width: 32,
    },
    timelinePulseRing: {
        backgroundColor: colors.accentLime,
        borderRadius: radii.full,
        bottom: -2,
        left: -2,
        position: 'absolute',
        right: -2,
        top: -2,
        zIndex: 1,
    },
    timelineIconCircle: {
        alignItems: 'center',
        borderRadius: radii.full,
        height: 28,
        justifyContent: 'center',
        width: 28,
        zIndex: 2,
    },
    timelineIconCircleCurrent: {
        borderColor: colors.primaryGreen,
        borderWidth: 2,
    },
    timelineIconCircleCompleted: {
        borderColor: '#15a05a',
        borderWidth: 1.5,
    },
    timelineStepCurrent: {
        color: colors.primaryGreen,
        fontWeight: '800',
    },
    timelineIconText: {
        fontSize: 11,
        fontWeight: '700',
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 12,
    },
    timelineLeftCol: {
        alignItems: 'center',
        width: 32,
    },
    timelineLine: {
        backgroundColor: colors.border,
        flex: 1,
        marginVertical: 2,
        minHeight: 28,
        width: 2,
    },
    timelineLineCompleted: {
        backgroundColor: '#15a05a',
    },
    timelineRightCol: {
        flex: 1,
        gap: 2,
        paddingBottom: 16,
        paddingTop: 4,
    },
    timelineRightColLast: {
        paddingBottom: 0,
    },
    timelineStepBy: {
        color: colors.mutedForeground,
        fontSize: 10,
    },
    timelineStepDate: {
        color: colors.mutedForeground,
        fontSize: 11,
    },
    timelineStepName: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '700',
    },
    timelineStepPending: {
        color: '#94a3b8',
    },
    timelineWrap: {
        marginTop: 6,
    },
    titleOrderUuid: {
        color: colors.foreground,
        fontSize: 18,
        fontWeight: '700',
    },
    titleSection: {
        marginBottom: 2,
    },
    toggleBreakdownBtn: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
        marginTop: 8,
    },
    toggleBreakdownChevron: {
        color: colors.mutedForeground,
        fontSize: 9,
    },
    toggleBreakdownText: {
        color: colors.mutedForeground,
        fontSize: 12,
    },
    trackingBox: {
        backgroundColor: '#fffbeb',
        borderColor: '#fef3c7',
        borderRadius: radii.lg,
        borderWidth: 1,
        gap: 4,
        marginTop: 12,
        padding: 10,
    },
    trackingBoxTitle: {
        color: '#b45309',
        fontSize: 10,
        fontWeight: '700',
    },
    trackingLinkRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between',
    },
    trackingLinkText: {
        color: '#92400e',
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    twoColRow: {
        flexDirection: 'row',
        gap: 8,
    },
});
