import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useCurrentCustomer } from '@/features/customer/hooks/useCurrentCustomer';
import {
    useClearCustomerSignature,
    useCustomerDocuments,
    useCustomerPaymentMethods,
    useSaveCustomerSignature,
    useUpdateCustomerAddress,
    useUpdateCustomerProfile,
} from '@/features/customer/hooks/useCustomerMutations';
import { useDashboardSummary } from '@/features/dashboard/hooks/useDashboardSummary';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import { ChangePasswordModal } from '@/features/customer/components/ChangePasswordModal';
import { DocumentsModal } from '@/features/customer/components/DocumentsModal';
import { EditAddressModal } from '@/features/customer/components/EditAddressModal';
import { EditProfileModal } from '@/features/customer/components/EditProfileModal';
import { PaymentMethodsModal } from '@/features/customer/components/PaymentMethodsModal';
import { ProfileRow, type StatusPillColor } from '@/features/customer/components/ProfileRow';
import { SignatureModal } from '@/features/customer/components/SignatureModal';
import { SignatureDisplay } from '@/features/customer/components/SignatureDisplay';

export default function ProfileTabScreen() {
    const customerQuery = useCurrentCustomer();
    const dashboardQuery = useDashboardSummary();
    const documentsQuery = useCustomerDocuments();
    const paymentMethodsQuery = useCustomerPaymentMethods();
    const logout = useLogout();

    const updateProfile = useUpdateCustomerProfile();
    const updateAddress = useUpdateCustomerAddress();
    const saveSignature = useSaveCustomerSignature();
    const clearSignature = useClearCustomerSignature();

    // Modals
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showEditAddress, setShowEditAddress] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDocumentsModal, setShowDocumentsModal] = useState(false);
    const [showPaymentMethodsModal, setShowPaymentMethodsModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const onRefresh = () => {
        void customerQuery.refetch();
        void dashboardQuery.refetch();
        void documentsQuery.refetch();
        void paymentMethodsQuery.refetch();
    };

    const isRefreshing =
        customerQuery.isRefetching ||
        dashboardQuery.isRefetching ||
        documentsQuery.isRefetching ||
        paymentMethodsQuery.isRefetching;

    const isLoading = customerQuery.isLoading || dashboardQuery.isLoading;

    if (isLoading && !customerQuery.data) {
        return (
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.centered}>
                    <ActivityIndicator color={colors.primaryGreen} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    const customer = customerQuery.data;
    const summary = dashboardQuery.data;
    const documents = documentsQuery.data || [];
    const paymentMethods = paymentMethodsQuery.data || [];

    // Filter signed forms from documents
    const signedForms = documents.filter((d) => !!d.signedAt || !!d.fileUrl);

    // Header values
    const initials =
        customer
            ? `${(customer.firstName?.[0] || '').toUpperCase()}${(customer.lastName?.[0] || '').toUpperCase()}`
            : 'CQ';
    const fullName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Patient Profile';

    // Formatted Address String
    const addressStr = customer?.address?.line1
        ? `${customer.address.line1}, ${customer.address.suburb || ''}`
        : '—';

    // Medicare string
    const medicareStr = customer?.medicareNumber
        ? `${customer.medicareNumber}${customer.medicareIrn ? ` / ${customer.medicareIrn}` : ''}`
        : '—';

    // Format DOB to date only (e.g. YYYY-MM-DD or DD/MM/YYYY)
    const formattedDob = (() => {
        if (!customer?.dateOfBirth) return '—';
        const raw = customer.dateOfBirth.split('T')[0];
        const parts = raw.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day}/${month}/${year}`;
        }
        return raw;
    })();

    const handleClearSignature = () => {
        Alert.alert(
            'Remove Signature',
            'Are you sure you want to remove your digital signature?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearSignature.mutateAsync();
                        } catch (err: unknown) {
                            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove signature.');
                        }
                    },
                },
            ]
        );
    };

    const handleOpenExternalUrl = async (url?: string) => {
        if (!url) return;
        const can = await Linking.canOpenURL(url);
        if (can) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'Unable to open file.');
        }
    };

    const getOrderStatusConfig = (statusStr?: string): { label: string; color: StatusPillColor } => {
        const lower = (statusStr || '').toLowerCase();
        if (lower.includes('approved') || lower.includes('shipped') || lower.includes('collected')) {
            return { label: statusStr || 'Approved', color: 'emerald' };
        }
        if (lower.includes('payid') || lower.includes('awaiting')) {
            return { label: statusStr || 'Awaiting PayID', color: 'amber' };
        }
        if (lower.includes('disapproved') || lower.includes('cancel') || lower.includes('failed')) {
            return { label: statusStr || 'Disapproved', color: 'red' };
        }
        if (lower.includes('paid') || lower.includes('submitted') || lower.includes('ready')) {
            return { label: statusStr || 'Paid', color: 'blue' };
        }
        return { label: statusStr || 'Active', color: 'blue' };
    };

    return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.container}
                refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={isRefreshing} tintColor={colors.primaryGreen} />}
                showsVerticalScrollIndicator={false}
            >
                {/* ── A: Condensed Header Card ─────────────────── */}
                <View style={styles.surfaceCard}>
                    <View style={styles.headerRow}>
                        <View style={styles.avatarBadge}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <View style={styles.headerInfo}>
                            <Text numberOfLines={1} style={styles.fullName}>{fullName}</Text>
                            <Text numberOfLines={1} style={styles.emailText}>{customer?.email || '—'}</Text>
                        </View>
                        <Pressable
                            onPress={() => setShowEditProfile(true)}
                            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                        >
                            <Text style={styles.editBtnIcon}>✏️</Text>
                            <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                    </View>
                </View>

                {/* ── B: Personal Information ─────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.surfaceCard}>
                        <ProfileRow icon="📞" label="Phone" value={customer?.phone || '—'} />
                        <ProfileRow icon="📅" label="Date of Birth" value={formattedDob} />
                        <ProfileRow icon="🛡️" label="Medicare" value={medicareStr} />
                        <ProfileRow icon="⏱️" label="Medicare Expiry" value={customer?.medicareExpiry || '—'} />
                        <ProfileRow
                            icon="🏥"
                            label="Halaxy Patient ID"
                            last
                            pillColor={customer?.halaxyPatientId ? 'emerald' : 'gray'}
                            pillLabel={customer?.halaxyPatientId ? 'Synced' : 'Pending'}
                            value={customer?.halaxyPatientId || '—'}
                        />
                    </View>
                </View>

                {/* ── C0: My Documents ────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Documents</Text>
                    <View style={styles.surfaceCard}>
                        <ProfileRow
                            icon="📄"
                            label="My Documents"
                            last
                            onPress={() => setShowDocumentsModal(true)}
                            value={
                                (documents.length + (customer?.signature ? 1 : 0)) > 0
                                    ? `${documents.length + (customer?.signature ? 1 : 0)} on file`
                                    : 'None on file'
                            }
                        />
                    </View>
                </View>

                {/* ── C: Recent Orders ────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Orders</Text>
                    <View style={styles.surfaceCard}>
                        {summary?.recentOrders && summary.recentOrders.length > 0 ? (
                            <>
                                {summary.recentOrders.slice(0, 2).map((order) => {
                                    const { label, color } = getOrderStatusConfig(order.status);
                                    const orderLabel = order.uuid
                                        ? String(order.uuid).slice(0, 18)
                                        : `Order #${order.id}`;
                                    const itemsText = `${order.shippingSummary || 'Order placed'}`;

                                    return (
                                        <ProfileRow
                                            icon="📦"
                                            key={order.id}
                                            label={orderLabel}
                                            onPress={() => router.push('/(app)/(tabs)/orders' as Href)}
                                            pillColor={color}
                                            pillLabel={label}
                                            subtitle={itemsText}
                                        />
                                    );
                                })}
                                <Pressable
                                    onPress={() => router.push('/(app)/(tabs)/orders' as Href)}
                                    style={({ pressed }) => [styles.viewAllOrdersRow, pressed && styles.pressed]}
                                >
                                    <Text style={styles.viewAllOrdersText}>View All Orders</Text>
                                    <Text style={styles.viewAllOrdersChevron}>›</Text>
                                </Pressable>
                            </>
                        ) : (
                            <View style={styles.emptyWrap}>
                                <Text style={styles.emptyIcon}>📦</Text>
                                <Text style={styles.emptyText}>No orders yet</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── D: Shipping & Delivery ─────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Shipping & Delivery</Text>
                    <View style={styles.surfaceCard}>
                        <ProfileRow
                            icon="📍"
                            label="Delivery Address"
                            onPress={() => setShowEditAddress(true)}
                            value={addressStr}
                        />
                        <ProfileRow
                            icon="💳"
                            label="Payment Methods"
                            last
                            onPress={() => setShowPaymentMethodsModal(true)}
                            value={`${paymentMethods.length} saved`}
                        />
                    </View>
                </View>

                {/* ── E: Security ─────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Security</Text>
                    <View style={styles.surfaceCard}>
                        <ProfileRow
                            icon="🔒"
                            label="Change Password"
                            last
                            onPress={() => setShowPasswordModal(true)}
                        />
                    </View>
                </View>

                {/* ── F: My Signature ─────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Signature</Text>
                    <View style={styles.surfaceCard}>
                        <View style={styles.sigHeaderRow}>
                            <View style={styles.sigInfo}>
                                <View style={styles.sigIconWrap}>
                                    <Text style={styles.sigIconText}>✍️</Text>
                                </View>
                                <View style={styles.sigTextWrap}>
                                    <Text style={styles.sigTitle}>My Signature</Text>
                                    <Text style={styles.sigSubtitle}>
                                        {customer?.signature
                                            ? 'Signature on file — used to sign compliance forms digitally'
                                            : 'No signature saved yet'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.sigActionsRow}>
                                {customer?.signature ? (
                                    <Pressable onPress={handleClearSignature} style={styles.removeSigBtn}>
                                        <Text style={styles.removeSigBtnText}>Remove</Text>
                                    </Pressable>
                                ) : null}
                                <Pressable
                                    onPress={() => setShowSignatureModal(true)}
                                    style={styles.sigModalBtn}
                                >
                                    <Text style={styles.sigModalBtnText}>
                                        {customer?.signature ? 'Update' : 'Add Signature'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {customer?.signature ? (
                            <View style={styles.sigPreviewBox}>
                                <SignatureDisplay signature={customer.signature} imageStyle={styles.sigImage} />
                            </View>
                        ) : null}
                    </View>
                </View>

                {/* ── G: Signed Forms ─────────────────────────── */}
                {signedForms.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Signed Forms</Text>
                        <View style={styles.surfaceCard}>
                            {signedForms.map((form, idx) => (
                                <Pressable
                                    key={form.id}
                                    onPress={() => handleOpenExternalUrl(form.fileUrl)}
                                    style={({ pressed }) => [
                                        styles.signedFormRow,
                                        idx !== signedForms.length - 1 && styles.hairline,
                                        pressed && styles.pressed,
                                    ]}
                                >
                                    <View style={styles.formIconWrap}>
                                        <Text style={styles.formIcon}>📑</Text>
                                    </View>
                                    <View style={styles.formInfo}>
                                        <Text numberOfLines={1} style={styles.formTitle}>
                                            {form.type?.name || form.title || 'Consent Form'}
                                        </Text>
                                        <Text style={styles.formDate}>
                                            {form.signedAt ? `Signed ${form.signedAt}` : 'Signed & Verified'}
                                        </Text>
                                    </View>
                                    <Text style={styles.formExternalIcon}>↗</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                ) : null}

                {/* ── H: Sign Out Button Card ──────────────────── */}
                <View style={styles.signOutSection}>
                    <Pressable
                        onPress={() => setShowLogoutModal(true)}
                        style={({ pressed }) => [styles.logoutBtnCard, pressed && styles.pressed]}
                    >
                        <Text style={styles.logoutIcon}>🚪</Text>
                        <Text style={styles.logoutBtnText}>Sign Out</Text>
                    </Pressable>
                </View>
            </ScrollView>

            {/* ── Sign Out Confirmation Modal ──────────────── */}
            <Modal animationType="fade" transparent visible={showLogoutModal}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.dialogCard}>
                        <Text style={styles.dialogTitle}>Sign Out</Text>
                        <Text style={styles.dialogMessage}>Are you sure you want to sign out?</Text>
                        <View style={styles.dialogActions}>
                            <Pressable
                                onPress={() => setShowLogoutModal(false)}
                                style={styles.dialogCancelBtn}
                            >
                                <Text style={styles.dialogCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                disabled={logout.isPending}
                                onPress={() => {
                                    setShowLogoutModal(false);
                                    void logout.mutateAsync().then(() => router.replace('/(auth)/login' as Href));
                                }}
                                style={styles.dialogConfirmBtn}
                            >
                                {logout.isPending ? (
                                    <ActivityIndicator color={colors.white} size="small" />
                                ) : (
                                    <Text style={styles.dialogConfirmText}>Sign Out</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Modals & Sheets ──────────────────────────── */}
            {customer ? (
                <>
                    <EditProfileModal
                        customer={customer}
                        onClose={() => setShowEditProfile(false)}
                        onSave={async (data) => {
                            await updateProfile.mutateAsync(data);
                        }}
                        visible={showEditProfile}
                    />

                    <EditAddressModal
                        address={customer.address}
                        onClose={() => setShowEditAddress(false)}
                        onSave={async (data) => {
                            await updateAddress.mutateAsync(data);
                        }}
                        visible={showEditAddress}
                    />

                    <SignatureModal
                        onClose={() => setShowSignatureModal(false)}
                        onSave={async (data) => {
                            await saveSignature.mutateAsync({ signatureData: data });
                        }}
                        visible={showSignatureModal}
                    />

                    <ChangePasswordModal
                        email={customer.email}
                        onClose={() => setShowPasswordModal(false)}
                        visible={showPasswordModal}
                    />

                    <DocumentsModal
                        onClose={() => setShowDocumentsModal(false)}
                        visible={showDocumentsModal}
                    />

                    <PaymentMethodsModal
                        onClose={() => setShowPaymentMethodsModal(false)}
                        visible={showPaymentMethodsModal}
                    />
                </>
            ) : null}
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: colors.background,
        flex: 1,
    },
    centered: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    container: {
        paddingBottom: 90,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    surfaceCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.78)',
        borderColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        ...shadows.tier1,
    },
    headerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        padding: 16,
    },
    avatarBadge: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: 16,
        height: 48,
        justifyContent: 'center',
        width: 48,
    },
    avatarText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    headerInfo: {
        flex: 1,
        minWidth: 0,
    },
    fullName: {
        color: colors.foreground,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    emailText: {
        color: colors.mutedForeground,
        fontSize: 13,
        marginTop: 2,
    },
    editBtn: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderColor: 'rgba(20, 32, 24, 0.12)',
        borderRadius: radii.full,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    editBtnIcon: {
        fontSize: 12,
    },
    editBtnText: {
        color: colors.foreground,
        fontSize: 12,
        fontWeight: '600',
    },
    section: {
        marginTop: 20,
    },
    sectionTitle: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.3,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 28,
        width: '100%',
    },
    emptyIcon: {
        fontSize: 32,
        marginBottom: 8,
        opacity: 0.35,
    },
    emptyText: {
        color: colors.mutedForeground,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    viewAllOrdersRow: {
        alignItems: 'center',
        borderTopColor: 'rgba(0, 0, 0, 0.05)',
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: 52,
        paddingHorizontal: 16,
        paddingVertical: 14,
        width: '100%',
    },
    viewAllOrdersText: {
        color: colors.primaryGreen,
        fontSize: 14,
        fontWeight: '600',
    },
    viewAllOrdersChevron: {
        color: colors.primaryGreen,
        fontSize: 18,
        fontWeight: '600',
    },
    sigHeaderRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 14,
        width: '100%',
    },
    sigInfo: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        gap: 12,
        marginRight: 10,
        minWidth: 0,
    },
    sigIconWrap: {
        alignItems: 'center',
        backgroundColor: 'rgba(14, 48, 23, 0.08)',
        borderRadius: 10,
        flexShrink: 0,
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    sigIconText: {
        fontSize: 16,
    },
    sigTextWrap: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0,
    },
    sigTitle: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    sigSubtitle: {
        color: colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    sigActionsRow: {
        alignItems: 'center',
        flexDirection: 'row',
        flexShrink: 0,
        gap: 8,
    },
    removeSigBtn: {
        paddingHorizontal: 6,
        paddingVertical: 6,
    },
    removeSigBtnText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '600',
    },
    sigModalBtn: {
        alignItems: 'center',
        borderColor: 'rgba(14, 48, 23, 0.25)',
        borderRadius: radii.full,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    sigModalBtnText: {
        color: colors.primaryGreen,
        fontSize: 12,
        fontWeight: '600',
    },
    sigPreviewBox: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: 'rgba(0, 0, 0, 0.06)',
        borderRadius: radii.lg,
        borderWidth: 1,
        height: 76,
        justifyContent: 'center',
        marginBottom: 16,
        marginHorizontal: 16,
    },

    sigImage: {
        height: 52,
        width: '80%',
    },
    sigTypedPreview: {
        color: colors.foreground,
        fontSize: 24,
        fontStyle: 'italic',
        fontWeight: '600',
    },
    signedFormRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    hairline: {
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
        borderBottomWidth: 1,
    },
    formIconWrap: {
        alignItems: 'center',
        backgroundColor: 'rgba(14, 48, 23, 0.08)',
        borderRadius: radii.full,
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    formIcon: {
        fontSize: 16,
    },
    formInfo: {
        flex: 1,
    },
    formTitle: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    formDate: {
        color: colors.mutedForeground,
        fontSize: 11,
        marginTop: 2,
    },
    formExternalIcon: {
        color: colors.mutedForeground,
        fontSize: 18,
        fontWeight: '600',
    },
    signOutSection: {
        marginTop: 24,
        paddingBottom: 48,
    },
    logoutBtnCard: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: radii.xl,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        paddingVertical: 14,
        ...shadows.tier1,
    },
    logoutIcon: {
        fontSize: 16,
    },
    logoutBtnText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
    },
    modalBackdrop: {
        alignItems: 'center',
        backgroundColor: 'rgba(15, 30, 18, 0.50)',
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    dialogCard: {
        backgroundColor: colors.white,
        borderRadius: radii.xl,
        maxWidth: 340,
        padding: 22,
        width: '100%',
        ...shadows.tier3,
    },
    dialogTitle: {
        color: colors.foreground,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    dialogMessage: {
        color: colors.mutedForeground,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20,
    },
    dialogActions: {
        flexDirection: 'row',
        gap: 12,
    },
    dialogCancelBtn: {
        alignItems: 'center',
        borderColor: colors.gray200,
        borderRadius: radii.lg,
        borderWidth: 1,
        flex: 1,
        paddingVertical: 11,
    },
    dialogCancelText: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    dialogConfirmBtn: {
        alignItems: 'center',
        backgroundColor: '#ef4444',
        borderRadius: radii.lg,
        flex: 1,
        paddingVertical: 11,
    },
    dialogConfirmText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    pressed: {
        opacity: 0.85,
    },
});

