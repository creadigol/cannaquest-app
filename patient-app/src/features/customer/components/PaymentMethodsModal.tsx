import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';
import type { PaymentMethod } from '../api/customer.types';
import { useCustomerPaymentMethods, useDeletePaymentMethod } from '../hooks/useCustomerMutations';

type Props = {
    visible: boolean;
    onClose: () => void;
};

export function PaymentMethodsModal({ visible, onClose }: Props) {
    const { data: methods = [], isLoading, refetch } = useCustomerPaymentMethods();
    const deleteMutation = useDeletePaymentMethod();
    const [deletingId, setDeletingId] = useState<string | number | null>(null);

    const brandLabels: Record<string, string> = {
        visa: 'Visa',
        mastercard: 'Mastercard',
        amex: 'Amex',
    };

    const handleDelete = (id: string | number) => {
        Alert.alert(
            'Remove Card',
            'Are you sure you want to remove this payment method?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeletingId(id);
                            await deleteMutation.mutateAsync(id);
                        } catch (err: unknown) {
                            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove card.');
                        } finally {
                            setDeletingId(null);
                        }
                    },
                },
            ]
        );
    };

    return (
        <Modal animationType="slide" transparent visible={visible}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Payment Methods</Text>
                            <Text style={styles.subtitle}>Manage your saved cards</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </Pressable>
                    </View>

                    {isLoading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator color={colors.primaryGreen} />
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                            {methods.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <View style={styles.emptyIconWrap}>
                                        <Text style={styles.emptyIcon}>💳</Text>
                                    </View>
                                    <Text style={styles.emptyTitle}>No saved cards</Text>
                                    <Text style={styles.emptySubtitle}>
                                        Cards saved during checkout will securely appear here
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.list}>
                                    {methods.map((pm) => (
                                        <View key={pm.id} style={styles.cardItem}>
                                            <View style={styles.cardIconWrap}>
                                                <Text style={styles.cardIcon}>💳</Text>
                                            </View>
                                            <View style={styles.cardInfo}>
                                                <Text style={styles.cardBrand}>
                                                    {brandLabels[pm.brand.toLowerCase()] || pm.brand} ···· {pm.last4}
                                                </Text>
                                                <Text style={styles.cardExpiry}>
                                                    Expires {pm.expMonth}/{pm.expYear}
                                                </Text>
                                            </View>
                                            <Pressable
                                                disabled={deletingId === pm.id}
                                                onPress={() => handleDelete(pm.id)}
                                                style={styles.trashBtn}
                                            >
                                                {deletingId === pm.id ? (
                                                    <ActivityIndicator color="#ef4444" size="small" />
                                                ) : (
                                                    <Text style={styles.trashText}>🗑️</Text>
                                                )}
                                            </Pressable>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    )}

                    <Pressable onPress={onClose} style={styles.doneBtn}>
                        <Text style={styles.doneBtnText}>Close</Text>
                    </Pressable>
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
        maxHeight: '85%',
        paddingBottom: Platform.OS === 'ios' ? 38 : 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        ...shadows.tier3,
    },
    header: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        color: colors.foreground,
        fontSize: 18,
        fontWeight: '700',
    },
    subtitle: {
        color: colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        alignItems: 'center',
        backgroundColor: colors.gray100,
        borderRadius: radii.full,
        height: 32,
        justifyContent: 'center',
        width: 32,
    },
    closeText: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    centerBox: {
        paddingVertical: 40,
    },
    scroll: {
        maxHeight: 360,
    },
    emptyCard: {
        alignItems: 'center',
        backgroundColor: '#fafaf9',
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 36,
    },
    emptyIconWrap: {
        alignItems: 'center',
        backgroundColor: colors.gray100,
        borderRadius: radii.full,
        height: 48,
        justifyContent: 'center',
        marginBottom: 4,
        width: 48,
    },
    emptyIcon: {
        fontSize: 22,
        opacity: 0.6,
    },
    emptyTitle: {
        color: colors.foreground,
        fontSize: 15,
        fontWeight: '600',
    },
    emptySubtitle: {
        color: colors.mutedForeground,
        fontSize: 12,
        textAlign: 'center',
    },
    list: {
        gap: 10,
    },
    cardItem: {
        alignItems: 'center',
        backgroundColor: '#fafaf9',
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        padding: 14,
    },
    cardIconWrap: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: radii.md,
        height: 38,
        justifyContent: 'center',
        width: 38,
    },
    cardIcon: {
        fontSize: 18,
    },
    cardInfo: {
        flex: 1,
    },
    cardBrand: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    cardExpiry: {
        color: colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    trashBtn: {
        padding: 8,
    },
    trashText: {
        fontSize: 16,
    },
    doneBtn: {
        alignItems: 'center',
        backgroundColor: colors.gray100,
        borderRadius: radii.full,
        marginTop: 16,
        paddingVertical: 12,
    },
    doneBtnText: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
});
