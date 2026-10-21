import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, radii, shadows } from '@/lib/theme/tokens';
import {
    fetchQuestionnaire,
    saveQuestionnaireDraft,
    submitQuestionnaire,
} from '../api/questionnaire.api';
import type {
    CustomerGeneralInfo,
    QuestionnaireQuestion,
    QuestionnaireResponse,
    QuestionnaireSection,
} from '../api/questionnaire.types';
import {
    fetchCurrentCustomer,
    saveCustomerSignature,
    updateCustomerAddress,
    updateCustomerProfile,
} from '@/features/customer/api/customer.api';
import { QuestionnaireProgressHeader } from './QuestionnaireProgressHeader';
import { CustomerInfoStep } from './CustomerInfoStep';
import { QuestionRenderer } from './QuestionRenderer';
import { IneligibleScreen } from './IneligibleScreen';
import { PrivacyConsentStep } from './PrivacyConsentStep';

export function QuestionnaireScreenContent() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const scrollRef = useRef<ScrollView>(null);

    // Flow states
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [data, setData] = useState<QuestionnaireResponse | null>(null);

    // Profile state
    const [customerInfo, setCustomerInfo] = useState<CustomerGeneralInfo>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        has_medicare: true,
        medicare_number: '',
        medicare_irn: '',
        medicare_expiry: '',
        delivery_line1: '',
        delivery_line2: '',
        delivery_suburb: '',
        delivery_state: '',
        delivery_postcode: '',
    });
    const [storedSignature, setStoredSignature] = useState<string | null>(null);

    // Questionnaire progress & answers
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Eligibility screening state
    const [isEligible, setIsEligible] = useState(true);
    const [ineligibleMessage, setIneligibleMessage] = useState<string | null>(null);

    // Privacy consent step
    const [awaitingPrivacyConsent, setAwaitingPrivacyConsent] = useState(false);

    // Load initial data (Schema + Draft + Profile)
    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                setIsLoading(true);
                setLoadError(null);

                const [qRes, customer] = await Promise.all([
                    fetchQuestionnaire(),
                    fetchCurrentCustomer().catch(() => null),
                ]);

                if (!mounted) return;

                // Normalize response: API returns `data.survey` with sections and `data.draft`
                const schema = (qRes as any).survey || qRes.schema || null;
                const draft = qRes.draft || (qRes as any).data?.draft || null;
                const normalizedResponse: QuestionnaireResponse = {
                    schema: schema
                        ? {
                              id: Number(schema.id),
                              name: schema.name || 'Patient Intake Form',
                              type: schema.type || 'prescreening',
                              sections: (schema.sections || []).map((sec: any) => ({
                                  id: Number(sec.id),
                                  name: sec.name,
                                  description: sec.description,
                                  questions: (sec.questions || []).map((q: any) => ({
                                      id: Number(q.id),
                                      content: q.content,
                                      type: q.type,
                                      options: q.options || [],
                                      order: Number(q.order || 0),
                                      parent_question_id: q.parentQuestionId ? Number(q.parentQuestionId) : null,
                                      triggering_answer: q.triggeringAnswer || null,
                                      has_sub_questions: Boolean(q.hasSubQuestions),
                                      children: (q.children || []).map((ch: any) => ({
                                          id: Number(ch.id),
                                          content: ch.content,
                                          type: ch.type,
                                          options: ch.options || [],
                                          order: Number(ch.order || 0),
                                          parent_question_id: Number(ch.parentQuestionId || q.id),
                                          triggering_answer: ch.triggeringAnswer || null,
                                          has_sub_questions: Boolean(ch.hasSubQuestions),
                                      })),
                                  })),
                              })),
                          }
                        : { id: 0, name: '', type: '', sections: [] },
                    draft: {
                        answers: draft?.answers || {},
                        current_step: Number(draft?.currentStep ?? draft?.current_step ?? 0),
                    },
                };

                setData(normalizedResponse);

                // Populate Customer Info
                if (customer) {
                    setStoredSignature(customer.signature || null);
                    setCustomerInfo({
                        first_name: customer.firstName || '',
                        last_name: customer.lastName || '',
                        email: customer.email || '',
                        phone: customer.phone || '',
                        date_of_birth: customer.dateOfBirth || '',
                        gender: customer.gender || '',
                        has_medicare: customer.medicareNumber ? true : !customer.dateOfBirth,
                        medicare_number: customer.medicareNumber || '',
                        medicare_irn: customer.medicareIrn || '',
                        medicare_expiry: customer.medicareExpiry || '',
                        delivery_line1: customer.address?.line1 || '',
                        delivery_line2: customer.address?.line2 || '',
                        delivery_suburb: customer.address?.suburb || '',
                        delivery_state: customer.address?.state || '',
                        delivery_postcode: customer.address?.postcode || '',
                    });
                }

                // Populate Draft if available
                if (draft) {
                    if (draft.answers && Object.keys(draft.answers).length > 0) {
                        setAnswers(draft.answers);
                    }
                    const stepVal = draft.currentStep ?? draft.current_step;
                    if (typeof stepVal === 'number' && !isNaN(stepVal)) {
                        setCurrentStep(stepVal);
                    }
                }
            } catch (err: unknown) {
                if (mounted) {
                    setLoadError(err instanceof Error ? err.message : 'Failed to load questionnaire.');
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const scrollToTop = () => {
        setTimeout(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        }, 50);
    };

    const sections = data?.schema?.sections || [];
    // Total steps: Step 0 is Profile Info, then 1 step per section
    const totalSteps = sections.length + 1;

    // Handle Step 0: Save Profile Info & Address
    const handleSaveCustomerInfo = async (info: CustomerGeneralInfo) => {
        try {
            setIsSaving(true);
            setCustomerInfo(info);

            // Update customer profile (NestJS DTO validates firstName >= 1 char, lastName >= 1 char)
            await updateCustomerProfile({
                firstName: info.first_name.trim(),
                lastName: info.last_name.trim(),
                phone: info.phone,
                dateOfBirth: info.date_of_birth,
                gender: info.gender,
                medicareNumber: info.has_medicare ? info.medicare_number : null,
                medicareIrn: info.has_medicare ? info.medicare_irn : null,
                medicareExpiry: info.has_medicare ? info.medicare_expiry : null,
            });

            // Update delivery address
            await updateCustomerAddress({
                addrLine1: info.delivery_line1,
                addrLine2: info.delivery_line2,
                addrSuburb: info.delivery_suburb,
                addrState: info.delivery_state as any,
                addrPostcode: info.delivery_postcode,
            });

            // Save draft with next step
            await saveQuestionnaireDraft({
                current_step: 1,
                answers,
            });

            setCurrentStep(1);
            scrollToTop();
        } catch (err: unknown) {
            Alert.alert('Update Failed', err instanceof Error ? err.message : 'Failed to save information.');
        } finally {
            setIsSaving(false);
        }
    };

    // Answer change for a question
    const handleAnswerChange = (questionId: number, val: string | string[]) => {
        const key = `q${questionId}`;
        setAnswers((prev) => ({ ...prev, [key]: val }));
        if (errors[key]) {
            setErrors((prev) => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            });
        }
    };

    // Safety screening check (First section in prescreening)
    const checkSafetyEligibility = (section: QuestionnaireSection): boolean => {
        for (const q of section.questions) {
            const key = `q${q.id}`;
            const val = answers[key];
            if (val === 'Yes') {
                setIsEligible(false);
                setIneligibleMessage(
                    'Thank you for your interest. Based on the information provided, medicinal cannabis may not be suitable at this time due to safety considerations. We recommend discussing alternative treatments with your GP or a specialist. For more information, visit health.vic.gov.au or tga.gov.au.'
                );
                return false;
            }
        }
        setIsEligible(true);
        setIneligibleMessage(null);
        return true;
    };

    // Validate current section
    const validateCurrentSection = (section: QuestionnaireSection): boolean => {
        const nextErrors: Record<string, string> = {};

        const validateQuestion = (q: QuestionnaireQuestion) => {
            const key = `q${q.id}`;
            const val = answers[key];

            if (q.type === 'CheckboxlistConsent') {
                const optCount = q.options?.length || 0;
                const selectedCount = Array.isArray(val) ? val.length : 0;
                if (!val || selectedCount < optCount) {
                    nextErrors[key] = 'All consent options must be agreed to.';
                }
            } else if (q.type === 'Checkboxlist') {
                const selectedCount = Array.isArray(val) ? val.length : 0;
                if (!val || selectedCount === 0) {
                    nextErrors[key] = 'Please select at least one option.';
                }
            } else if (q.type === 'Text') {
                // optional/notes
            } else {
                // Radio, Select, etc.
                if (!val || (typeof val === 'string' && !val.trim())) {
                    nextErrors[key] = 'This question is required.';
                }
            }

            // Check sub-questions if triggered
            if (q.has_sub_questions && q.children) {
                const currentParentAnswer = val;
                const parentAnswersArr = Array.isArray(currentParentAnswer)
                    ? currentParentAnswer
                    : [currentParentAnswer];

                for (const child of q.children) {
                    const isTriggered =
                        !child.triggering_answer || parentAnswersArr.includes(child.triggering_answer);
                    if (isTriggered) {
                        const childKey = `q${child.id}`;
                        const childVal = answers[childKey];
                        if (child.type !== 'Text' && (!childVal || (typeof childVal === 'string' && !childVal.trim()))) {
                            nextErrors[childKey] = 'This field is required.';
                        }
                    }
                }
            }
        };

        for (const q of section.questions) {
            validateQuestion(q);
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    // Proceed to next section or complete
    const handleNextStep = async () => {
        const sectionIndex = currentStep - 1;
        const currentSection = sections[sectionIndex];

        if (!currentSection) return;

        if (!validateCurrentSection(currentSection)) {
            Alert.alert('Incomplete Questions', 'Please answer all required questions before proceeding.');
            return;
        }

        // Run safety screening on section 0
        if (sectionIndex === 0) {
            const isSafe = checkSafetyEligibility(currentSection);
            if (!isSafe) {
                scrollToTop();
                return;
            }
        }

        try {
            setIsSaving(true);

            // If more sections remain
            if (currentStep < totalSteps - 1) {
                const nextStepNum = currentStep + 1;
                await saveQuestionnaireDraft({
                    current_step: nextStepNum,
                    answers,
                });
                setCurrentStep(nextStepNum);
                scrollToTop();
            } else {
                // All sections completed!
                // Check if privacy consent is already satisfied or if we need to show the privacy consent step
                setAwaitingPrivacyConsent(true);
                scrollToTop();
            }
        } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save progress.');
        } finally {
            setIsSaving(false);
        }
    };

    // Previous step
    const handlePreviousStep = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
            scrollToTop();
        }
    };

    // Privacy Consent final submission
    const handlePrivacyConsentCompleted = async (signatureData: string) => {
        try {
            setIsSaving(true);

            // 1. Save digital signature if changed
            if (signatureData !== storedSignature) {
                await saveCustomerSignature({ signatureData });
            }

            // 2. Upload signed document directly to AWS S3: cannaquest-storage/compliance-forms/signed_documents/{id}
            const userId = ((data as any)?.customer?.id) || customerInfo.email || 'me';
            try {
                const { uploadSignedDocumentToS3 } = await import('@/features/customer/api/s3ComplianceService');
                const fullName = `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() || 'Patient';
                await uploadSignedDocumentToS3(userId, {
                    id: userId,
                    patientFullName: fullName,
                    dateOfBirth: customerInfo.date_of_birth,
                    medicareNumber: customerInfo.medicare_number,
                    formRef: 'MC-PCF-001',
                    version: '2.0',
                    title: 'Privacy Consent Form (Medicinal Cannabis)',
                    signedAt: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    signature: signatureData,
                    clauses: {
                        partiesAndScope: 'This Privacy Consent Form governs the collection, use, storage, disclosure and handling of your personal information and health information in connection with the assessment for, prescribing of, and ongoing management of medicinal cannabis and related telehealth clinical services anywhere in Australia. By signing you provide free, informed and ongoing consent to the handling of your information as described in this Form. This consent remains in force until withdrawn in writing.',
                        legislativeFramework: 'The Clinic handles your information in accordance with the Privacy Act 1988 (Cth), the Australian Privacy Principles (APPs), and applicable health records and privacy legislation of each Australian State and Territory.',
                        purposeOfCollection: 'Information is collected to provide clinical assessment and treatment; assess eligibility under TGA pathways; enable safe prescribing and dispensing of Schedule 8 medicines; comply with regulatory and prescription monitoring obligations; and for practice administration and quality assurance.',
                        natureOfInformation: 'May include: personal identification and contact details; medical, clinical and treatment history; medication and prescribing history; mental health and substance use history; diagnostic results; Medicare identifiers; consultation notes and treatment plans.',
                        disclosure: 'Information may be disclosed to treating practitioners; pharmacies; the TGA and regulators; Medicare and insurers; diagnostic providers; and any body required by law.'
                    }
                });
            } catch (s3Err) {
                console.warn('Direct S3 upload non-blocking error:', s3Err);
            }

            // 3. Submit questionnaire to backend
            await submitQuestionnaire({ answers });

            // Invalidate queries so dashboard/hero card updates immediately
            void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
            void queryClient.invalidateQueries({ queryKey: ['dashboard', 'care-journey'] });
            void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });

            Alert.alert(
                'Questionnaire Completed',
                'Your medical cannabis intake questionnaire has been submitted successfully. You can now book your doctor consultation.',
                [
                    {
                        text: 'Book Consultation',
                        onPress: () => router.replace('/(app)/(tabs)/consults'),
                    },
                ]
            );
        } catch (err: unknown) {
            Alert.alert(
                'Submission Error',
                err instanceof Error ? err.message : 'Failed to submit questionnaire.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={colors.primaryGreen} />
                <Text style={styles.loadingText}>Loading Questionnaire...</Text>
            </View>
        );
    }

    if (loadError) {
        return (
            <View style={styles.centerBox}>
                <Text style={styles.errorText}>⚠️ {loadError}</Text>
                <Pressable
                    style={styles.retryBtn}
                    onPress={() => router.replace('/(app)/(tabs)')}
                >
                    <Text style={styles.retryBtnText}>Return to Home</Text>
                </Pressable>
            </View>
        );
    }

    // Determine current section title
    const currentSectionName =
        awaitingPrivacyConsent
            ? 'Privacy Consent'
            : currentStep === 0
            ? 'General Information'
            : sections[currentStep - 1]?.name || 'Medical Assessment';

    return (
        <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
        >
            {/* Progress Header */}
            {!awaitingPrivacyConsent && (
                <QuestionnaireProgressHeader
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    sectionName={currentSectionName}
                />
            )}

            {/* Ineligible Screen */}
            {!isEligible && currentStep === 1 ? (
                <IneligibleScreen
                    message={ineligibleMessage || undefined}
                    onStartAgain={() => {
                        setIsEligible(true);
                        setCurrentStep(0);
                        setAnswers({});
                        scrollToTop();
                    }}
                    onBackToDashboard={() => router.replace('/(app)/(tabs)')}
                />
            ) : awaitingPrivacyConsent ? (
                /* Privacy Consent Step */
                <PrivacyConsentStep
                    customerName={`${customerInfo.first_name} ${customerInfo.last_name}`.trim()}
                    customerEmail={customerInfo.email}
                    customerPhone={customerInfo.phone}
                    customerDob={customerInfo.date_of_birth}
                    medicareNumber={customerInfo.medicare_number}
                    existingSignature={storedSignature}
                    onConsentCompleted={handlePrivacyConsentCompleted}
                    isSubmitting={isSaving}
                />
            ) : currentStep === 0 ? (
                /* Step 0: General Info */
                <CustomerInfoStep
                    initialInfo={customerInfo}
                    onSaveAndContinue={handleSaveCustomerInfo}
                    isSubmitting={isSaving}
                />
            ) : (
                /* Steps 1..N: Questionnaire Section Questions */
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeaderWrap}>
                        <Text style={styles.sectionTitle}>{sections[currentStep - 1]?.name}</Text>
                        {sections[currentStep - 1]?.description ? (
                            <Text style={styles.sectionDesc}>
                                {sections[currentStep - 1]?.description}
                            </Text>
                        ) : null}
                    </View>

                    <View style={styles.questionsList}>
                        {sections[currentStep - 1]?.questions.map((question) => {
                            const key = `q${question.id}`;
                            return (
                                <QuestionRenderer
                                    key={question.id}
                                    question={question}
                                    value={answers[key]}
                                    onChange={(val) => handleAnswerChange(question.id, val)}
                                    error={errors[key]}
                                    answersState={answers}
                                    onChildChange={(childId, val) => handleAnswerChange(childId, val)}
                                    childErrors={errors}
                                />
                            );
                        })}
                    </View>

                    {/* Step Navigation Controls */}
                    <View style={styles.navRow}>
                        <Pressable
                            style={styles.btnPrev}
                            onPress={handlePreviousStep}
                            disabled={isSaving}
                        >
                            <Text style={styles.btnPrevText}>← Previous</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.btnNext, isSaving && styles.btnDisabled]}
                            onPress={handleNextStep}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={styles.btnNextText}>
                                    {currentStep < totalSteps - 1 ? 'Continue →' : 'Complete Form →'}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Support footer */}
            <View style={styles.footerNote}>
                <Text style={styles.footerText}>
                    Need help?{' '}
                    <Text
                        style={styles.footerLink}
                        onPress={() => router.replace('/(app)/(tabs)/consults')}
                    >
                        Contact clinical support
                    </Text>
                </Text>
                <Text style={styles.footerSub}>Your responses are encrypted and stored securely.</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
        backgroundColor: colors.background,
    },
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
        color: colors.mutedForeground,
    },
    errorText: {
        fontSize: 14,
        color: colors.destructive,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: radii.full,
        backgroundColor: colors.primaryGreen,
    },
    retryBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
    },
    sectionCard: {
        backgroundColor: colors.card,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 20,
        ...shadows.tier1,
    },
    sectionHeaderWrap: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.foreground,
    },
    sectionDesc: {
        fontSize: 13,
        color: colors.mutedForeground,
        marginTop: 4,
    },
    questionsList: {
        marginBottom: 20,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    btnPrev: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: radii.full,
        backgroundColor: colors.secondary,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    btnPrevText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.foreground,
    },
    btnNext: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: radii.full,
        backgroundColor: colors.primaryGreen,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.tier2,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    btnNextText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#ffffff',
    },
    footerNote: {
        marginTop: 24,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        color: colors.mutedForeground,
    },
    footerLink: {
        color: colors.primaryGreen,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    footerSub: {
        fontSize: 11,
        color: colors.mutedForeground,
        marginTop: 4,
        opacity: 0.8,
    },
});
