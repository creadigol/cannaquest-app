import React from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme/tokens';
import type { CartItem } from '../api/cart.types';
import { getS3PresignedUrl, S3_BASE_URL } from '@/features/customer/api/s3ComplianceService';

// Category thumbnails
const jarImg = require('../../../../assets/images/product-categories/jar.webp');
const oilImg = require('../../../../assets/images/product-categories/oil.webp');
const edibleImg = require('../../../../assets/images/product-categories/edible.webp');
const deviceImg = require('../../../../assets/images/product-categories/device.webp');

interface Props {
    item: CartItem;
    onUpdateQuantity: (quantity: number) => void;
    onRemove: () => void;
    isUpdating?: boolean;
}

function safeString(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        if (typeof obj.name === 'string') return obj.name;
        if (typeof obj.value === 'string') return obj.value;
        if (typeof obj.label === 'string') return obj.label;
        if (typeof obj.title === 'string') return obj.title;
    }
    return '';
}

export function CartItemCard({ item, onUpdateQuantity, onRemove, isUpdating }: Props) {
    const prod = item?.product;
    const catStr = (safeString(prod?.category) || safeString(prod?.form) || safeString(item?.form) || '').toLowerCase();
    const isDevice = Boolean(prod?.isAddonDevice || prod?.is_addon_device || catStr.includes('device'));

    let imageSrc = jarImg;
    if (isDevice) {
        imageSrc = deviceImg;
    } else if (catStr.includes('oil') || catStr.includes('tincture') || catStr.includes('vape')) {
        imageSrc = oilImg;
    } else if (catStr.includes('edible') || catStr.includes('gummy') || catStr.includes('capsule')) {
        imageSrc = edibleImg;
    }

    const rawPrice = Number(
        prod?.unitPrice ?? prod?.unit_price ?? prod?.retailPrice ?? prod?.retail_price ?? item?.price ?? 0
    );
    const price = Number.isFinite(rawPrice) ? rawPrice : 0;
    const rawQty = Number(item?.quantity);
    const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
    const lineTotal = price * qty;
    const isPrescribed = item?.source === 'prescription' || Boolean(item?.uploadPrescriptionId || item?.prescriptionId);

    const handleMinus = () => {
        if (isUpdating) return;
        if (qty <= 1) {
            onRemove?.();
        } else {
            onUpdateQuantity?.(qty - 1);
        }
    };

    const handlePlus = () => {
        if (isUpdating) return;
        onUpdateQuantity?.(qty + 1);
    };

    const rawImg = prod?.imageUrl || prod?.image_url || item?.imageUrl;
    let validImageUri: string | null = null;
    if (typeof rawImg === 'string' && rawImg.trim().length > 0) {
        const trimmed = rawImg.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image')) {
            validImageUri = trimmed;
        }
    }

    const title = safeString(prod?.name) || safeString(item?.name) || 'Prescription Product';
    const brand = safeString(prod?.brand) || safeString(item?.brand);
    const strength = safeString(prod?.strength) || safeString(item?.strength);

    return (
        <View style={styles.card}>
            {/* Top row: Image, Title, Price */}
            <View style={styles.cardHeader}>
                <View style={styles.thumbContainer}>
                    <Image
                        resizeMode="contain"
                        source={validImageUri ? { uri: validImageUri } : imageSrc}
                        style={styles.thumbImage}
                    />
                </View>

                <View style={styles.detailsCol}>
                    <View style={styles.titleRow}>
                        <Text numberOfLines={2} style={styles.productTitle}>
                            {title}
                        </Text>
                        <Pressable
                            disabled={isUpdating}
                            hitSlop={10}
                            onPress={() => onRemove?.()}
                            style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                        >
                            {isUpdating ? (
                                <ActivityIndicator color={colors.destructive} size="small" />
                            ) : (
                                <Text style={styles.deleteIcon}>✕</Text>
                            )}
                        </Pressable>
                    </View>

                    {Boolean(brand) && (
                        <Text numberOfLines={1} style={styles.brandText}>
                            {brand}
                        </Text>
                    )}

                    <View style={styles.tagRow}>
                        {isPrescribed ? (
                            <View style={styles.rxBadge}>
                                <Text style={styles.rxBadgeText}>Prescribed Repeat</Text>
                            </View>
                        ) : null}

                        {Boolean(strength) && (
                            <View style={styles.strengthTag}>
                                <Text style={styles.strengthTagText}>{strength}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Bottom Row: Stepper and Line Price */}
            <View style={styles.cardFooter}>
                {!isPrescribed ? (
                    <View style={styles.stepperContainer}>
                        <Pressable
                            disabled={isUpdating}
                            hitSlop={8}
                            onPress={handleMinus}
                            style={({ pressed }) => [
                                styles.stepperButton,
                                isUpdating && styles.stepperButtonDisabled,
                                pressed && styles.pressed,
                            ]}
                        >
                            <Text style={styles.stepperButtonText}>−</Text>
                        </Pressable>

                        <View style={styles.quantityBox}>
                            {isUpdating ? (
                                <ActivityIndicator color={colors.primaryGreen} size="small" />
                            ) : (
                                <Text style={styles.quantityNumber}>{qty}</Text>
                            )}
                        </View>

                        <Pressable
                            disabled={isUpdating}
                            hitSlop={8}
                            onPress={handlePlus}
                            style={({ pressed }) => [
                                styles.stepperButton,
                                isUpdating && styles.stepperButtonDisabled,
                                pressed && styles.pressed,
                            ]}
                        >
                            <Text style={styles.stepperButtonText}>+</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.prescribedNoteBox}>
                        <Text style={styles.prescribedNoteText}>
                            🔒 Fixed {qty} {qty === 1 ? 'unit' : 'units'} per fill
                        </Text>
                    </View>
                )}

                <View style={styles.priceContainer}>
                    <Text style={styles.eachPrice}>${price.toFixed(2)} each</Text>
                    <Text style={styles.totalPrice}>${lineTotal.toFixed(2)}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderColor: 'rgba(0, 0, 0, 0.07)',
        borderRadius: radii.xl,
        borderWidth: 1,
        marginBottom: spacing.md,
        padding: spacing.md,
        ...shadows.tier1,
    },
    cardHeader: {
        flexDirection: 'row',
        gap: 12,
    },
    thumbContainer: {
        alignItems: 'center',
        backgroundColor: colors.secondary,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: radii.lg,
        borderWidth: 1,
        height: 68,
        justifyContent: 'center',
        overflow: 'hidden',
        width: 68,
    },
    thumbImage: {
        height: '82%',
        width: '82%',
    },
    detailsCol: {
        flex: 1,
        justifyContent: 'center',
    },
    titleRow: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    productTitle: {
        color: colors.foreground,
        flex: 1,
        fontFamily: typography.bold,
        fontSize: 15,
        lineHeight: 20,
        marginRight: 6,
    },
    deleteBtn: {
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderRadius: radii.full,
        height: 24,
        justifyContent: 'center',
        width: 24,
    },
    deleteIcon: {
        color: '#dc2626',
        fontSize: 11,
        fontWeight: '800',
    },
    brandText: {
        color: colors.mutedForeground,
        fontFamily: typography.medium,
        fontSize: 12,
        marginTop: 2,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
    },
    rxBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderRadius: radii.sm,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    rxBadgeText: {
        color: '#15803d',
        fontFamily: typography.bold,
        fontSize: 10,
    },
    strengthTag: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderRadius: radii.sm,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    strengthTagText: {
        color: colors.foreground,
        fontFamily: typography.medium,
        fontSize: 10,
    },
    divider: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        height: 1,
        marginVertical: 12,
    },
    cardFooter: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepperContainer: {
        alignItems: 'center',
        backgroundColor: colors.secondary,
        borderColor: 'rgba(0, 0, 0, 0.06)',
        borderRadius: radii.full,
        borderWidth: 1,
        flexDirection: 'row',
        paddingHorizontal: 3,
        paddingVertical: 3,
    },
    stepperButton: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        elevation: 1,
        height: 28,
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        width: 28,
    },
    stepperButtonDisabled: {
        opacity: 0.4,
    },
    stepperButtonText: {
        color: colors.foreground,
        fontFamily: typography.bold,
        fontSize: 16,
        lineHeight: 18,
    },
    quantityBox: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 32,
        paddingHorizontal: 6,
    },
    quantityNumber: {
        color: colors.foreground,
        fontFamily: typography.extraBold,
        fontSize: 14,
    },
    prescribedNoteBox: {
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
        borderRadius: radii.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    prescribedNoteText: {
        color: '#15803d',
        fontFamily: typography.semiBold,
        fontSize: 11,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    eachPrice: {
        color: colors.mutedForeground,
        fontFamily: typography.regular,
        fontSize: 11,
    },
    totalPrice: {
        color: colors.primaryGreen,
        fontFamily: typography.bold,
        fontSize: 17,
        marginTop: 1,
    },
    pressed: {
        opacity: 0.75,
        transform: [{ scale: 0.96 }],
    },
});
