import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ImageBackground,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, shadows } from '@/lib/theme/tokens';
import {
    cancelConsultation,
    fetchConsultations,
} from '@/features/consultations/api/consultations.api';
import type { Consultation } from '@/features/consultations/api/consultations.types';
import { ConsultationCard } from '@/features/consultations/components/ConsultationCard';
import { BookConsultationModal } from '@/features/consultations/components/BookConsultationModal';
import { ConsultationPaymentModal } from '@/features/consultations/components/ConsultationPaymentModal';

const bannerImages = [
    require('../../../../assets/images/patient/banner/consults-1.webp'),
    require('../../../../assets/images/patient/banner/banner-1.webp'),
    require('../../../../assets/images/patient/banner/banner-2.webp'),
];

export default function ConsultsTabScreen() {
    const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Active banner image index with 10s automatic rotation
    const [bannerIdx, setBannerIdx] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setBannerIdx((prev) => (prev + 1) % bannerImages.length);
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    // Modal state for Booking / Rescheduling
    const [modalVisible, setModalVisible] = useState(false);
    const [rescheduleItem, setRescheduleItem] = useState<Consultation | null>(null);

    // Payment Modal State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [paymentConsultationItem, setPaymentConsultationItem] = useState<Consultation | null>(null);

    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const items = await fetchConsultations(tab);
            setConsultations(items);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unable to load consultations.';
            setError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [tab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenBookModal = () => {
        console.log('[USER ACTION] Clicked "+ Book Consultation" button');
        setRescheduleItem(null);
        setModalVisible(true);
    };

    const handleOpenRescheduleModal = (item: Consultation) => {
        console.log('[USER ACTION] Clicked "Reschedule" for consultation ID:', item.id);
        setRescheduleItem(item);
        setModalVisible(true);
    };

    const handleOpenPaymentModal = (item: Consultation) => {
        console.log('[USER ACTION] Clicked "Pay Now" for consultation ID:', item.id);
        setPaymentConsultationItem(item);
        setPaymentModalVisible(true);
    };

    const handleCancel = (item: Consultation) => {
        console.log('[USER ACTION] Clicked "Cancel" for consultation ID:', item.id);
        Alert.alert(
            'Cancel Consultation',
            'Are you sure you want to cancel this consultation? This action cannot be undone.',
            [
                { text: 'No, Keep It', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        console.log('[USER ACTION] Confirmed cancellation for consultation ID:', item.id);
                        try {
                            await cancelConsultation(item.id);
                            Alert.alert('Consultation Cancelled', 'Your appointment has been cancelled.');
                            loadData(true);
                        } catch (err: any) {
                            Alert.alert('Unable to Cancel', err?.message || 'Consultation cannot be cancelled at this time.');
                        }
                    },
                },
            ]
        );
    };

    // Filter consultations by prescriber name or search query
    const filteredConsultations = consultations.filter((c) => {
        if (!searchQuery.trim()) return true;
        const prescriberName = c.prescriber?.name?.toLowerCase() || '';
        const clinicName = c.clinic_name?.toLowerCase() || '';
        const q = searchQuery.toLowerCase();
        return prescriberName.includes(q) || clinicName.includes(q);
    });

    const activeBanner = bannerImages[bannerIdx];

    return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.scrollPage}
                refreshControl={
                    <RefreshControl
                        colors={[colors.primaryGreen]}
                        onRefresh={() => {
                            console.log('[USER ACTION] Pulled to refresh Consultations list');
                            loadData(true);
                        }}
                        refreshing={refreshing}
                        tintColor={colors.primaryGreen}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* HERO BANNER AUTO-CHANGING EVERY 10 SECONDS */}
                <View style={styles.bannerContainer}>
                    <ImageBackground
                        imageStyle={styles.bannerImage}
                        resizeMode="cover"
                        source={activeBanner}
                        style={styles.bannerImageBg}
                    >
                        <View style={styles.bannerOverlay}>
                            <View style={styles.bannerHeaderRow}>
                                <Text style={styles.bannerCategory}>MY CONSULTATIONS</Text>
                                <Pressable
                                    onPress={handleOpenBookModal}
                                    style={({ pressed }) => [styles.bannerBookBtn, pressed && styles.pressed]}
                                >
                                    <Text style={styles.bannerBookBtnText}>+ Book Consultation</Text>
                                </Pressable>
                            </View>

                            <Text style={styles.bannerTitle}>
                                Manage your upcoming and past appointments
                            </Text>

                            <Text style={styles.bannerSubtitle}>
                                View your booking history and schedule new consultations with your prescribing doctor
                            </Text>
                        </View>
                    </ImageBackground>
                </View>

                {/* Tabs & Search Row */}
                <View style={styles.controlRow}>
                    <View style={styles.tabContainer}>
                        <Pressable
                            onPress={() => {
                                console.log('[USER ACTION] Switched tab to "upcoming"');
                                setTab('upcoming');
                            }}
                            style={[styles.tabBtn, tab === 'upcoming' && styles.tabBtnActive]}
                        >
                            <Text style={[styles.tabBtnText, tab === 'upcoming' && styles.tabBtnTextActive]}>
                                Upcoming
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                console.log('[USER ACTION] Switched tab to "past"');
                                setTab('past');
                            }}
                            style={[styles.tabBtn, tab === 'past' && styles.tabBtnActive]}
                        >
                            <Text style={[styles.tabBtnText, tab === 'past' && styles.tabBtnTextActive]}>
                                Past
                            </Text>
                        </Pressable>
                    </View>

                    {/* Prescriber Search */}
                    <View style={styles.searchBox}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            onChangeText={(t) => {
                                console.log('[USER ACTION] Typed in prescriber search:', t);
                                setSearchQuery(t);
                            }}
                            placeholder="Search prescriber..."
                            placeholderTextColor={colors.gray400}
                            style={styles.searchInput}
                            value={searchQuery}
                        />
                    </View>
                </View>

                {/* Error Banner */}
                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Pressable
                            onPress={() => {
                                console.log('[USER ACTION] Clicked retry consultations');
                                loadData();
                            }}
                            style={styles.retryBtn}
                        >
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : null}

                {/* Content List */}
                {loading && !refreshing ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color={colors.primaryGreen} size="large" />
                        <Text style={styles.loadingLabel}>Loading consultations...</Text>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {filteredConsultations.length === 0 ? (
                            <View style={styles.emptyStateCard}>
                                <View style={styles.emptyIconCircle}>
                                    <Text style={styles.emptyIconText}>📅</Text>
                                </View>
                                <Text style={styles.emptyTitle}>
                                    {tab === 'upcoming' ? 'No upcoming consultations' : 'No past consultations'}
                                </Text>
                                <Text style={styles.emptyDesc}>
                                    {tab === 'upcoming'
                                        ? 'Ready to take the next step in your health journey? Book a consultation with one of our healthcare professionals.'
                                        : "Your consultation history will appear here once you've had your first appointment."}
                                </Text>

                                {tab === 'upcoming' ? (
                                    <Pressable
                                        onPress={handleOpenBookModal}
                                        style={({ pressed }) => [styles.emptyActionBtn, pressed && styles.pressed]}
                                    >
                                        <Text style={styles.emptyActionBtnText}>Book Your First Consultation</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        ) : (
                            filteredConsultations.map((item) => (
                                <ConsultationCard
                                    key={String(item.id)}
                                    consultation={item}
                                    onCancelPress={handleCancel}
                                    onPaymentPress={handleOpenPaymentModal}
                                    onReschedulePress={handleOpenRescheduleModal}
                                />
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Book / Reschedule Modal */}
            <BookConsultationModal
                onClose={() => {
                    console.log('[USER ACTION] Closed BookConsultationModal');
                    setModalVisible(false);
                    setRescheduleItem(null);
                }}
                onSuccess={(result) => {
                    console.log('[USER ACTION] Booking succeeded. Result:', result);
                    loadData(true);

                    if (result?.booking) {
                        setConsultations((prev) => {
                            const exists = prev.some((c) => String(c.id) === String(result.bookingId));
                            if (exists) return prev;
                            return [result.booking!, ...prev];
                        });
                    }

                    // If repeat consultation requires payment, immediately launch Payment Modal
                    if (result?.requiresPayment) {
                        console.log('[USER ACTION] Repeat consultation requires payment. Opening payment modal...');
                        const pendingItem: Consultation = result.booking || {
                            id: result.bookingId,
                            book_date: new Date().toISOString().split('T')[0],
                            start_time: 'Pending Slot',
                            status: 'PENDING',
                            status_label: 'Pending Payment',
                            can_pay: true,
                            is_upcoming: true,
                        };
                        setPaymentConsultationItem(pendingItem);
                        setPaymentModalVisible(true);
                    }
                }}
                rescheduleConsultationItem={rescheduleItem}
                visible={modalVisible}
            />

            {/* Payment Modal */}
            <ConsultationPaymentModal
                consultation={paymentConsultationItem}
                onClose={() => {
                    console.log('[USER ACTION] Closed ConsultationPaymentModal');
                    setPaymentModalVisible(false);
                    setPaymentConsultationItem(null);
                }}
                onSuccess={() => {
                    console.log('[USER ACTION] Consultation payment succeeded, refreshing');
                    loadData(true);
                }}
                visible={paymentModalVisible}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: colors.background,
        flex: 1,
    },
    scrollPage: {
        paddingBottom: 40,
    },
    bannerContainer: {
        borderRadius: radii.xl,
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 12,
        overflow: 'hidden',
        height: 190,
        ...shadows.tier2,
    },
    bannerImageBg: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    bannerImage: {
        borderRadius: radii.xl,
    },
    bannerOverlay: {
        backgroundColor: 'rgba(10, 40, 15, 0.78)',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    bannerHeaderRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    bannerCategory: {
        color: 'rgba(210, 255, 160, 0.85)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    bannerBookBtn: {
        alignItems: 'center',
        backgroundColor: colors.brandLime,
        borderRadius: radii.full,
        paddingHorizontal: 12,
        paddingVertical: 6,
        ...shadows.tier1,
    },
    bannerBookBtnText: {
        color: colors.primaryGreen,
        fontSize: 12,
        fontWeight: '700',
    },
    bannerTitle: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '800',
        lineHeight: 23,
        maxWidth: 290,
    },
    bannerSubtitle: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: 11,
        lineHeight: 15,
        marginTop: 6,
        maxWidth: 320,
    },
    bannerDotsRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 10,
    },
    bannerDot: {
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        borderRadius: radii.full,
        height: 5,
        width: 14,
    },
    bannerDotActive: {
        backgroundColor: colors.brandLime,
        width: 22,
    },
    controlRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    tabContainer: {
        backgroundColor: colors.gray100,
        borderRadius: radii.full,
        flexDirection: 'row',
        padding: 3,
    },
    tabBtn: {
        borderRadius: radii.full,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    tabBtnActive: {
        backgroundColor: colors.primaryGreen,
        ...shadows.tier1,
    },
    tabBtnText: {
        color: colors.mutedForeground,
        fontSize: 12,
        fontWeight: '600',
    },
    tabBtnTextActive: {
        color: colors.white,
        fontWeight: '700',
    },
    searchBox: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.gray200,
        borderRadius: radii.full,
        borderWidth: 1,
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: 12,
    },
    searchIcon: {
        fontSize: 12,
        marginRight: 6,
    },
    searchInput: {
        color: colors.foreground,
        flex: 1,
        fontSize: 12,
        paddingVertical: 6,
    },
    errorBox: {
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        borderRadius: radii.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 10,
    },
    errorText: {
        color: '#dc2626',
        flex: 1,
        fontSize: 12,
        marginRight: 8,
    },
    retryBtn: {
        backgroundColor: colors.white,
        borderRadius: radii.sm,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    retryBtnText: {
        color: '#dc2626',
        fontSize: 12,
        fontWeight: '700',
    },
    loadingWrap: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingLabel: {
        color: colors.mutedForeground,
        fontSize: 13,
        marginTop: 10,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingTop: 6,
    },
    emptyStateCard: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: '#e2ecd8',
        borderRadius: radii.xl,
        borderWidth: 1,
        marginTop: 10,
        paddingHorizontal: 24,
        paddingVertical: 36,
        ...shadows.tier1,
    },
    emptyIconCircle: {
        alignItems: 'center',
        backgroundColor: '#f2f8eb',
        borderRadius: radii.full,
        height: 64,
        justifyContent: 'center',
        marginBottom: 16,
        width: 64,
    },
    emptyIconText: {
        fontSize: 30,
    },
    emptyTitle: {
        color: colors.foreground,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptyDesc: {
        color: colors.mutedForeground,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 20,
        textAlign: 'center',
    },
    emptyActionBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.full,
        paddingHorizontal: 20,
        paddingVertical: 12,
        ...shadows.tier2,
    },
    emptyActionBtnText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    pressed: {
        opacity: 0.85,
    },
});
