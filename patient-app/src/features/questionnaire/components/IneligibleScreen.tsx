import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';

type Props = {
    message?: string;
    onStartAgain: () => void;
    onBackToDashboard: () => void;
};

export function IneligibleScreen({ message, onStartAgain, onBackToDashboard }: Props) {
    const defaultDecline =
        'Thank you for your interest. Based on the information provided, medicinal cannabis may not be suitable at this time due to safety considerations. We recommend discussing alternative treatments with your GP or a specialist. For more information, visit health.vic.gov.au or tga.gov.au.';

    return (
        <View style={styles.card}>
            <View style={styles.iconCircle}>
                <Text style={styles.iconText}>⚠️</Text>
            </View>

            <Text style={styles.title}>Unable to Proceed</Text>
            <Text style={styles.description}>{message || defaultDecline}</Text>

            {/* Official Resources */}
            <View style={styles.resourceRow}>
                <Pressable
                    style={styles.resourceBtn}
                    onPress={() => Linking.openURL('https://www.health.vic.gov.au')}
                >
                    <Text style={styles.resourceText}>🌐 health.vic.gov.au ↗</Text>
                </Pressable>

                <Pressable
                    style={styles.resourceBtn}
                    onPress={() => Linking.openURL('https://www.tga.gov.au')}
                >
                    <Text style={styles.resourceText}>🌐 tga.gov.au ↗</Text>
                </Pressable>
            </View>

            {/* Support info */}
            <View style={styles.divider} />
            <Text style={styles.supportNote}>
                If you believe this is an error, please contact our clinical support team at{' '}
                <Text
                    style={styles.supportEmail}
                    onPress={() => Linking.openURL('mailto:support@cannaquest.com.au')}
                >
                    support@cannaquest.com.au
                </Text>
            </Text>

            {/* Action buttons */}
            <View style={styles.actionRow}>
                <Pressable style={styles.btnSecondary} onPress={onBackToDashboard}>
                    <Text style={styles.btnSecondaryText}>Back to Dashboard</Text>
                </Pressable>
                <Pressable style={styles.btnPrimary} onPress={onStartAgain}>
                    <Text style={styles.btnPrimaryText}>Start Again</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 24,
        alignItems: 'center',
        ...shadows.tier2,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fef3c7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    iconText: {
        fontSize: 28,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.foreground,
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        lineHeight: 22,
        color: colors.mutedForeground,
        textAlign: 'center',
        marginBottom: 20,
    },
    resourceRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        marginBottom: 20,
    },
    resourceBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: radii.full,
        backgroundColor: colors.secondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    resourceText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primaryGreen,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 16,
    },
    supportNote: {
        fontSize: 12,
        color: colors.mutedForeground,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
    },
    supportEmail: {
        color: colors.primaryGreen,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    btnSecondary: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: radii.full,
        backgroundColor: colors.secondary,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    btnSecondaryText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.foreground,
    },
    btnPrimary: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: radii.full,
        backgroundColor: colors.primaryGreen,
        alignItems: 'center',
    },
    btnPrimaryText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
    },
});
