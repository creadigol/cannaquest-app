import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';
import type { Consultation } from '../api/consultations.types';

type Props = {
    consultation: Consultation;
    onReschedulePress?: (consultation: Consultation) => void;
    onCancelPress?: (consultation: Consultation) => void;
    onPaymentPress?: (consultation: Consultation) => void;
};

export function ConsultationCard({
    consultation,
    onReschedulePress,
    onCancelPress,
    onPaymentPress,
}: Props) {
    const bookDate = consultation.book_date ? new Date(consultation.book_date) : new Date();
    const isValidDate = !isNaN(bookDate.getTime());

    // Month name, day, weekday
    const month = isValidDate ? bookDate.toLocaleDateString('en-AU', { month: 'short' }).toUpperCase() : 'DATE';
    const day = isValidDate ? bookDate.getDate() : '--';
    const weekday = isValidDate ? bookDate.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase() : '';

    const status = consultation.status || 'SUBMITTED';
    const isUpcoming = consultation.is_upcoming ?? (status === 'SUBMITTED' || status === 'PENDING' || status === 'CONFIRMED');

    // Accent border based on status
    const isCancelled = status === 'CANCELED';
    const isPending = status === 'PENDING';
    const isConfirmed = status === 'SUBMITTED' || status === 'CONFIRMED';

    const accentColor = isCancelled ? '#dc2626' : isPending ? '#d97706' : '#10b981';

    // Format start time & end time
    const formatTime = (timeStr?: string) => {
        if (!timeStr) return '';
        if (timeStr.includes(':')) {
            const [h, m] = timeStr.split(':');
            const hour = parseInt(h, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${m} ${ampm}`;
        }
        return timeStr;
    };

    const startTimeFormatted = formatTime(consultation.start_time);
    const endTimeFormatted = formatTime(consultation.end_time);

    const handleJoinMeeting = () => {
        if (consultation.meeting_url) {
            Linking.openURL(consultation.meeting_url).catch(() => {
                Alert.alert('Error', 'Unable to open consultation meeting link.');
            });
        }
    };

    return (
        <View style={[styles.card, { borderLeftColor: accentColor }]}>
            {/* Top row: Date block + Content info */}
            <View style={styles.topSection}>
                {/* Date Block */}
                <View style={styles.dateBlock}>
                    <Text style={styles.dateMonth}>{month}</Text>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={styles.dateWeekday}>{weekday}</Text>
                </View>

                {/* Prescriber & Consultation Info */}
                <View style={styles.infoCol}>
                    <View style={styles.headerRow}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>
                                {consultation.prescriber?.name ? consultation.prescriber.name.charAt(0) : 'Dr'}
                            </Text>
                        </View>
                        <View style={styles.nameWrap}>
                            <Text numberOfLines={1} style={styles.prescriberName}>
                                {consultation.prescriber?.name || 'Healthcare Practitioner'}
                            </Text>
                            <Text numberOfLines={1} style={styles.specialisation}>
                                {consultation.prescriber?.specialisation || consultation.prescriber?.type || 'General Practitioner'}
                            </Text>
                        </View>

                        {/* Status Badge */}
                        <View
                            style={[
                                styles.statusBadge,
                                isCancelled && styles.statusBadgeCancelled,
                                isPending && styles.statusBadgePending,
                                isConfirmed && styles.statusBadgeConfirmed,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusBadgeText,
                                    isCancelled && styles.statusTextCancelled,
                                    isPending && styles.statusTextPending,
                                    isConfirmed && styles.statusTextConfirmed,
                                ]}
                            >
                                {consultation.status_label || status}
                            </Text>
                        </View>
                    </View>

                    {/* Time & Consultation Type */}
                    <View style={styles.metaRow}>
                        <Text style={styles.metaIcon}>🕒</Text>
                        <Text style={styles.metaTime}>
                            {startTimeFormatted}
                            {endTimeFormatted ? ` - ${endTimeFormatted}` : ''}
                        </Text>
                    </View>

                    {consultation.time_until && isUpcoming && !isCancelled ? (
                        <View style={styles.countdownPill}>
                            <Text style={styles.countdownIcon}>⚡</Text>
                            <Text style={styles.countdownText}>{consultation.time_until}</Text>
                        </View>
                    ) : null}

                    <View style={styles.typeRow}>
                        <Text style={styles.typeIcon}>📞</Text>
                        <Text style={styles.typeText}>
                            {consultation.consultation_type || 'Phone Consultation'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Bottom Actions Bar */}
            <View style={styles.footerRow}>
                {/* Left: Cancellation if eligible */}
                <View style={styles.footerLeft}>
                    {consultation.can_cancel && onCancelPress ? (
                        <Pressable hitSlop={6} onPress={() => onCancelPress(consultation)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                    ) : null}
                </View>

                {/* Right: Action Buttons */}
                <View style={styles.footerRight}>
                    {consultation.can_reschedule && onReschedulePress ? (
                        <Pressable
                            onPress={() => onReschedulePress(consultation)}
                            style={styles.actionBtnOutline}
                        >
                            <Text style={styles.actionBtnOutlineText}>Reschedule</Text>
                        </Pressable>
                    ) : null}

                    {(consultation.can_pay || isPending) && onPaymentPress ? (
                        <Pressable
                            onPress={() => onPaymentPress(consultation)}
                            style={styles.actionBtnPay}
                        >
                            <Text style={styles.actionBtnPayText}>Pay Now</Text>
                        </Pressable>
                    ) : null}

                    {consultation.can_join_meeting && consultation.meeting_url ? (
                        <Pressable onPress={handleJoinMeeting} style={styles.actionBtnJoin}>
                            <Text style={styles.actionBtnJoinText}>Join Call</Text>
                        </Pressable>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderColor: colors.gray200,
        borderLeftWidth: 4,
        borderRadius: radii.xl,
        borderWidth: 1,
        marginBottom: 14,
        overflow: 'hidden',
        ...shadows.tier1,
    },
    topSection: {
        flexDirection: 'row',
        padding: 14,
    },
    dateBlock: {
        alignItems: 'center',
        backgroundColor: '#f5f7ef',
        borderColor: '#e2ecd8',
        borderRadius: radii.lg,
        borderWidth: 1,
        height: 72,
        justifyContent: 'center',
        marginRight: 12,
        width: 64,
    },
    dateMonth: {
        color: '#606b52',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    dateDay: {
        color: colors.primaryGreen,
        fontSize: 22,
        fontWeight: '800',
        lineHeight: 26,
    },
    dateWeekday: {
        color: '#8b967d',
        fontSize: 9,
        fontWeight: '600',
    },
    infoCol: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: 4,
    },
    avatarCircle: {
        alignItems: 'center',
        backgroundColor: '#d8ebcf',
        borderRadius: radii.full,
        height: 28,
        justifyContent: 'center',
        marginRight: 8,
        width: 28,
    },
    avatarText: {
        color: colors.primaryGreen,
        fontSize: 12,
        fontWeight: '700',
    },
    nameWrap: {
        flex: 1,
        marginRight: 6,
    },
    prescriberName: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    specialisation: {
        color: colors.mutedForeground,
        fontSize: 11,
    },
    statusBadge: {
        borderRadius: radii.full,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    statusBadgeConfirmed: {
        backgroundColor: '#dcfce7',
    },
    statusBadgePending: {
        backgroundColor: '#fef3c7',
    },
    statusBadgeCancelled: {
        backgroundColor: '#fee2e2',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    statusTextConfirmed: {
        color: '#15803d',
    },
    statusTextPending: {
        color: '#b45309',
    },
    statusTextCancelled: {
        color: '#b91c1c',
    },
    metaRow: {
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: 4,
    },
    metaIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    metaTime: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '600',
    },
    countdownPill: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        borderRadius: radii.full,
        borderWidth: 0.5,
        flexDirection: 'row',
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    countdownIcon: {
        fontSize: 10,
        marginRight: 3,
    },
    countdownText: {
        color: '#047857',
        fontSize: 10,
        fontWeight: '700',
    },
    typeRow: {
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: 4,
    },
    typeIcon: {
        fontSize: 11,
        marginRight: 4,
    },
    typeText: {
        color: colors.mutedForeground,
        fontSize: 11,
        fontWeight: '500',
    },
    footerRow: {
        alignItems: 'center',
        backgroundColor: '#fafcf7',
        borderTopColor: colors.gray100,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    footerLeft: {
        flexDirection: 'row',
    },
    footerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    cancelText: {
        color: '#dc2626',
        fontSize: 12,
        fontWeight: '600',
    },
    actionBtnOutline: {
        backgroundColor: colors.white,
        borderColor: colors.gray200,
        borderRadius: radii.md,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    actionBtnOutlineText: {
        color: colors.foreground,
        fontSize: 12,
        fontWeight: '600',
    },
    actionBtnPay: {
        backgroundColor: '#f59e0b',
        borderRadius: radii.md,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    actionBtnPayText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    actionBtnJoin: {
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.md,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    actionBtnJoinText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
});
