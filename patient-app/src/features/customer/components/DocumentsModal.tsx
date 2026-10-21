import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';
import { useCustomerDocuments } from '../hooks/useCustomerMutations';
import { useCurrentCustomer } from '../hooks/useCurrentCustomer';
import { useDashboardSummary } from '@/features/dashboard/hooks/useDashboardSummary';
import { SignatureDisplay } from './SignatureDisplay';
import { fetchSignedDocumentFromS3, uploadSignedDocumentToS3, type SignedPrivacyDocument } from '../api/s3ComplianceService';

type Props = {
    visible: boolean;
    onClose: () => void;
};

export function DocumentsModal({ visible, onClose }: Props) {
    const { data: documents = [], isLoading } = useCustomerDocuments();
    const { data: customer } = useCurrentCustomer();
    const { data: dashboard } = useDashboardSummary();

    const [viewingPrivacyDoc, setViewingPrivacyDoc] = React.useState(false);
    const [s3Doc, setS3Doc] = React.useState<SignedPrivacyDocument | null>(null);
    const [isLoadingS3Doc, setIsLoadingS3Doc] = React.useState(false);

    const hasCompletedPrivacyConsent = Boolean(
        customer?.signature ||
        dashboard?.questionnaireCompleted
    );

    // Fetch or sync the document directly from AWS S3 using user's ID
    React.useEffect(() => {
        if (!visible || !hasCompletedPrivacyConsent) return;

        const userId = customer?.id || 'current';

        let isMounted = true;
        setIsLoadingS3Doc(true);

        fetchSignedDocumentFromS3(userId)
            .then(async (fetched) => {
                if (!isMounted) return;
                if (fetched) {
                    setS3Doc(fetched);
                } else if (customer?.signature) {
                    // Upload the document directly to AWS S3 bucket: cannaquest-storage/compliance-forms/signed_documents/{id}
                    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Patient';
                    const docPayload: SignedPrivacyDocument = {
                        id: userId,
                        patientFullName: fullName,
                        dateOfBirth: customer.dateOfBirth ?? undefined,
                        medicareNumber: customer.medicareNumber ?? undefined,
                        formRef: 'MC-PCF-001',
                        version: '2.0',
                        title: 'Privacy Consent Form (Medicinal Cannabis)',
                        signedAt: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        signature: customer.signature,
                        clauses: {
                            partiesAndScope: 'This Privacy Consent Form governs the collection, use, storage, disclosure and handling of your personal information and health information in connection with the assessment for, prescribing of, and ongoing management of medicinal cannabis and related telehealth clinical services anywhere in Australia. By signing you provide free, informed and ongoing consent to the handling of your information as described in this Form. This consent remains in force until withdrawn in writing.',
                            legislativeFramework: 'The Clinic handles your information in accordance with the Privacy Act 1988 (Cth), the Australian Privacy Principles (APPs), and applicable health records and privacy legislation of each Australian State and Territory.',
                            purposeOfCollection: 'Information is collected to provide clinical assessment and treatment; assess eligibility under TGA pathways; enable safe prescribing and dispensing of Schedule 8 medicines; comply with regulatory and prescription monitoring obligations; and for practice administration and quality assurance.',
                            natureOfInformation: 'May include: personal identification and contact details; medical, clinical and treatment history; medication and prescribing history; mental health and substance use history; diagnostic results; Medicare identifiers; consultation notes and treatment plans.',
                            disclosure: 'Information may be disclosed to treating practitioners; pharmacies; the TGA and regulators; Medicare and insurers; diagnostic providers; and any body required by law.'
                        }
                    };
                    await uploadSignedDocumentToS3(userId, docPayload);
                    if (isMounted) setS3Doc(docPayload);
                }
            })
            .catch((err) => {
                console.warn('Error fetching document from AWS S3:', err);
            })
            .finally(() => {
                if (isMounted) setIsLoadingS3Doc(false);
            });

        return () => {
            isMounted = false;
        };
    }, [visible, hasCompletedPrivacyConsent, customer?.id, customer?.signature]);

    const handleOpenDocument = async (url?: string) => {
        if (!url) {
            Alert.alert('Notice', 'Document link is being prepared by your clinic.');
            return;
        }

        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'Unable to open document file.');
        }
    };

    const patientFullName = s3Doc?.patientFullName || (customer
        ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Patient'
        : 'Patient');

    return (
        <Modal animationType="slide" transparent visible={visible}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>My Documents</Text>
                            <Text style={styles.subtitle}>Signed compliance & clinical documents</Text>
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
                            <View style={styles.list}>
                                {/* Signed Privacy Consent Form from AWS S3 Template */}
                                {hasCompletedPrivacyConsent ? (
                                    <Pressable
                                        onPress={() => setViewingPrivacyDoc(true)}
                                        style={({ pressed }) => [styles.docItem, styles.privacyDocItem, pressed && styles.pressed]}
                                    >
                                        <View style={[styles.docIconWrap, styles.privacyDocIconWrap]}>
                                            <Text style={styles.docIcon}>📋</Text>
                                        </View>
                                        <View style={styles.docInfo}>
                                            <View style={styles.docTitleRow}>
                                                <Text numberOfLines={1} style={styles.docTitle}>
                                                    Privacy Consent Form (Medicinal Cannabis)
                                                </Text>
                                                <View style={styles.signedBadge}>
                                                    <Text style={styles.signedBadgeText}>Signed</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.docDate}>
                                                Patient: {patientFullName} • Ref: MC-PCF-001 v2.0
                                            </Text>
                                        </View>
                                        <Text style={styles.chevron}>👁</Text>
                                    </Pressable>
                                ) : null}

                                {/* Other clinical compliance documents returned by API */}
                                {documents.map((doc) => (
                                    <Pressable
                                        key={doc.id}
                                        onPress={() => handleOpenDocument(doc.fileUrl)}
                                        style={({ pressed }) => [styles.docItem, pressed && styles.pressed]}
                                    >
                                        <View style={styles.docIconWrap}>
                                            <Text style={styles.docIcon}>📄</Text>
                                        </View>
                                        <View style={styles.docInfo}>
                                            <Text numberOfLines={1} style={styles.docTitle}>
                                                {doc.type?.name || doc.title || 'Consent Form'}
                                            </Text>
                                            <Text style={styles.docDate}>
                                                {doc.signedAt ? `Signed ${doc.signedAt}` : 'Available on file'}
                                            </Text>
                                        </View>
                                        <Text style={styles.chevron}>↗</Text>
                                    </Pressable>
                                ))}

                                {!hasCompletedPrivacyConsent && documents.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <View style={styles.emptyIconWrap}>
                                            <Text style={styles.emptyIcon}>📄</Text>
                                        </View>
                                        <Text style={styles.emptyTitle}>No documents on file yet</Text>
                                        <Text style={styles.emptySubtitle}>
                                            Complete your questionnaire and medical assessment to sign and file your privacy consent.
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </ScrollView>
                    )}

                    <Pressable onPress={onClose} style={styles.doneBtn}>
                        <Text style={styles.doneBtnText}>Close</Text>
                    </Pressable>
                </View>
            </View>

            {/* Document Viewer Modal for Signed Privacy Consent Form */}
            <Modal animationType="slide" transparent visible={viewingPrivacyDoc}>
                <View style={styles.backdrop}>
                    <View style={styles.viewerSheet}>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>Privacy Consent Form</Text>
                                <Text style={styles.subtitle}>Privacy_Consent_Form_Medicinal_Cannabis.pdf</Text>
                            </View>
                            <Pressable onPress={() => setViewingPrivacyDoc(false)} style={styles.closeBtn}>
                                <Text style={styles.closeText}>✕</Text>
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator style={styles.viewerScroll}>
                            {/* Formal Document Container */}
                            <View style={styles.documentPaper}>
                                <View style={styles.documentHeader}>
                                    <Text style={styles.docHeaderTitle}>PRIVACY CONSENT &amp; HEALTH INFORMATION FORM</Text>
                                    <Text style={styles.docHeaderSubtitle}>Medicinal Cannabis Telehealth Services — Australia</Text>
                                    <Text style={styles.docHeaderRef}>Form Ref: MC-PCF-001 (Version 2.0)</Text>
                                </View>

                                {/* Patient Details */}
                                <View style={styles.patientInfoBox}>
                                    <Text style={styles.sectionHeaderTitle}>1. Patient Identification</Text>
                                    <View style={styles.patientInfoGrid}>
                                        <View style={styles.patientInfoRow}>
                                            <Text style={styles.patientInfoLabel}>Patient Full Name:</Text>
                                            <Text style={styles.patientInfoValue}>{patientFullName}</Text>
                                        </View>
                                        <View style={styles.patientInfoRow}>
                                            <Text style={styles.patientInfoLabel}>Date of Birth:</Text>
                                            <Text style={styles.patientInfoValue}>{s3Doc?.dateOfBirth || customer?.dateOfBirth || '—'}</Text>
                                        </View>
                                        {(s3Doc?.medicareNumber || customer?.medicareNumber) ? (
                                            <View style={styles.patientInfoRow}>
                                                <Text style={styles.patientInfoLabel}>Medicare Number:</Text>
                                                <Text style={styles.patientInfoValue}>{s3Doc?.medicareNumber || customer?.medicareNumber}</Text>
                                            </View>
                                        ) : null}
                                        <View style={styles.patientInfoRow}>
                                            <Text style={styles.patientInfoLabel}>Consent Status:</Text>
                                            <Text style={[styles.patientInfoValue, { color: colors.primaryGreen, fontWeight: '700' }]}>
                                                Completed &amp; Signed
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Full Legal Consent Clauses */}
                                <View style={styles.legalBox}>
                                    <Text style={styles.sectionHeaderTitle}>2. Terms of Consent &amp; Privacy Obligations</Text>
                                    
                                    <Text style={styles.legalHeading}>A. Parties, Scope and Ongoing Consent</Text>
                                    <Text style={styles.legalText}>
                                        {s3Doc?.clauses?.partiesAndScope || 'This Privacy Consent Form governs the collection, use, storage, disclosure and handling of your personal information and health information in connection with the assessment for, prescribing of, and ongoing management of medicinal cannabis and related telehealth clinical services anywhere in Australia. By signing you provide free, informed and ongoing consent to the handling of your information as described in this Form. This consent remains in force until withdrawn in writing.'}
                                    </Text>

                                    <Text style={styles.legalHeading}>B. Legislative Framework</Text>
                                    <Text style={styles.legalText}>
                                        {s3Doc?.clauses?.legislativeFramework || 'The Clinic handles your information in accordance with the Privacy Act 1988 (Cth), the Australian Privacy Principles (APPs), and applicable health records and privacy legislation of each Australian State and Territory.'}
                                    </Text>

                                    <Text style={styles.legalHeading}>C. Purpose of Collection</Text>
                                    <Text style={styles.legalText}>
                                        {s3Doc?.clauses?.purposeOfCollection || 'Information is collected to provide clinical assessment and treatment; assess eligibility under TGA pathways; enable safe prescribing and dispensing of Schedule 8 medicines; comply with regulatory and prescription monitoring obligations; and for practice administration and quality assurance.'}
                                    </Text>

                                    <Text style={styles.legalHeading}>D. Nature of Information Collected</Text>
                                    <Text style={styles.legalText}>
                                        {s3Doc?.clauses?.natureOfInformation || 'May include: personal identification and contact details; medical, clinical and treatment history; medication and prescribing history; mental health and substance use history; diagnostic results; Medicare identifiers; consultation notes and treatment plans.'}
                                    </Text>

                                    <Text style={styles.legalHeading}>E. Disclosure</Text>
                                    <Text style={styles.legalText}>
                                        {s3Doc?.clauses?.disclosure || 'Information may be disclosed to treating practitioners; pharmacies; the TGA and regulators; Medicare and insurers; diagnostic providers; and any body required by law.'}
                                    </Text>
                                </View>

                                {/* Patient Digital Signature */}
                                <View style={styles.signatureSection}>
                                    <Text style={styles.sectionHeaderTitle}>3. Patient Signature &amp; Declaration</Text>
                                    <Text style={styles.legalText}>
                                        I confirm that I have read and understood the Privacy Consent Form, and agree to the collection, use, and disclosure of my health information as set out above.
                                    </Text>
                                    <View style={styles.signatureDisplayCard}>
                                        <SignatureDisplay signature={s3Doc?.signature || customer?.signature} />
                                    </View>
                                    <View style={styles.signatureDetailsRow}>
                                        <Text style={styles.signatureSignerText}>Signed by: {patientFullName}</Text>
                                        <Text style={styles.signatureDateText}>
                                            Date: {s3Doc?.signedAt || new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <Pressable onPress={() => setViewingPrivacyDoc(false)} style={styles.doneBtn}>
                            <Text style={styles.doneBtnText}>Close Document</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
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
    docItem: {
        alignItems: 'center',
        backgroundColor: '#fafaf9',
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        padding: 14,
    },
    docIconWrap: {
        alignItems: 'center',
        backgroundColor: colors.emeraldChipBg,
        borderRadius: radii.md,
        height: 38,
        justifyContent: 'center',
        width: 38,
    },
    docIcon: {
        fontSize: 18,
    },
    docInfo: {
        flex: 1,
    },
    docTitle: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    docDate: {
        color: colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    chevron: {
        color: colors.mutedForeground,
        fontSize: 18,
        fontWeight: '700',
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
    pressed: {
        opacity: 0.85,
    },
    privacyDocItem: {
        backgroundColor: colors.emeraldChipBg,
        borderColor: colors.emeraldChipBorder,
    },
    privacyDocIconWrap: {
        backgroundColor: colors.white,
    },
    docTitleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    signedBadge: {
        backgroundColor: colors.brandLime,
        borderRadius: radii.full,
        paddingHorizontal: 7,
        paddingVertical: 1,
    },
    signedBadgeText: {
        color: colors.primaryGreen,
        fontSize: 10,
        fontWeight: '700',
    },
    viewerSheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        maxHeight: '92%',
        paddingBottom: Platform.OS === 'ios' ? 38 : 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        ...shadows.tier3,
    },
    viewerScroll: {
        maxHeight: 480,
    },
    documentPaper: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        padding: 16,
    },
    documentHeader: {
        alignItems: 'center',
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        marginBottom: 16,
        paddingBottom: 14,
    },
    docHeaderTitle: {
        color: colors.primaryGreen,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    docHeaderSubtitle: {
        color: colors.foreground,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },
    docHeaderRef: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '500',
        marginTop: 4,
    },
    sectionHeaderTitle: {
        color: colors.primaryGreen,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    patientInfoBox: {
        backgroundColor: '#fafaf9',
        borderColor: colors.border,
        borderRadius: radii.md,
        borderWidth: 1,
        marginBottom: 16,
        padding: 14,
    },
    patientInfoGrid: {
        gap: 8,
    },
    patientInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    patientInfoLabel: {
        color: colors.mutedForeground,
        fontSize: 12,
        fontWeight: '600',
    },
    patientInfoValue: {
        color: colors.foreground,
        fontSize: 12,
        fontWeight: '600',
    },
    legalBox: {
        backgroundColor: '#fafaf9',
        borderColor: colors.border,
        borderRadius: radii.md,
        borderWidth: 1,
        marginBottom: 16,
        padding: 14,
    },
    legalHeading: {
        color: colors.foreground,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
        marginTop: 8,
    },
    legalText: {
        color: colors.mutedForeground,
        fontSize: 11,
        lineHeight: 16,
    },
    signatureSection: {
        marginTop: 6,
    },
    signatureDisplayCard: {
        alignItems: 'center',
        backgroundColor: '#fafaf9',
        borderColor: colors.border,
        borderRadius: radii.md,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 90,
        padding: 12,
        marginVertical: 10,
    },
    signatureDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    signatureSignerText: {
        color: colors.foreground,
        fontSize: 11,
        fontWeight: '600',
    },
    signatureDateText: {
        color: colors.mutedForeground,
        fontSize: 11,
        fontWeight: '500',
    },
});
