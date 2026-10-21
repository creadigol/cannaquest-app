import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';
import { SignatureModal } from '@/features/customer/components/SignatureModal';
import { SignatureDisplay } from '@/features/customer/components/SignatureDisplay';

type Props = {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerDob?: string;
    medicareNumber?: string;
    existingSignature?: string | null;
    onConsentCompleted: (signatureData: string) => Promise<void>;
    isSubmitting?: boolean;
};

export function PrivacyConsentStep({
    customerName,
    customerEmail,
    customerPhone,
    customerDob,
    medicareNumber,
    existingSignature,
    onConsentCompleted,
    isSubmitting = false,
}: Props) {
    const [consentChecked, setConsentChecked] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(existingSignature || null);
    const [signatureModalVisible, setSignatureModalVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Keep signature in sync if fetched asynchronously
    React.useEffect(() => {
        if (existingSignature && !signatureData) {
            setSignatureData(existingSignature);
        }
    }, [existingSignature]);

    const handleSubmit = async () => {
        if (!consentChecked) {
            setError('Please confirm you have read the Privacy Policy before proceeding.');
            return;
        }

        if (!signatureData) {
            setError('Please provide your digital signature before continuing.');
            return;
        }

        setError(null);
        try {
            await onConsentCompleted(signatureData);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save privacy consent.');
        }
    };

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={styles.iconCircle}>
                    <Text style={styles.icon}>📋</Text>
                </View>
                <View style={styles.headerTextCol}>
                    <Text style={styles.title}>Privacy Consent Form</Text>
                    <Text style={styles.subtitle}>MC-PCF-001 v2.0 — Please read and sign to continue</Text>
                </View>
            </View>

            {/* Patient Information Box (Matching Privacy_Consent_Form_Medicinal_Cannabis.pdf template fields) */}
            <View style={styles.patientInfoBox}>
                <View style={styles.patientInfoGrid}>
                    <View style={styles.patientInfoRow}>
                        <Text style={styles.patientInfoLabel}>Patient Full Name:</Text>
                        <Text style={styles.patientInfoValue}>{customerName || '—'}</Text>
                    </View>
                    <View style={styles.patientInfoRow}>
                        <Text style={styles.patientInfoLabel}>Date of Birth:</Text>
                        <Text style={styles.patientInfoValue}>{customerDob || '—'}</Text>
                    </View>
                    <View style={styles.patientInfoRow}>
                        <Text style={styles.patientInfoLabel}>Date:</Text>
                        <Text style={styles.patientInfoValue}>
                            {new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </Text>
                    </View>
                    {medicareNumber ? (
                        <View style={styles.patientInfoRow}>
                            <Text style={styles.patientInfoLabel}>Medicare Number:</Text>
                            <Text style={styles.patientInfoValue}>{medicareNumber}</Text>
                        </View>
                    ) : null}
                </View>
            </View>

            {/* Scrollable Legal Consent Body */}
            <View style={styles.legalBox}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={styles.legalScroll}>
                    <Text style={styles.legalItalic}>
                        Collection, Use, Storage and Disclosure of Personal and Health Information — Medicinal Cannabis
                        Telehealth Clinical Services — Australia-Wide
                    </Text>

                    <Text style={styles.legalHeading}>1. Parties, Scope and Ongoing Consent</Text>
                    <Text style={styles.legalText}>
                        This Privacy Consent Form governs the collection, use, storage, disclosure and handling of your
                        personal information and health information in connection with the assessment for, prescribing
                        of, and ongoing management of medicinal cannabis and related telehealth clinical services
                        anywhere in Australia. By signing you provide free, informed and ongoing consent to the handling
                        of your information as described in this Form. This consent remains in force until withdrawn in
                        writing.
                    </Text>

                    <Text style={styles.legalHeading}>2. Legislative Framework</Text>
                    <Text style={styles.legalText}>
                        The Clinic handles your information in accordance with the Privacy Act 1988 (Cth), the Australian
                        Privacy Principles (APPs), and applicable health records and privacy legislation of each Australian
                        State and Territory.
                    </Text>

                    <Text style={styles.legalHeading}>3. Purpose of Collection</Text>
                    <Text style={styles.legalText}>
                        Information is collected to provide clinical assessment and treatment; assess eligibility under TGA
                        pathways; enable safe prescribing and dispensing of Schedule 8 medicines; comply with regulatory
                        and prescription monitoring obligations; and for practice administration and quality assurance.
                    </Text>

                    <Text style={styles.legalHeading}>4. Nature of Information Collected</Text>
                    <Text style={styles.legalText}>
                        May include: personal identification and contact details; medical, clinical and treatment
                        history; medication and prescribing history; mental health and substance use history; diagnostic
                        results; Medicare identifiers; consultation notes and treatment plans.
                    </Text>

                    <Text style={styles.legalHeading}>5–6. Method of Collection &amp; Use</Text>
                    <Text style={styles.legalText}>
                        Information may be collected directly from you, from other practitioners, via digital platforms
                        and telehealth systems. It may be used for clinical decision-making, quality assurance, staff
                        training (de-identified), and research (de-identified unless additional consent is obtained).
                    </Text>

                    <Text style={styles.legalHeading}>7. Disclosure</Text>
                    <Text style={styles.legalText}>
                        Information may be disclosed to treating practitioners; pharmacies; the TGA and regulators;
                        Medicare and insurers; diagnostic providers; accreditation bodies; IT and cloud service
                        providers; and any person required by law.
                    </Text>

                    <Text style={styles.legalHeading}>8. Overseas Storage</Text>
                    <Text style={styles.legalText}>
                        Information may be stored or processed outside Australia via cloud-based systems. The Clinic will
                        take reasonable steps to ensure overseas recipients comply with the Australian Privacy
                        Principles. You expressly consent to such overseas storage.
                    </Text>

                    <Text style={styles.legalHeading}>9. Telehealth &amp; Electronic Communications</Text>
                    <Text style={styles.legalText}>
                        You consent to telehealth consultations and electronic communications. You acknowledge the
                        inherent limitations of telehealth including absence of in-person examination and technology
                        risks. This service is not an emergency service — in a medical emergency dial 000.
                    </Text>

                    <Text style={styles.legalHeading}>10. Storage, Security &amp; Retention</Text>
                    <Text style={styles.legalText}>
                        Records are retained for a minimum of seven (7) years from last clinical contact. Reasonable
                        technical and administrative safeguards are applied. No system can be guaranteed completely
                        secure.
                    </Text>

                    <Text style={styles.legalHeading}>15. Electronic Signature</Text>
                    <Text style={styles.legalText}>
                        This Form may be signed electronically. An electronic signature has the same legal effect as a
                        handwritten signature.
                    </Text>

                    <View style={styles.declarationHighlight}>
                        <Text style={styles.declarationHeading}>16. Patient Declaration</Text>
                        <Text style={styles.declarationText}>
                            By signing below I confirm that: (a) I have read and understood this Form; (b) I have had a
                            reasonable opportunity to ask questions; (c) I understand the nature of the information
                            collected and purposes for use and disclosure; (d) I provide my free and informed consent; and
                            (e) I understand this consent is ongoing until withdrawn in writing, and that continued
                            treatment is conditional upon this consent remaining in place.
                        </Text>
                    </View>
                </ScrollView>
            </View>

            {/* Privacy Checkbox */}
            <Pressable
                style={styles.checkboxRow}
                onPress={() => setConsentChecked((prev) => !prev)}
            >
                <View style={[styles.checkboxSquare, consentChecked && styles.checkboxSquareSelected]}>
                    {consentChecked ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.checkboxLabel}>
                    I confirm that I have read the{' '}
                    <Text
                        style={styles.linkText}
                        onPress={() => Linking.openURL('https://patient.cannaquest.com.au/privacy-policy')}
                    >
                        Privacy Policy
                    </Text>
                    . By continuing, you agree that your information will be handled in accordance with our Privacy
                    Policy.
                </Text>
            </Pressable>

            {/* Signature Area */}
            <View style={styles.signatureSection}>
                <View style={styles.signatureHeaderRow}>
                    <Text style={styles.signatureLabel}>Digital Signature *</Text>
                    {signatureData ? (
                        <View style={styles.savedBadge}>
                            <Text style={styles.savedBadgeText}>✓ Signature on file</Text>
                        </View>
                    ) : null}
                </View>
                {signatureData ? (
                    <View style={styles.signaturePreviewBox}>
                        <View style={styles.sigPreviewInner}>
                            <SignatureDisplay signature={signatureData} imageStyle={styles.signatureImage} />
                        </View>
                        <Text style={styles.signatureHelpText}>
                            Your signature is saved on file and will be used for your clinical documents.
                        </Text>
                        <Pressable
                            style={({ pressed }) => [styles.changeSigBtn, pressed && styles.pressed]}
                            onPress={() => setSignatureModalVisible(true)}
                        >
                            <Text style={styles.changeSigBtnText}>✍️ Update or Draw New Signature</Text>
                        </Pressable>
                    </View>
                ) : (
                    <Pressable
                        style={({ pressed }) => [styles.addSigBtn, pressed && styles.pressed]}
                        onPress={() => setSignatureModalVisible(true)}
                    >
                        <Text style={styles.addSigIcon}>✍️</Text>
                        <Text style={styles.addSigText}>Draw, Type, or Upload Signature</Text>
                        <Text style={styles.addSigSubtext}>We will save this securely for future consent forms</Text>
                    </Pressable>
                )}
            </View>

            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            {/* Complete Submission Button */}
            <Pressable
                style={[
                    styles.submitBtn,
                    (!consentChecked || !signatureData || isSubmitting) && styles.submitBtnDisabled,
                ]}
                disabled={!consentChecked || !signatureData || isSubmitting}
                onPress={handleSubmit}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text style={styles.submitBtnText}>✓ I Agree — Sign &amp; Complete</Text>
                )}
            </Pressable>

            {/* Signature Modal */}
            <SignatureModal
                visible={signatureModalVisible}
                onClose={() => setSignatureModalVisible(false)}
                onSave={async (newSig) => {
                    setSignatureData(newSig);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 20,
        ...shadows.tier1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    icon: {
        fontSize: 22,
    },
    headerTextCol: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.foreground,
    },
    subtitle: {
        fontSize: 12,
        color: colors.mutedForeground,
        marginTop: 2,
    },
    patientInfoBox: {
        backgroundColor: colors.surfaceCardBg,
        borderWidth: 1,
        borderColor: colors.surfaceCardBorder,
        borderRadius: radii.lg,
        padding: 12,
        marginBottom: 14,
    },
    patientInfoGrid: {
        gap: 6,
    },
    patientInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    patientInfoLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.mutedForeground,
    },
    patientInfoValue: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.foreground,
    },
    legalBox: {
        height: 240,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        backgroundColor: colors.secondary,
        padding: 14,
        marginBottom: 16,
    },
    legalScroll: {
        flex: 1,
    },
    legalItalic: {
        fontSize: 11,
        fontStyle: 'italic',
        color: colors.mutedForeground,
        textAlign: 'center',
        marginBottom: 12,
    },
    legalHeading: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.foreground,
        marginTop: 10,
        marginBottom: 4,
    },
    legalText: {
        fontSize: 12,
        lineHeight: 18,
        color: colors.mutedForeground,
        marginBottom: 6,
    },
    declarationHighlight: {
        backgroundColor: 'rgba(14, 48, 23, 0.06)',
        borderWidth: 1,
        borderColor: colors.primaryGreen,
        borderRadius: radii.md,
        padding: 12,
        marginTop: 12,
        marginBottom: 10,
    },
    declarationHeading: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.primaryGreen,
        marginBottom: 4,
    },
    declarationText: {
        fontSize: 12,
        lineHeight: 18,
        color: colors.foreground,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        padding: 12,
        marginBottom: 16,
    },
    checkboxSquare: {
        width: 22,
        height: 22,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        marginTop: 2,
    },
    checkboxSquareSelected: {
        backgroundColor: colors.primaryGreen,
        borderColor: colors.primaryGreen,
    },
    checkmark: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '900',
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        color: colors.foreground,
    },
    linkText: {
        color: colors.primaryGreen,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    signatureSection: {
        marginBottom: 16,
    },
    signatureHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    signatureLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.foreground,
    },
    savedBadge: {
        backgroundColor: colors.emeraldChipBg,
        borderColor: colors.emeraldChipBorder,
        borderWidth: 1,
        borderRadius: radii.full,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    savedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.emeraldChipText,
    },
    signaturePreviewBox: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sigPreviewInner: {
        width: '100%',
        minHeight: 65,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafaf9',
        borderRadius: radii.md,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
    },
    signatureHelpText: {
        fontSize: 11,
        color: colors.mutedForeground,
        marginTop: 8,
        textAlign: 'center',
    },
    signatureImage: {
        width: '100%',
        height: 70,
    },
    signatureTypedText: {
        fontSize: 26,
        fontStyle: 'italic',
        fontWeight: '600',
        color: colors.foreground,
        paddingVertical: 6,
    },
    changeSigBtn: {
        marginTop: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radii.full,
        backgroundColor: colors.emeraldChipBg,
        borderWidth: 1,
        borderColor: colors.emeraldChipBorder,
    },
    changeSigBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primaryGreen,
    },
    addSigBtn: {
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.primaryGreen,
        borderRadius: radii.lg,
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addSigIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    addSigText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primaryGreen,
    },
    addSigSubtext: {
        fontSize: 11,
        color: colors.mutedForeground,
        marginTop: 4,
        textAlign: 'center',
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    errorBanner: {
        fontSize: 13,
        color: colors.destructive,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    submitBtn: {
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.full,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.tier2,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
    },
});
