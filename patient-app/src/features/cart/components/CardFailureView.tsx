import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme/tokens';

interface Props {
    errorMessage?: string;
    onRetry: () => void;
    onSwitchToPayId: () => void;
    onBackToCart: () => void;
}

export function CardFailureView({
    errorMessage,
    onRetry,
    onSwitchToPayId,
    onBackToCart,
}: Props) {
    const formattedError = errorMessage || 'Your card issuer or payment processor was unable to complete this transaction. Please check your card details and try again.';

    return (
        <View style={styles.card}>
            {/* Red Warning/Failure Icon Badge */}
            <View style={styles.badgeWrapper}>
                <View style={styles.iconCircleOuter}>
                    <View style={styles.iconCircleInner}>
                        <Text style={styles.iconCross}>✕</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.title}>Payment Failed</Text>
            <Text style={styles.subtitle}>
                We could not complete your card payment. Your cart has been saved so you can retry safely without re-selecting your items.
            </Text>

            {/* Error Details Box */}
            <View style={styles.errorBox}>
                <View style={styles.errorHeader}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorTitle}>Reason for decline</Text>
                </View>
                <Text style={styles.errorText}>{formattedError}</Text>
            </View>

            {/* Recommended Alternative Banner */}
            <View style={styles.tipBox}>
                <Text style={styles.tipTitle}>💡 Alternative: Instant PayID</Text>
                <Text style={styles.tipText}>
                    You can pay instantly and fee-free using Australian PayID directly from your banking app.
                </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <Pressable
                    onPress={onRetry}
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                >
                    <Text style={styles.primaryBtnText}>Retry Card Payment ↻</Text>
                </Pressable>

                <Pressable
                    onPress={onSwitchToPayId}
                    style={({ pressed }) => [styles.payidBtn, pressed && styles.pressed]}
                >
                    <Text style={styles.payidBtnText}>Pay with PayID Instead →</Text>
                </Pressable>

                <Pressable
                    onPress={onBackToCart}
                    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                >
                    <Text style={styles.secondaryBtnText}>Return to Cart</Text>
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
    badgeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    card: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderColor: 'rgba(239, 68, 68, 0.2)',
        borderRadius: radii.xxl,
        borderWidth: 1,
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
        ...shadows.tier2,
    },
    errorBox: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        borderRadius: radii.xl,
        borderWidth: 1,
        marginVertical: spacing.md,
        padding: spacing.md,
        width: '100%',
    },
    errorHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
        marginBottom: 4,
    },
    errorIcon: {
        fontSize: 14,
    },
    errorText: {
        color: '#991b1b',
        fontFamily: typography.medium,
        fontSize: 12,
        lineHeight: 18,
    },
    errorTitle: {
        color: '#dc2626',
        fontFamily: typography.bold,
        fontSize: 12,
        textTransform: 'uppercase',
    },
    iconCircleInner: {
        alignItems: 'center',
        backgroundColor: '#ef4444',
        borderRadius: radii.full,
        height: 56,
        justifyContent: 'center',
        width: 56,
    },
    iconCircleOuter: {
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderRadius: radii.full,
        height: 76,
        justifyContent: 'center',
        width: 76,
    },
    iconCross: {
        color: '#ffffff',
        fontFamily: typography.bold,
        fontSize: 28,
        lineHeight: 32,
    },
    payidBtn: {
        alignItems: 'center',
        backgroundColor: 'rgba(14, 48, 23, 0.08)',
        borderColor: 'rgba(14, 48, 23, 0.2)',
        borderRadius: radii.xl,
        borderWidth: 1,
        justifyContent: 'center',
        paddingVertical: 13,
        width: '100%',
    },
    payidBtnText: {
        color: colors.primaryGreen,
        fontFamily: typography.bold,
        fontSize: 14,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    primaryBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.xl,
        justifyContent: 'center',
        paddingVertical: 14,
        width: '100%',
        ...shadows.tier2,
    },
    primaryBtnText: {
        color: '#ffffff',
        fontFamily: typography.bold,
        fontSize: 14,
    },
    secondaryBtn: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: radii.xl,
        borderWidth: 1,
        justifyContent: 'center',
        paddingVertical: 12,
        width: '100%',
    },
    secondaryBtnText: {
        color: colors.mutedForeground,
        fontFamily: typography.semiBold,
        fontSize: 13,
    },
    subtitle: {
        color: colors.mutedForeground,
        fontFamily: typography.regular,
        fontSize: 13,
        lineHeight: 19,
        marginTop: 6,
        textAlign: 'center',
    },
    tipBox: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
        borderRadius: radii.lg,
        borderWidth: 1,
        marginBottom: spacing.sm,
        padding: spacing.md,
        width: '100%',
    },
    tipText: {
        color: '#1e40af',
        fontFamily: typography.regular,
        fontSize: 12,
        lineHeight: 17,
        marginTop: 2,
    },
    tipTitle: {
        color: '#1e3a8a',
        fontFamily: typography.bold,
        fontSize: 12,
    },
    title: {
        color: '#b91c1c',
        fontFamily: typography.extraBold,
        fontSize: 22,
        textAlign: 'center',
    },
});
