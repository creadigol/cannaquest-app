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
import { getS3PresignedUrl } from '@/features/customer/api/s3ComplianceService';

// Category thumbnails
const jarImg = require('@/../assets/images/product-categories/jar.webp');
const oilImg = require('@/../assets/images/product-categories/oil.webp');
const edibleImg = require('@/../assets/images/product-categories/edible.webp');
const deviceImg = require('@/../assets/images/product-categories/device.webp');

interface Props {
    item: CartItem;
    onUpdateQuantity: (quantity: number) => void;
    onRemove: () => void;
    isUpdating?: boolean;
}

export function CartItemCard({ item, onUpdateQuantity, onRemove, isUpdating }: Props) {
    const prod = item.product;
    const cat = (prod?.category || prod?.form || '').toLowerCase();
    const isDevice = prod?.isAddonDevice || prod?.is_addon_device || cat.includes('device');

    let imageSrc = jarImg;
    if (isDevice) {
        imageSrc = deviceImg;
    } else if (cat.includes('oil') || cat.includes('tincture') || cat.includes('vape')) {
        imageSrc = oilImg;
    } else if (cat.includes('edible') || cat.includes('gummy') || cat.includes('capsule')) {
        imageSrc = edibleImg;
    }

    const price = Number(
        prod?.unitPrice ?? prod?.unit_price ?? prod?.retailPrice ?? prod?.retail_price ?? item.price ?? 0
    );
    const lineTotal = price * (item.quantity || 1);
    const isPrescribed = item.source === 'prescription' || Boolean(item.uploadPrescriptionId || item.prescriptionId);

    const handleMinus = () => {
        if (isUpdating) return;
        if (item.quantity <= 1) {
            onRemove();
        } else {
            onUpdateQuantity(item.quantity - 1);
        }
    };

    const handlePlus = () => {
        if (isUpdating) return;
        onUpdateQuantity((Number(item.quantity) || 1) + 1);
    };

    return (
        <View style={styles.card}>
            {/* Top row: Image, Title, Price */}
            <View style={styles.cardHeader}>
                <View style={styles.thumbContainer}>
                    {(() => {
                        const rawImg = prod?.imageUrl || prod?.image_url;
                        if (rawImg && typeof rawImg === 'string' && rawImg.trim().length > 0) {
                            const trimmed = rawImg.trim();
                            const rawUri = trimmed.startsWith('http://') || trimmed.startsWith('https://')
                                ? trimmed
                                : `https://cannaquest-storage.s3.ap-southeast-2.amazonaws.com/${trimmed.replace(/^\/+/, '')}`;
                            const uri = getS3PresignedUrl(rawUri);
                            return (
                                <Image
                                    resizeMode="contain"
                                    source={{ uri }}
                                    style={styles.thumbImage}
                                />
                            );
                        }
                        return <Image resizeMode="contain" source={imageSrc} style={styles.thumbImage} />;
                    })()}
                </View>

                <View style={styles.detailsCol}>
                    <View style={styles.titleRow}>
                        <Text numberOfLines={2} style={styles.productTitle}>
                            {prod?.name || item.name || 'Prescription Product'}
                        </Text>
                        <Pressable
                            disabled={isUpdating}
                            hitSlop={10}
                            onPress={onRemove}
                            style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                        >
                            {isUpdating ? (
                                <ActivityIndicator color={colors.destructive} size="small" />
                            ) : (
                                <Text style={styles.deleteIcon}>✕</Text>
                            )}
                        </Pressable>
                    </View>

                    {prod?.brand || item.brand ? (
                        <Text numberOfLines={1} style={styles.brandText}>
                            {prod?.brand || item.brand}
                        </Text>
                    ) : null}

                    <View style={styles.tagRow}>
                        {isPrescribed ? (
                            <View style={styles.rxBadge}>
                                <Text style={styles.rxBadgeText}>Prescribed Repeat</Text>
                            </View>
                        ) : null}

                        {prod?.strength || item.strength ? (
                            <View style={styles.strengthTag}>
                                <Text style={styles.strengthTagText}>{prod?.strength || item.strength}</Text>
                            </View>
                        ) : null}
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
                                <Text style={styles.quantityNumber}>{item.quantity}</Text>
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
                            🔒 Fixed {item.quantity} {item.quantity === 1 ? 'unit' : 'units'} per fill
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
