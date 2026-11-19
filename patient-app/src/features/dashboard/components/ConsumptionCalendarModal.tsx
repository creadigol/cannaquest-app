import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import { useConsumptionCalendar } from '../hooks/useConsumptionCalendar';
import type { ConsumptionCalendarEntry } from '../api/dashboard.types';

interface Props {
    visible: boolean;
    onClose: () => void;
}

export function ConsumptionCalendarModal({ visible, onClose }: Props) {
    const { data: calendar, isLoading, refetch } = useConsumptionCalendar();

    if (!visible) return null;

    const entries = calendar?.entries || [];

    const availableNowCount = entries.filter((e) => e.availableNow).length;
    const upcomingCount = entries.filter((e) => !e.availableNow && e.nextAvailableDate).length;

    const handleOrder = (entry: ConsumptionCalendarEntry) => {
        onClose();
        router.push('/(app)/(tabs)/scripts');
    };

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Refill & Consumption Calendar</Text>
                            <Text style={styles.subtitle}>Medication schedule & repeat unlock dates</Text>
                        </View>
                        <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </Pressable>
                    </View>

                    {/* Summary Quick Stats */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statBox, { borderColor: '#86efac', backgroundColor: '#f0fdf4' }]}>
                            <Text style={[styles.statValue, { color: '#16a34a' }]}>{availableNowCount}</Text>
                            <Text style={styles.statLabel}>Available to Order</Text>
                        </View>
                        <View style={[styles.statBox, { borderColor: '#93c5fd', backgroundColor: '#eff6ff' }]}>
                            <Text style={[styles.statValue, { color: '#2563eb' }]}>{upcomingCount}</Text>
                            <Text style={styles.statLabel}>Upcoming Repeats</Text>
                        </View>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator color={colors.primaryGreen} size="large" />
                            <Text style={styles.loadingText}>Checking medication schedule...</Text>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollList}
                        >
                            {entries.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyIcon}>📅</Text>
                                    <Text style={styles.emptyTitle}>No Active Prescriptions</Text>
                                    <Text style={styles.emptySub}>
                                        You don't have any scheduled prescription repeats at the moment.
                                    </Text>
                                    <Pressable
                                        onPress={() => {
                                            onClose();
                                            router.push('/(app)/(tabs)/consults');
                                        }}
                                        style={styles.emptyBtn}
                                    >
                                        <Text style={styles.emptyBtnText}>Book Consultation</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                entries.map((entry, idx) => {
                                    const isAvailable = entry.availableNow;
                                    const formattedDate = entry.nextAvailableDate
                                        ? new Date(entry.nextAvailableDate).toLocaleDateString('en-AU', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric',
                                          })
                                        : 'Immediate';

                                    return (
                                        <View
                                            key={`${entry.prescriptionId}-${idx}`}
                                            style={[
                                                styles.card,
                                                isAvailable ? styles.cardAvailable : styles.cardLocked,
                                            ]}
                                        >
                                            {/* Status Badge */}
                                            <View style={styles.cardHeader}>
                                                <View
                                                    style={[
                                                        styles.statusPill,
                                                        isAvailable
                                                            ? styles.statusPillReady
                                                            : styles.statusPillUpcoming,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.statusPillText,
                                                            isAvailable
                                                                ? styles.statusPillTextReady
                                                                : styles.statusPillTextUpcoming,
                                                        ]}
                                                    >
                                                        {isAvailable ? '✓ Order Available' : '⏳ Interval Restricted'}
                                                    </Text>
                                                </View>

                                                <Text style={styles.repeatsText}>
                                                    {entry.repeatsRemaining} repeat{entry.repeatsRemaining === 1 ? '' : 's'} left
                                                </Text>
                                            </View>

                                            {/* Product Title */}
                                            <Text style={styles.productName}>{entry.productName}</Text>
                                            {entry.productForm ? (
                                                <Text style={styles.productForm}>Form: {entry.productForm}</Text>
                                            ) : null}

                                            {/* Schedule Info */}
                                            <View style={styles.scheduleRow}>
                                                <Text style={styles.scheduleLabel}>Refill Unlock Date:</Text>
                                                <Text style={styles.scheduleDate}>{formattedDate}</Text>
                                            </View>

                                            {entry.daysUntilAvailable && entry.daysUntilAvailable > 0 ? (
                                                <Text style={styles.countdownText}>
                                                    Unlocks in {entry.daysUntilAvailable} day
                                                    {entry.daysUntilAvailable === 1 ? '' : 's'}
                                                </Text>
                                            ) : null}

                                            {/* Action Button */}
                                            {isAvailable ? (
                                                <Pressable
                                                    onPress={() => handleOrder(entry)}
                                                    style={styles.orderBtn}
                                                >
                                                    <Text style={styles.orderBtnText}>Order Medication Refill</Text>
                                                </Pressable>
                                            ) : null}
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>
                    )}
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
        height: '88%',
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
        backgroundColor: colors.surfaceNeutral,
        borderRadius: 20,
        padding: 8,
    },
    closeBtnText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 10,
    },
    statBox: {
        borderRadius: radii.md,
        borderWidth: 1,
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    statLabel: {
        color: colors.textSecondary,
        fontSize: 11.5,
        fontWeight: '600',
        marginTop: 2,
    },
    scrollList: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 24,
    },
    loadingBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 10,
    },
    card: {
        borderRadius: radii.lg,
        borderWidth: 1.5,
        marginBottom: 12,
        padding: 14,
        ...shadows.sm,
    },
    cardAvailable: {
        backgroundColor: '#fafffb',
        borderColor: '#bbf7d0',
    },
    cardLocked: {
        backgroundColor: colors.surfaceNeutral,
        borderColor: colors.borderLight,
    },
    cardHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statusPill: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusPillReady: {
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
    },
    statusPillUpcoming: {
        backgroundColor: 'rgba(234, 88, 12, 0.12)',
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    statusPillTextReady: {
        color: '#16a34a',
    },
    statusPillTextUpcoming: {
        color: '#ea580c',
    },
    repeatsText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        fontWeight: '600',
    },
    productName: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
    },
    productForm: {
        color: colors.textSecondary,
        fontSize: 12,
        marginBottom: 8,
    },
    scheduleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    scheduleLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    scheduleDate: {
        color: colors.textPrimary,
        fontSize: 12.5,
        fontWeight: '700',
    },
    countdownText: {
        color: colors.primaryGreen,
        fontSize: 11.5,
        fontWeight: '700',
        marginTop: 4,
    },
    orderBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.md,
        marginTop: 12,
        paddingVertical: 10,
    },
    orderBtnText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 8,
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
    },
    emptyBtn: {
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.md,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    emptyBtnText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
});
