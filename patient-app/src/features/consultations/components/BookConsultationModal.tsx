import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';
import {
    createBooking,
    fetchAvailableDates,
    fetchClinicFee,
    fetchClinics,
    fetchPrescriberSlots,
    rescheduleConsultation,
    syncHalaxyPatient,
} from '../api/consultations.api';
import type { ClinicSummary, Consultation } from '../api/consultations.types';
import { useCurrentCustomer } from '@/features/customer/hooks/useCurrentCustomer';

// Helper to format Australian mobile with exact spacing: 04XX XXX XXX
function formatAustralianMobile(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (!digits) return '';
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

// Validation matching AustralianMobile PHP rule (^04\d{8}$)
function isValidAustralianMobile(phone: string): boolean {
    const digits = phone.replace(/\s+/g, '');
    return /^04\d{8}$/.test(digits);
}

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess: (bookingResult?: {
        requiresPayment: boolean;
        bookingId: string | number;
        amount: number;
        booking?: Consultation;
    }) => void;
    rescheduleConsultationItem?: Consultation | null;
};

type Step = 'clinic' | 'date' | 'prescriber' | 'time' | 'notes' | 'confirm';

export function BookConsultationModal({
    visible,
    onClose,
    onSuccess,
    rescheduleConsultationItem,
}: Props) {
    const isReschedule = !!rescheduleConsultationItem;

    const [currentStep, setCurrentStep] = useState<Step>('clinic');

    // Data State
    const [loadingInit, setLoadingInit] = useState(false);
    const [clinics, setClinics] = useState<ClinicSummary[]>([]);
    const [selectedClinic, setSelectedClinic] = useState<ClinicSummary | null>(null);

    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [loadingDates, setLoadingDates] = useState(false);

    // Prescribers & their slots for the selected date
    const [prescriberEntries, setPrescriberEntries] = useState<any[]>([]);
    const [selectedPrescriberId, setSelectedPrescriberId] = useState<number | string | null>(null);
    const [selectedPrescriber, setSelectedPrescriber] = useState<any | null>(null);
    const [loadingPrescribers, setLoadingPrescribers] = useState(false);

    // Time slots of the selected prescriber
    const [availableTimes, setAvailableTimes] = useState<{ time: string; label: string; disabled: boolean }[]>([]);
    const [selectedTime, setSelectedTime] = useState<string>('');

    // Patient notes & contact
    const [practitionerNotes, setPractitionerNotes] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    // Fee & repeat status from API
    const [feeInfo, setFeeInfo] = useState<{ fee: number; feeFormatted: string; isFollowUp: boolean; requiresPayment: boolean }>({
        fee: 0,
        feeFormatted: '$0.00',
        isFollowUp: false,
        requiresPayment: false,
    });

    // Consent declarations
    const [consentAge, setConsentAge] = useState(true);
    const [consentPregnancy, setConsentPregnancy] = useState(true);
    const [consentMentalHealth, setConsentMentalHealth] = useState(true);
    const [consentPolicies, setConsentPolicies] = useState(true);

    const { data: customer } = useCurrentCustomer();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            resetForm();
            return;
        }

        // Auto-fill phone number with user's phone if available, formatted cleanly
        if (customer?.phone) {
            setContactPhone(formatAustralianMobile(customer.phone));
        } else {
            setContactPhone('');
        }

        loadClinics();
    }, [visible, customer?.phone]);

    const resetForm = () => {
        setCurrentStep('clinic');
        setClinics([]);
        setSelectedClinic(null);
        setAvailableDates([]);
        setSelectedDate('');
        setPrescriberEntries([]);
        setSelectedPrescriberId(null);
        setSelectedPrescriber(null);
        setAvailableTimes([]);
        setSelectedTime('');
        setPractitionerNotes('');
        setContactPhone(customer?.phone ? formatAustralianMobile(customer.phone) : '');
        setError(null);
        setIsSubmitting(false);
    };

    // 1. Fetch Clinics strictly from API
    const loadClinics = async () => {
        try {
            console.log('[USER ACTION] Loading clinics from API...');
            setLoadingInit(true);
            setError(null);
            const clinicList = await fetchClinics();
            console.log('[API RESPONSE] Clinics received from API:', clinicList);
            setClinics(clinicList);

            if (isReschedule && rescheduleConsultationItem) {
                // If rescheduling, preselect the clinic and jump straight to picking a new date
                const targetClinic = clinicList.find((c) => String(c.id) === String(rescheduleConsultationItem.clinic_id)) || clinicList[0];
                if (targetClinic) {
                    console.log('[USER ACTION] Fast-tracking reschedule for clinic:', targetClinic.name);
                    handleSelectClinic(targetClinic);
                }
            } else if (clinicList.length === 1) {
                // If only 1 clinic is available for this patient, auto-select it and fetch its dates
                handleSelectClinic(clinicList[0]);
            } else if (clinicList.length === 0) {
                setError('No clinics are currently available for booking.');
            }
        } catch (err: unknown) {
            console.error('[BookConsultationModal] loadClinics API error:', err);
            const msg = err instanceof Error ? err.message : 'Failed to fetch clinics from API.';
            setError(msg);
        } finally {
            setLoadingInit(false);
        }
    };

    // 2. User selects Clinic -> Fetch Dates & Clinic Fee strictly from API
    const handleSelectClinic = async (clinic: ClinicSummary) => {
        console.log('[USER ACTION] Selected Clinic:', clinic.name, `(ID: ${clinic.id})`);
        setSelectedClinic(clinic);
        setSelectedDate('');
        setSelectedPrescriberId(null);
        setSelectedPrescriber(null);
        setSelectedTime('');

        // Fetch Clinic Fee info from API (tells if initial vs repeat follow-up payment is required)
        try {
            const fee = await fetchClinicFee(clinic.id);
            console.log('[API DATA] Clinic fee received from API:', fee);
            setFeeInfo(fee);
        } catch (err) {
            console.warn('[BookConsultationModal] fetchClinicFee error:', err);
            setFeeInfo({ fee: 0, feeFormatted: '$0.00', isFollowUp: false, requiresPayment: false });
        }

        // Fetch Available Dates for Clinic from API
        try {
            setLoadingDates(true);
            const today = new Date().toISOString().split('T')[0];
            const dates = await fetchAvailableDates(clinic.id, today);
            console.log('[API DATA] Available dates received from API:', dates);
            setAvailableDates(dates || []);
            if (!dates || dates.length === 0) {
                setError('No open booking dates found for this clinic.');
            }
        } catch (err) {
            console.error('[BookConsultationModal] fetchAvailableDates error:', err);
            setAvailableDates([]);
            setError('Failed to fetch available dates from API.');
        } finally {
            setLoadingDates(false);
            setCurrentStep('date');
        }
    };

    // 3. User selects Date -> Fetch Prescribers strictly from API
    const handleSelectDate = async (dateStr: string) => {
        console.log('[USER ACTION] Selected Date:', dateStr);
        setSelectedDate(dateStr);
        setSelectedPrescriberId(null);
        setSelectedPrescriber(null);
        setSelectedTime('');

        if (!selectedClinic) return;

        try {
            setLoadingPrescribers(true);
            console.log('[API CALL] Fetching prescribers from API for clinic', selectedClinic.id, 'on', dateStr);
            const prescribers = await fetchPrescriberSlots(selectedClinic.id, dateStr);
            console.log('[API DATA] Prescribers received from API:\n', JSON.stringify(prescribers, null, 2));
            setPrescriberEntries(prescribers || []);

            if (!prescribers || prescribers.length === 0) {
                setError('No practitioners have open slots on this date.');
            }
            setCurrentStep('prescriber');
        } catch (err: unknown) {
            console.error('[BookConsultationModal] fetchPrescriberSlots error:', err);
            setPrescriberEntries([]);
            setError(err instanceof Error ? err.message : 'Failed to fetch practitioner slots from API.');
            setCurrentStep('prescriber');
        } finally {
            setLoadingPrescribers(false);
        }
    };

    // 4. User selects Prescriber -> Extract Prescriber's time slots
    const handleSelectPrescriber = (entry: any) => {
        const prescriber = entry.prescriber || entry;
        console.log('[USER ACTION] Selected Prescriber:', prescriber.name, `(ID: ${prescriber.id})`);
        setSelectedPrescriberId(prescriber.id);
        setSelectedPrescriber(prescriber);

        const rawSlots = entry.slots || [];
        const formattedSlots = rawSlots
            .filter((s: any) => !s?.booked && !s?.is_booked)
            .map((s: any) => {
                const timeVal = typeof s === 'string' ? s : s.time || s.startTime;
                let displayLabel = timeVal;
                if (timeVal && timeVal.includes(':')) {
                    const [h, m] = timeVal.split(':');
                    const hour = parseInt(h, 10);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour % 12 || 12;
                    displayLabel = `${displayHour}:${m} ${ampm}`;
                }
                return {
                    time: timeVal,
                    label: s.label || displayLabel,
                    disabled: !!(s.disabled || s.booked),
                };
            });

        setAvailableTimes(formattedSlots);
        setSelectedTime('');
        setCurrentStep('time');
    };

    // 5. User selects Time Slot
    const handleSelectTime = (time: string) => {
        console.log('[USER ACTION] Selected Time Slot:', time);
        setSelectedTime(time);
        setCurrentStep('notes');
    };

    // 6. Submit Booking or Reschedule
    const handleSubmit = async () => {
        if (!selectedClinic || !selectedDate || !selectedTime) {
            setError('Please complete clinic, date, practitioner, and time selection.');
            return;
        }

        if (!isReschedule) {
            const missingProfileFields: string[] = [];
            if (!customer?.dateOfBirth) missingProfileFields.push('Date of Birth');
            if (!customer?.firstName || !customer?.lastName) missingProfileFields.push('Full Legal Name');
            if (!customer?.address?.line1 || !customer?.address?.suburb || !customer?.address?.postcode) {
                missingProfileFields.push('Residential Address');
            }

            if (missingProfileFields.length > 0) {
                setError(`To sync your booking with your doctor in Halaxy, please complete the following on your Profile first: ${missingProfileFields.join(', ')}.`);
                return;
            }

            if (!contactPhone.trim() || !isValidAustralianMobile(contactPhone)) {
                setError('Please enter a valid Australian mobile number (e.g. 0412 345 678).');
                return;
            }

            if (!consentAge || !consentPregnancy || !consentMentalHealth || !consentPolicies) {
                setError('Please agree to all health declarations to proceed.');
                return;
            }
        }

        try {
            console.log('[USER ACTION] Submitting consultation booking...', {
                clinicId: selectedClinic.id,
                date: selectedDate,
                time: selectedTime,
                prescriberId: selectedPrescriberId,
                requiresPayment: feeInfo.requiresPayment,
            });

            setIsSubmitting(true);
            setError(null);

            if (isReschedule && rescheduleConsultationItem) {
                await rescheduleConsultation(rescheduleConsultationItem.id, {
                    date: selectedDate,
                    startTime: selectedTime,
                    prescriberId: selectedPrescriberId || undefined,
                });
                Alert.alert('Rescheduled', 'Your consultation has been rescheduled.');
                onSuccess();
                onClose();
            } else {
                // Ensure Halaxy patient ID exists or is synchronized proactively before creating booking
                try {
                    console.log('[USER ACTION] Syncing patient with Halaxy prior to booking...');
                    await syncHalaxyPatient(selectedClinic.id);
                } catch (syncErr: any) {
                    console.error('[BookConsultationModal] syncHalaxyPatient failed:', syncErr);
                    let syncErrMsg = syncErr?.message || 'Could not retrieve Halaxy patient ID. Please verify your profile details.';
                    if (syncErr?.correlationId) {
                        syncErrMsg += ` (Ref: ${syncErr.correlationId})`;
                    }
                    if (syncErr?.status === 500) {
                        syncErrMsg = `Unable to link patient with Halaxy. Please ensure your Profile has your official name, date of birth, complete residential address (street, suburb, postcode), and an Australian mobile number. ${syncErr?.correlationId ? `(Ref: ${syncErr.correlationId})` : ''}`;
                    }
                    setError(syncErrMsg);
                    setIsSubmitting(false);
                    return;
                }

                const booking = await createBooking({
                    clinicId: selectedClinic.id,
                    date: selectedDate,
                    startTime: selectedTime,
                    prescriberId: selectedPrescriberId || undefined,
                    contactPhone: contactPhone || undefined,
                    consent: {
                        acceptedAge18: consentAge,
                        acceptedPregnancyDeclaration: consentPregnancy,
                        acceptedMentalHealthDeclaration: consentMentalHealth,
                        acceptedPolicies: consentPolicies,
                    },
                });

                // A booking only requires payment if the API explicitly flagged it as PENDING with requiresPayment=true
                const isRepeatPayment = Boolean(booking?.requiresPayment || booking?.status === 'PENDING');
                const bookingId = booking?.id || (booking as any)?.bookingId || 'new';

                console.log('[USER ACTION] Booking response from API:', JSON.stringify(booking, null, 2));
                console.log('[USER ACTION] Booking completed.', {
                    bookingId,
                    isRepeatPayment,
                    status: booking?.status,
                    requiresPayment: booking?.requiresPayment,
                    fee: feeInfo.fee,
                });

                if (isRepeatPayment) {
                    console.log('[USER ACTION] Repeat consultation requires payment. Triggering payment modal...', {
                        bookingId,
                        fee: feeInfo.fee,
                    });
                    onSuccess({
                        requiresPayment: true,
                        bookingId,
                        amount: feeInfo.fee || 39.00,
                        booking,
                    });
                    onClose();
                } else {
                    Alert.alert('Booking Confirmed', 'Your free consultation has been confirmed with your doctor.');
                    onSuccess({
                        requiresPayment: false,
                        bookingId,
                        amount: 0,
                        booking,
                    });
                    onClose();
                }
            }
        } catch (err: any) {
            console.error('[BookConsultationModal] Submit error:', err);
            setError(err?.message || 'Failed to complete booking. Please try another slot.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDateLabel = (isoDate: string) => {
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return { weekday: '', day: isoDate, month: '' };
        return {
            weekday: d.toLocaleDateString('en-AU', { weekday: 'short' }),
            day: d.getDate(),
            month: d.toLocaleDateString('en-AU', { month: 'short' }),
        };
    };

    const renderProgressBar = () => {
        const steps: Step[] = ['clinic', 'date', 'prescriber', 'time', 'notes', 'confirm'];
        const currentIdx = steps.indexOf(currentStep);

        return (
            <View style={styles.progressBarRow}>
                {steps.map((s, idx) => (
                    <View
                        key={s}
                        style={[
                            styles.progressDot,
                            idx === currentIdx && styles.progressDotActive,
                            idx < currentIdx && styles.progressDotCompleted,
                        ]}
                    />
                ))}
            </View>
        );
    };

    return (
        <Modal animationType="slide" transparent visible={visible}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    {/* Header with Step title and Navigation */}
                    <View style={styles.header}>
                        <View style={styles.headerNavRow}>
                            {currentStep !== 'clinic' ? (
                                <Pressable
                                    onPress={() => {
                                        console.log('[USER ACTION] Clicked back step from:', currentStep);
                                        if (currentStep === 'confirm') setCurrentStep('notes');
                                        else if (currentStep === 'notes') setCurrentStep('time');
                                        else if (currentStep === 'time') setCurrentStep('prescriber');
                                        else if (currentStep === 'prescriber') setCurrentStep('date');
                                        else if (currentStep === 'date') setCurrentStep('clinic');
                                    }}
                                    style={styles.backBtn}
                                >
                                    <Text style={styles.backBtnText}>‹ Back</Text>
                                </Pressable>
                            ) : (
                                <View style={{ width: 40 }} />
                            )}

                            <View style={styles.stepTitleWrap}>
                                <Text style={styles.stepTitle}>
                                    {currentStep === 'clinic' && '1. Choose Clinic'}
                                    {currentStep === 'date' && '2. Choose Date'}
                                    {currentStep === 'prescriber' && '3. Choose Practitioner'}
                                    {currentStep === 'time' && '4. Choose Time'}
                                    {currentStep === 'notes' && '5. Notes & Declaration'}
                                    {currentStep === 'confirm' && '6. Review & Confirm'}
                                </Text>
                                {renderProgressBar()}
                            </View>

                            <Pressable
                                onPress={() => {
                                    console.log('[USER ACTION] Closed BookConsultationModal');
                                    onClose();
                                }}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeText}>✕</Text>
                            </Pressable>
                        </View>
                    </View>

                    {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

                    {loadingInit ? (
                        <View style={styles.loaderWrap}>
                            <ActivityIndicator color={colors.primaryGreen} size="large" />
                            <Text style={styles.loadingText}>Fetching clinic information from API...</Text>
                        </View>
                    ) : (
                        <ScrollView
                            bounces={false}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* ── STEP 1: SELECT CLINIC ── */}
                            {currentStep === 'clinic' && (
                                <View style={styles.stepContainer}>
                                    <Text style={styles.stepHint}>
                                        Select the clinic you wish to book your consultation with:
                                    </Text>
                                    <View style={styles.clinicList}>
                                        {clinics.map((clinic) => {
                                            const isSelected = selectedClinic?.id === clinic.id;
                                            return (
                                                <Pressable
                                                    key={String(clinic.id)}
                                                    onPress={() => handleSelectClinic(clinic)}
                                                    style={({ pressed }) => [
                                                        styles.clinicCard,
                                                        isSelected && styles.clinicCardSelected,
                                                        pressed && styles.pressed,
                                                    ]}
                                                >
                                                    {clinic.logoUrl ? (
                                                        <Image
                                                            resizeMode="contain"
                                                            source={{ uri: clinic.logoUrl }}
                                                            style={styles.clinicLogoImg}
                                                        />
                                                    ) : (
                                                        <View style={styles.clinicIconCircle}>
                                                            <Text style={styles.clinicIcon}>🏥</Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.clinicInfo}>
                                                        <Text style={[styles.clinicName, isSelected && styles.clinicNameSelected]}>
                                                            {clinic.name}
                                                        </Text>
                                                        <Text style={styles.clinicSub}>
                                                            {clinic.address || 'Australian Telehealth Clinic'}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.chevron}>›</Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* ── STEP 2: SELECT DATE ── */}
                            {currentStep === 'date' && (
                                <View style={styles.stepContainer}>
                                    <Text style={styles.stepHint}>
                                        Select a consultation date at {selectedClinic?.name}:
                                    </Text>
                                    {loadingDates ? (
                                        <View style={styles.loaderWrap}>
                                            <ActivityIndicator color={colors.primaryGreen} />
                                            <Text style={styles.loadingText}>Fetching available dates...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.dateGrid}>
                                            {availableDates.map((dateStr) => {
                                                const parsed = formatDateLabel(dateStr);
                                                const isSelected = selectedDate === dateStr;
                                                return (
                                                    <Pressable
                                                        key={dateStr}
                                                        onPress={() => handleSelectDate(dateStr)}
                                                        style={({ pressed }) => [
                                                            styles.dateCard,
                                                            isSelected && styles.dateCardSelected,
                                                            pressed && styles.pressed,
                                                        ]}
                                                    >
                                                        <Text style={[styles.dateCardWeekday, isSelected && styles.textWhite]}>
                                                            {parsed.weekday}
                                                        </Text>
                                                        <Text style={[styles.dateCardDay, isSelected && styles.textWhite]}>
                                                            {parsed.day}
                                                        </Text>
                                                        <Text style={[styles.dateCardMonth, isSelected && styles.textWhite]}>
                                                            {parsed.month}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* ── STEP 3: SELECT PRESCRIBER OF SELECTED CLINIC & DATE ── */}
                            {currentStep === 'prescriber' && (
                                <View style={styles.stepContainer}>
                                    <Text style={styles.stepHint}>
                                        Doctors available on {selectedDate}:
                                    </Text>
                                    {loadingPrescribers ? (
                                        <View style={styles.loaderWrap}>
                                            <ActivityIndicator color={colors.primaryGreen} />
                                            <Text style={styles.loadingText}>Loading practitioner slots...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.prescriberList}>
                                            {prescriberEntries.map((entry, idx) => {
                                                const p = entry.prescriber || entry;
                                                const isSelected = selectedPrescriberId === p.id;
                                                const slotCount = entry.slots?.length || 0;

                                                return (
                                                    <Pressable
                                                        key={String(p.id || idx)}
                                                        onPress={() => handleSelectPrescriber(entry)}
                                                        style={({ pressed }) => [
                                                            styles.prescriberCard,
                                                            isSelected && styles.prescriberCardSelected,
                                                            pressed && styles.pressed,
                                                        ]}
                                                    >
                                                        <View style={styles.prescriberAvatar}>
                                                            <Text style={styles.prescriberAvatarText}>
                                                                {p.name?.charAt(0) || 'D'}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.prescriberInfo}>
                                                            <Text style={styles.prescriberName}>{p.name}</Text>
                                                            <Text style={styles.prescriberSpecialisation}>
                                                                {p.specialisation || 'General Practitioner'}
                                                            </Text>
                                                            <Text style={styles.prescriberSlotBadge}>
                                                                {slotCount} slots available
                                                            </Text>
                                                        </View>
                                                        <Text style={styles.chevron}>›</Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* ── STEP 4: SELECT PRESCRIBER TIME SLOT ── */}
                            {currentStep === 'time' && (
                                <View style={styles.stepContainer}>
                                    <Text style={styles.stepHint}>
                                        Select an appointment time with {selectedPrescriber?.name}:
                                    </Text>
                                    <View style={styles.timeGrid}>
                                        {availableTimes.map((slot) => {
                                            const isSelected = selectedTime === slot.time;
                                            return (
                                                <Pressable
                                                    key={slot.time}
                                                    disabled={slot.disabled}
                                                    onPress={() => handleSelectTime(slot.time)}
                                                    style={({ pressed }) => [
                                                        styles.timeChip,
                                                        isSelected && styles.timeChipSelected,
                                                        slot.disabled && styles.timeChipDisabled,
                                                        pressed && styles.pressed,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.timeChipText,
                                                            isSelected && styles.timeChipTextSelected,
                                                            slot.disabled && styles.timeChipTextDisabled,
                                                        ]}
                                                    >
                                                        {slot.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* ── STEP 5: NOTES & HEALTH DECLARATION ── */}
                            {currentStep === 'notes' && (
                                <View style={styles.stepContainer}>
                                    <Text style={styles.sectionTitle}>Notes for Practitioner (Optional)</Text>
                                    <TextInput
                                        multiline
                                        numberOfLines={3}
                                        onChangeText={setPractitionerNotes}
                                        placeholder="E.g. Follow-up consultation regarding my ongoing prescription and symptoms..."
                                        placeholderTextColor={colors.gray400}
                                        style={styles.notesInput}
                                        value={practitionerNotes}
                                    />

                                    <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Contact Phone</Text>
                                    <TextInput
                                        keyboardType="phone-pad"
                                        maxLength={12}
                                        onChangeText={(text) => {
                                            const formatted = formatAustralianMobile(text);
                                            console.log('[USER ACTION] Entered contact phone:', formatted);
                                            setContactPhone(formatted);
                                        }}
                                        placeholder="04XX XXX XXX"
                                        placeholderTextColor={colors.gray400}
                                        style={styles.phoneInput}
                                        value={contactPhone}
                                    />

                                    {!isReschedule && (
                                        <View style={styles.consentWrap}>
                                            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
                                                Health Declarations
                                            </Text>
                                            <Pressable
                                                onPress={() => setConsentAge(!consentAge)}
                                                style={styles.checkboxRow}
                                            >
                                                <View style={[styles.checkbox, consentAge && styles.checkboxChecked]}>
                                                    {consentAge ? <Text style={styles.checkIcon}>✓</Text> : null}
                                                </View>
                                                <Text style={styles.checkboxLabel}>I confirm that I am 18 years of age or older.</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => setConsentPregnancy(!consentPregnancy)}
                                                style={styles.checkboxRow}
                                            >
                                                <View style={[styles.checkbox, consentPregnancy && styles.checkboxChecked]}>
                                                    {consentPregnancy ? <Text style={styles.checkIcon}>✓</Text> : null}
                                                </View>
                                                <Text style={styles.checkboxLabel}>I confirm I am not currently pregnant or breastfeeding.</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => setConsentMentalHealth(!consentMentalHealth)}
                                                style={styles.checkboxRow}
                                            >
                                                <View style={[styles.checkbox, consentMentalHealth && styles.checkboxChecked]}>
                                                    {consentMentalHealth ? <Text style={styles.checkIcon}>✓</Text> : null}
                                                </View>
                                                <Text style={styles.checkboxLabel}>I confirm I do not have a history of severe active psychosis.</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => setConsentPolicies(!consentPolicies)}
                                                style={styles.checkboxRow}
                                            >
                                                <View style={[styles.checkbox, consentPolicies && styles.checkboxChecked]}>
                                                    {consentPolicies ? <Text style={styles.checkIcon}>✓</Text> : null}
                                                </View>
                                                <Text style={styles.checkboxLabel}>I agree to the clinic consultation terms and telehealth policies.</Text>
                                            </Pressable>
                                        </View>
                                    )}

                                    <Pressable
                                        onPress={() => setCurrentStep('confirm')}
                                        style={({ pressed }) => [styles.continueBtn, pressed && styles.pressed]}
                                    >
                                        <Text style={styles.continueBtnText}>Review Booking</Text>
                                    </Pressable>
                                </View>
                            )}

                            {/* ── STEP 6: REVIEW & CONFIRM ── */}
                            {currentStep === 'confirm' && (
                                <View style={styles.stepContainer}>
                                    <View style={styles.reviewCard}>
                                        <Text style={styles.reviewCardTitle}>BOOKING DETAILS</Text>

                                        <View style={styles.reviewRow}>
                                            <Text style={styles.reviewLabel}>Clinic</Text>
                                            <Text style={styles.reviewValue}>{selectedClinic?.name}</Text>
                                        </View>

                                        <View style={styles.reviewRow}>
                                            <Text style={styles.reviewLabel}>Practitioner</Text>
                                            <Text style={styles.reviewValue}>{selectedPrescriber?.name}</Text>
                                        </View>

                                        <View style={styles.reviewRow}>
                                            <Text style={styles.reviewLabel}>Date</Text>
                                            <Text style={styles.reviewValue}>{selectedDate}</Text>
                                        </View>

                                        <View style={styles.reviewRow}>
                                            <Text style={styles.reviewLabel}>Time</Text>
                                            <Text style={styles.reviewValue}>{selectedTime}</Text>
                                        </View>

                                        {/* Repeating Consultation / Fee notice */}
                                        <View style={[styles.reviewRow, styles.feeRow]}>
                                            <Text style={styles.feeLabel}>
                                                {feeInfo.requiresPayment ? 'Consultation Fee (Repeat/Follow-up)' : 'Consultation Fee'}
                                            </Text>
                                            <Text style={styles.feeValue}>
                                                {feeInfo.requiresPayment ? feeInfo.feeFormatted : 'Free (Covered)'}
                                            </Text>
                                        </View>
                                    </View>

                                    {feeInfo.requiresPayment && (
                                        <View style={styles.payNoticeBox}>
                                            <Text style={styles.payNoticeIcon}>💳</Text>
                                            <Text style={styles.payNoticeText}>
                                                As this is a repeat/follow-up consultation, you will be prompted to complete payment ({feeInfo.feeFormatted}) to finalize your slot.
                                            </Text>
                                        </View>
                                    )}

                                    <Pressable
                                        disabled={isSubmitting}
                                        onPress={handleSubmit}
                                        style={({ pressed }) => [
                                            styles.confirmBtn,
                                            pressed && styles.pressed,
                                            isSubmitting && styles.btnDisabled,
                                        ]}
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color={colors.primaryGreen} />
                                        ) : (
                                            <Text style={styles.confirmBtnText}>
                                                {feeInfo.requiresPayment ? 'Proceed to Payment' : 'Confirm Free Booking'}
                                            </Text>
                                        )}
                                    </Pressable>
                                </View>
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: 'rgba(15, 30, 18, 0.55)',
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        maxHeight: '92%',
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        paddingHorizontal: 20,
        paddingTop: 16,
        ...shadows.tier3,
    },
    header: {
        marginBottom: 12,
    },
    headerNavRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    backBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    backBtnText: {
        color: colors.primaryGreen,
        fontSize: 14,
        fontWeight: '700',
    },
    stepTitleWrap: {
        alignItems: 'center',
    },
    stepTitle: {
        color: colors.foreground,
        fontSize: 15,
        fontWeight: '800',
    },
    progressBarRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 6,
    },
    progressDot: {
        backgroundColor: colors.gray200,
        borderRadius: radii.full,
        height: 4,
        width: 14,
    },
    progressDotActive: {
        backgroundColor: colors.primaryGreen,
        width: 24,
    },
    progressDotCompleted: {
        backgroundColor: colors.primaryGreen,
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
    errorBanner: {
        backgroundColor: '#fee2e2',
        borderRadius: radii.sm,
        color: '#dc2626',
        fontSize: 12,
        marginBottom: 12,
        padding: 8,
    },
    loaderWrap: {
        alignItems: 'center',
        paddingVertical: 50,
    },
    loadingText: {
        color: colors.mutedForeground,
        fontSize: 13,
        marginTop: 12,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    stepContainer: {
        paddingTop: 6,
    },
    stepHint: {
        color: colors.mutedForeground,
        fontSize: 13,
        marginBottom: 14,
    },
    clinicList: {
        gap: 10,
    },
    clinicCard: {
        alignItems: 'center',
        backgroundColor: '#fafaf9',
        borderColor: colors.gray200,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        padding: 14,
    },
    clinicCardSelected: {
        borderColor: colors.primaryGreen,
        borderWidth: 2,
    },
    clinicLogoImg: {
        borderRadius: radii.md,
        height: 44,
        marginRight: 12,
        width: 44,
    },
    clinicIconCircle: {
        alignItems: 'center',
        backgroundColor: '#eaf4e6',
        borderRadius: radii.full,
        height: 40,
        justifyContent: 'center',
        marginRight: 12,
        width: 40,
    },
    clinicIcon: {
        fontSize: 20,
    },
    clinicInfo: {
        flex: 1,
    },
    clinicName: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    clinicNameSelected: {
        color: colors.primaryGreen,
    },
    clinicSub: {
        color: colors.mutedForeground,
        fontSize: 11,
        marginTop: 2,
    },
    chevron: {
        color: colors.mutedForeground,
        fontSize: 20,
        fontWeight: '700',
    },
    dateGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    dateCard: {
        alignItems: 'center',
        backgroundColor: '#fafaf9',
        borderColor: colors.gray200,
        borderRadius: radii.lg,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        width: '30%',
    },
    dateCardSelected: {
        backgroundColor: colors.primaryGreen,
        borderColor: colors.primaryGreen,
    },
    dateCardWeekday: {
        color: colors.mutedForeground,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    dateCardDay: {
        color: colors.foreground,
        fontSize: 20,
        fontWeight: '800',
        marginVertical: 2,
    },
    dateCardMonth: {
        color: colors.mutedForeground,
        fontSize: 11,
        fontWeight: '600',
    },
    textWhite: {
        color: colors.white,
    },
    prescriberList: {
        gap: 10,
    },
    prescriberCard: {
        alignItems: 'center',
        backgroundColor: '#fafaf9',
        borderColor: colors.gray200,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        padding: 14,
    },
    prescriberCardSelected: {
        borderColor: colors.primaryGreen,
        borderWidth: 2,
    },
    prescriberAvatar: {
        alignItems: 'center',
        backgroundColor: '#d8ebcf',
        borderRadius: radii.full,
        height: 44,
        justifyContent: 'center',
        marginRight: 12,
        width: 44,
    },
    prescriberAvatarText: {
        color: colors.primaryGreen,
        fontSize: 16,
        fontWeight: '800',
    },
    prescriberInfo: {
        flex: 1,
    },
    prescriberName: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    prescriberSpecialisation: {
        color: colors.mutedForeground,
        fontSize: 12,
        marginTop: 1,
    },
    prescriberSlotBadge: {
        color: colors.primaryGreen,
        fontSize: 11,
        fontWeight: '700',
        marginTop: 4,
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    timeChip: {
        alignItems: 'center',
        backgroundColor: '#fafaf9',
        borderColor: colors.gray200,
        borderRadius: radii.md,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        width: '30%',
    },
    timeChipSelected: {
        backgroundColor: colors.brandLime,
        borderColor: colors.brandLime,
    },
    timeChipDisabled: {
        opacity: 0.35,
    },
    timeChipText: {
        color: colors.foreground,
        fontSize: 12,
        fontWeight: '600',
    },
    timeChipTextSelected: {
        color: colors.primaryGreen,
        fontWeight: '800',
    },
    timeChipTextDisabled: {
        color: colors.mutedForeground,
    },
    sectionTitle: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
    },
    notesInput: {
        backgroundColor: colors.white,
        borderColor: colors.gray200,
        borderRadius: radii.md,
        borderWidth: 1,
        color: colors.foreground,
        fontSize: 13,
        minHeight: 70,
        padding: 10,
        textAlignVertical: 'top',
    },
    phoneInput: {
        backgroundColor: colors.white,
        borderColor: colors.gray200,
        borderRadius: radii.md,
        borderWidth: 1,
        color: colors.foreground,
        fontSize: 13,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    consentWrap: {
        marginTop: 8,
    },
    checkboxRow: {
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: 10,
    },
    checkbox: {
        alignItems: 'center',
        borderColor: colors.gray200,
        borderRadius: 4,
        borderWidth: 1.5,
        height: 20,
        justifyContent: 'center',
        marginRight: 10,
        width: 20,
    },
    checkboxChecked: {
        backgroundColor: colors.primaryGreen,
        borderColor: colors.primaryGreen,
    },
    checkIcon: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    checkboxLabel: {
        color: colors.foreground,
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
    },
    continueBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.full,
        marginTop: 18,
        paddingVertical: 14,
    },
    continueBtnText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    reviewCard: {
        backgroundColor: '#fafaf9',
        borderColor: colors.gray200,
        borderRadius: radii.lg,
        borderWidth: 1,
        padding: 16,
    },
    reviewCardTitle: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6,
        marginBottom: 12,
    },
    reviewRow: {
        borderBottomColor: colors.gray100,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    reviewLabel: {
        color: colors.mutedForeground,
        fontSize: 13,
    },
    reviewValue: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '700',
    },
    feeRow: {
        borderBottomWidth: 0,
        paddingTop: 12,
    },
    feeLabel: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '700',
    },
    feeValue: {
        color: colors.primaryGreen,
        fontSize: 15,
        fontWeight: '800',
    },
    payNoticeBox: {
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        borderColor: '#fde68a',
        borderRadius: radii.md,
        borderWidth: 1,
        flexDirection: 'row',
        marginTop: 14,
        padding: 12,
    },
    payNoticeIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    payNoticeText: {
        color: '#92400e',
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
    },
    confirmBtn: {
        alignItems: 'center',
        backgroundColor: colors.brandLime,
        borderRadius: radii.full,
        marginTop: 18,
        paddingVertical: 14,
        ...shadows.tier2,
    },
    confirmBtnText: {
        color: colors.primaryGreen,
        fontSize: 15,
        fontWeight: '700',
    },
    pressed: {
        opacity: 0.85,
    },
    btnDisabled: {
        opacity: 0.6,
    },
});
