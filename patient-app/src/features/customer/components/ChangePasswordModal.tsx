import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';
import { forgotPassword } from '@/features/auth/api/auth.api';

type Props = {
    visible: boolean;
    email?: string | null;
    onClose: () => void;
};

export function ChangePasswordModal({ visible, email, onClose }: Props) {
    const [sent, setSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const safeEmail = email || '';

    const handleSendReset = async () => {
        if (!safeEmail) {
            setError('No email address found for this account.');
            return;
        }
        try {
            setError(null);
            setIsLoading(true);
            await forgotPassword(safeEmail);
            setSent(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to send password reset link.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setSent(false);
        setError(null);
        onClose();
    };

    // Masked email for display matching Private_Medi_Platform
    const emailParts = safeEmail.includes('@') ? safeEmail.split('@') : [];
    const maskedEmail =
        emailParts.length === 2
            ? `${emailParts[0].slice(0, 1)}${'*'.repeat(Math.max(emailParts[0].length - 1, 2))}@${emailParts[1]}`
            : safeEmail;

    return (
        <Modal animationType="fade" transparent visible={visible}>
            <View style={styles.backdrop}>
                <View style={styles.modalCard}>
                    <Text style={styles.title}>Change Password</Text>

                    {sent ? (
                        <View style={styles.contentWrap}>
                            <Text style={styles.description}>
                                A password reset link has been sent to your email address ({email}). Check your inbox to set a new password.
                            </Text>
                            <Pressable onPress={handleClose} style={styles.doneBtn}>
                                <Text style={styles.doneBtnText}>Done</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.contentWrap}>
                            <Text style={styles.description}>
                                We&apos;ll send a password reset link to your email address. You will be able to set a new password from that link.
                            </Text>

                            <View style={styles.emailRow}>
                                <Text style={styles.emailIcon}>✉️</Text>
                                <Text style={styles.emailText}>{maskedEmail}</Text>
                            </View>

                            {error ? <Text style={styles.errorText}>{error}</Text> : null}

                            <View style={styles.actionsRow}>
                                <Pressable disabled={isLoading} onPress={handleClose} style={styles.cancelBtn}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    disabled={isLoading}
                                    onPress={handleSendReset}
                                    style={({ pressed }) => [styles.sendBtn, pressed && styles.pressed, isLoading && styles.btnDisabled]}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={colors.primaryGreen} />
                                    ) : (
                                        <Text style={styles.sendBtnText}>Send Reset Link</Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        alignItems: 'center',
        backgroundColor: 'rgba(15, 30, 18, 0.50)',
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: colors.white,
        borderRadius: radii.xl,
        maxWidth: 360,
        padding: 24,
        width: '100%',
        ...shadows.tier3,
    },
    title: {
        color: colors.foreground,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    contentWrap: {
        gap: 12,
    },
    description: {
        color: colors.mutedForeground,
        fontSize: 13,
        lineHeight: 18,
    },
    emailRow: {
        alignItems: 'center',
        backgroundColor: colors.gray100,
        borderRadius: radii.md,
        flexDirection: 'row',
        gap: 8,
        marginVertical: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    emailIcon: {
        fontSize: 14,
    },
    emailText: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '600',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    cancelBtn: {
        alignItems: 'center',
        borderColor: colors.gray200,
        borderRadius: radii.lg,
        borderWidth: 1,
        flex: 1,
        paddingVertical: 12,
    },
    cancelBtnText: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    sendBtn: {
        alignItems: 'center',
        backgroundColor: colors.brandLime,
        borderRadius: radii.lg,
        flex: 1.2,
        paddingVertical: 12,
    },
    sendBtnText: {
        color: colors.primaryGreen,
        fontSize: 14,
        fontWeight: '700',
    },
    doneBtn: {
        alignItems: 'center',
        backgroundColor: colors.brandLime,
        borderRadius: radii.lg,
        marginTop: 8,
        paddingVertical: 12,
    },
    doneBtnText: {
        color: colors.primaryGreen,
        fontSize: 14,
        fontWeight: '700',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    pressed: {
        opacity: 0.85,
    },
});
