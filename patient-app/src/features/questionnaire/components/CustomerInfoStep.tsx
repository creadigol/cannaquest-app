import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';
import type { CustomerGeneralInfo } from '../api/questionnaire.types';
import {
    validateAge18OrOlder,
    validateAustralianMobile,
    validateAustralianPostcode,
    validateMedicare,
    validateMedicareExpiry,
    validateMedicareIrn,
} from '../utils/validators';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;

const GOOGLE_PLACES_API_KEY =
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    'AIzaSyDzBDBPwf-w9MVzeZtH7Tz_9c0wqKZwOX8';

type Prediction = {
    place_id: string;
    description: string;
    structured_formatting?: {
        main_text: string;
        secondary_text: string;
    };
};

type Props = {
    initialInfo: CustomerGeneralInfo;
    onSaveAndContinue: (info: CustomerGeneralInfo) => Promise<void>;
    isSubmitting?: boolean;
};

export function CustomerInfoStep({ initialInfo, onSaveAndContinue, isSubmitting = false }: Props) {
    const [info, setInfo] = useState<CustomerGeneralInfo>(initialInfo);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Google Places autocomplete state
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setInfo(initialInfo);
    }, [initialInfo]);

    const updateField = (field: keyof CustomerGeneralInfo, value: any) => {
        setInfo((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const searchPlaces = async (text: string) => {
        if (!text || text.trim().length < 3) {
            setPredictions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            setIsSearchingPlaces(true);
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
                text
            )}&components=country:au&types=address&key=${GOOGLE_PLACES_API_KEY}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.status === 'OK' && Array.isArray(data.predictions)) {
                setPredictions(data.predictions);
                setShowSuggestions(true);
            } else {
                setPredictions([]);
            }
        } catch {
            setPredictions([]);
        } finally {
            setIsSearchingPlaces(false);
        }
    };

    const handleAddressLine1Change = (text: string) => {
        updateField('delivery_line1', text);
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            searchPlaces(text);
        }, 300);
    };

    const handleSelectPrediction = async (prediction: Prediction) => {
        setShowSuggestions(false);
        setPredictions([]);

        try {
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=address_components,formatted_address&key=${GOOGLE_PLACES_API_KEY}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.status === 'OK' && data.result?.address_components) {
                const components = data.result.address_components as Array<{
                    long_name: string;
                    short_name: string;
                    types: string[];
                }>;

                let streetNumber = '';
                let route = '';
                let subpremise = '';
                let locality = '';
                let stateVal = '';
                let postalCode = '';

                components.forEach((c) => {
                    if (c.types.includes('street_number')) streetNumber = c.long_name;
                    if (c.types.includes('route')) route = c.long_name;
                    if (c.types.includes('subpremise')) subpremise = c.long_name;
                    if (c.types.includes('locality')) locality = c.long_name;
                    if (c.types.includes('administrative_area_level_1')) stateVal = c.short_name;
                    if (c.types.includes('postal_code')) postalCode = c.long_name;
                });

                const parsedLine1 =
                    [streetNumber, route].filter(Boolean).join(' ') ||
                    prediction.structured_formatting?.main_text ||
                    prediction.description;

                setInfo((prev) => ({
                    ...prev,
                    delivery_line1: parsedLine1,
                    delivery_line2: subpremise ? `Unit ${subpremise}` : prev.delivery_line2,
                    delivery_suburb: locality || prev.delivery_suburb,
                    delivery_state: stateVal || prev.delivery_state,
                    delivery_postcode: postalCode || prev.delivery_postcode,
                }));
            } else {
                updateField(
                    'delivery_line1',
                    prediction.structured_formatting?.main_text || prediction.description
                );
            }
        } catch {
            updateField(
                'delivery_line1',
                prediction.structured_formatting?.main_text || prediction.description
            );
        }
    };

    const handleMedicareExpiryChange = (text: string) => {
        let v = text.replace(/[^0-9]/g, '').substring(0, 6);
        if (v.length >= 3) {
            v = v.substring(0, 2) + '/' + v.substring(2);
        }
        updateField('medicare_expiry', v);
    };

    const validateForm = (): boolean => {
        const nextErrors: Record<string, string> = {};

        if (!info.first_name.trim()) {
            nextErrors.first_name = 'First name is required.';
        }
        if (!info.last_name.trim()) {
            nextErrors.last_name = 'Last name is required.';
        }

        if (!info.phone.trim()) {
            nextErrors.phone = 'Mobile number is required.';
        } else if (!validateAustralianMobile(info.phone)) {
            nextErrors.phone = 'Please enter a valid Australian mobile (e.g. 04XX XXX XXX).';
        }

        if (!info.date_of_birth.trim()) {
            nextErrors.date_of_birth = 'Date of birth is required.';
        } else if (!validateAge18OrOlder(info.date_of_birth)) {
            nextErrors.date_of_birth = 'You must be at least 18 years old.';
        }

        if (!info.gender) {
            nextErrors.gender = 'Please select your gender.';
        }

        if (info.has_medicare) {
            if (!info.medicare_number.trim()) {
                nextErrors.medicare_number = 'Medicare number is required.';
            } else {
                const medCheck = validateMedicare(info.medicare_number);
                if (!medCheck.valid) {
                    nextErrors.medicare_number = medCheck.error || 'Invalid Medicare number.';
                }
            }

            if (!info.medicare_irn.trim()) {
                nextErrors.medicare_irn = 'IRN is required (1-9).';
            } else if (!validateMedicareIrn(info.medicare_irn)) {
                nextErrors.medicare_irn = 'IRN must be a single digit between 1 and 9.';
            }

            if (!info.medicare_expiry.trim()) {
                nextErrors.medicare_expiry = 'Expiry is required (MM/YYYY).';
            } else if (!validateMedicareExpiry(info.medicare_expiry)) {
                nextErrors.medicare_expiry = 'Format must be MM/YYYY.';
            }
        }

        if (!info.delivery_line1.trim()) {
            nextErrors.delivery_line1 = 'Street address is required.';
        }
        if (!info.delivery_suburb.trim()) {
            nextErrors.delivery_suburb = 'Suburb is required.';
        }
        if (!info.delivery_state.trim()) {
            nextErrors.delivery_state = 'State is required.';
        }
        if (!info.delivery_postcode.trim()) {
            nextErrors.delivery_postcode = 'Postcode is required.';
        } else if (!validateAustralianPostcode(info.delivery_postcode)) {
            nextErrors.delivery_postcode = 'Postcode must be 4 digits.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleContinue = () => {
        if (!validateForm()) {
            Alert.alert('Incomplete Details', 'Please correct the highlighted fields before continuing.');
            return;
        }
        void onSaveAndContinue(info);
    };

    return (
        <View style={styles.card}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>General Information</Text>
                <Text style={styles.sectionSubtitle}>Please confirm your details to continue.</Text>
            </View>

            {/* Name Row */}
            <View style={styles.row}>
                <View style={styles.halfCol}>
                    <Text style={styles.label}>
                        First name <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                        editable={!initialInfo.first_name}
                        value={info.first_name}
                        onChangeText={(t) => updateField('first_name', t)}
                        placeholder="First name"
                        placeholderTextColor={colors.mutedForeground}
                        style={[
                            styles.input,
                            initialInfo.first_name ? styles.disabledInput : null,
                            errors.first_name ? styles.inputError : null,
                        ]}
                    />
                    {errors.first_name ? <Text style={styles.errorText}>{errors.first_name}</Text> : null}
                </View>
                <View style={styles.halfCol}>
                    <Text style={styles.label}>
                        Last name <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                        editable={!initialInfo.last_name}
                        value={info.last_name}
                        onChangeText={(t) => updateField('last_name', t)}
                        placeholder="Last name"
                        placeholderTextColor={colors.mutedForeground}
                        style={[
                            styles.input,
                            initialInfo.last_name ? styles.disabledInput : null,
                            errors.last_name ? styles.inputError : null,
                        ]}
                    />
                    {errors.last_name ? <Text style={styles.errorText}>{errors.last_name}</Text> : null}
                </View>
            </View>

            {/* Readonly Email */}
            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    editable={false}
                    value={info.email}
                    style={[styles.input, styles.disabledInput]}
                />
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                    Phone <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                    value={info.phone}
                    onChangeText={(t) => updateField('phone', t)}
                    keyboardType="phone-pad"
                    placeholder="04XX XXX XXX"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, errors.phone ? styles.inputError : null]}
                />
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>

            {/* DOB & Gender */}
            <View style={styles.row}>
                <View style={styles.halfCol}>
                    <Text style={styles.label}>
                        Date of birth (YYYY-MM-DD) <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                        value={info.date_of_birth}
                        onChangeText={(t) => updateField('date_of_birth', t)}
                        placeholder="1990-01-31"
                        placeholderTextColor={colors.mutedForeground}
                        style={[styles.input, errors.date_of_birth ? styles.inputError : null]}
                    />
                    {errors.date_of_birth ? <Text style={styles.errorText}>{errors.date_of_birth}</Text> : null}
                </View>

                <View style={styles.halfCol}>
                    <Text style={styles.label}>
                        Gender <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.genderSelectRow}>
                        {(['Male', 'Female', 'Other'] as const).map((g) => (
                            <Pressable
                                key={g}
                                onPress={() => updateField('gender', g)}
                                style={[
                                    styles.genderBtn,
                                    info.gender === g && styles.genderBtnActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.genderBtnText,
                                        info.gender === g && styles.genderBtnTextActive,
                                    ]}
                                >
                                    {g}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
                </View>
            </View>

            {/* Medicare Option */}
            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Do you have a Medicare number?</Text>
                <View style={styles.yesNoRow}>
                    <Pressable
                        onPress={() => updateField('has_medicare', true)}
                        style={[styles.yesNoBtn, info.has_medicare && styles.yesNoBtnActive]}
                    >
                        <Text style={[styles.yesNoBtnText, info.has_medicare && styles.yesNoBtnTextActive]}>
                            {info.has_medicare ? '✓ Yes' : 'Yes'}
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => updateField('has_medicare', false)}
                        style={[styles.yesNoBtn, !info.has_medicare && styles.yesNoBtnActive]}
                    >
                        <Text style={[styles.yesNoBtnText, !info.has_medicare && styles.yesNoBtnTextActive]}>
                            {!info.has_medicare ? '✕ No' : 'No'}
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* Medicare Info if No */}
            {!info.has_medicare && (
                <View style={styles.infoBanner}>
                    <Text style={styles.infoBannerIcon}>ℹ️</Text>
                    <Text style={styles.infoBannerText}>
                        If you have an IHI (Individual Health Identifier) number, you can register via{' '}
                        <Text
                            style={styles.infoLink}
                            onPress={() =>
                                Linking.openURL(
                                    'https://www.servicesaustralia.gov.au/how-to-get-individual-healthcare-identifier?context=22591#a1'
                                )
                            }
                        >
                            Services Australia
                        </Text>
                        . You can proceed with the intake form and contact support once received.
                    </Text>
                </View>
            )}

            {/* Medicare Fields if Yes */}
            {info.has_medicare && (
                <View style={styles.row}>
                    <View style={{ flex: 2, marginRight: 8 }}>
                        <Text style={styles.label}>
                            Medicare No. <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <TextInput
                            value={info.medicare_number}
                            onChangeText={(t) => updateField('medicare_number', t.replace(/\D/g, '').substring(0, 10))}
                            keyboardType="numeric"
                            maxLength={10}
                            placeholder="10 digits"
                            placeholderTextColor={colors.mutedForeground}
                            style={[styles.input, errors.medicare_number ? styles.inputError : null]}
                        />
                        {errors.medicare_number ? <Text style={styles.errorText}>{errors.medicare_number}</Text> : null}
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>
                            IRN <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <TextInput
                            value={info.medicare_irn}
                            onChangeText={(t) => updateField('medicare_irn', t.replace(/\D/g, '').substring(0, 1))}
                            keyboardType="numeric"
                            maxLength={1}
                            placeholder="1-9"
                            placeholderTextColor={colors.mutedForeground}
                            style={[styles.input, errors.medicare_irn ? styles.inputError : null]}
                        />
                        {errors.medicare_irn ? <Text style={styles.errorText}>{errors.medicare_irn}</Text> : null}
                    </View>

                    <View style={{ flex: 2 }}>
                        <Text style={styles.label}>
                            Expiry <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <TextInput
                            value={info.medicare_expiry}
                            onChangeText={handleMedicareExpiryChange}
                            keyboardType="numeric"
                            maxLength={7}
                            placeholder="MM/YYYY"
                            placeholderTextColor={colors.mutedForeground}
                            style={[styles.input, errors.medicare_expiry ? styles.inputError : null]}
                        />
                        {errors.medicare_expiry ? <Text style={styles.errorText}>{errors.medicare_expiry}</Text> : null}
                    </View>
                </View>
            )}

            {/* Delivery Address */}
            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12 }]}>Delivery Address</Text>

            <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                    <Text style={styles.label}>
                        Street Address (Australia only) <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    {isSearchingPlaces ? <ActivityIndicator size="small" color={colors.primaryGreen} /> : null}
                </View>
                <TextInput
                    value={info.delivery_line1}
                    onChangeText={handleAddressLine1Change}
                    placeholder="Start typing Australian street address..."
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, errors.delivery_line1 ? styles.inputError : null]}
                />
                {errors.delivery_line1 ? <Text style={styles.errorText}>{errors.delivery_line1}</Text> : null}

                {/* Autocomplete Predictions Dropdown */}
                {showSuggestions && predictions.length > 0 ? (
                    <View style={styles.suggestionsContainer}>
                        {predictions.map((item) => (
                            <Pressable
                                key={item.place_id}
                                onPress={() => handleSelectPrediction(item)}
                                style={({ pressed }) => [
                                    styles.suggestionItem,
                                    pressed && styles.suggestionItemPressed,
                                ]}
                            >
                                <Text style={styles.suggestionIcon}>📍</Text>
                                <View style={styles.suggestionTextWrapper}>
                                    <Text style={styles.suggestionMainText}>
                                        {item.structured_formatting?.main_text || item.description}
                                    </Text>
                                    {item.structured_formatting?.secondary_text ? (
                                        <Text style={styles.suggestionSubText}>
                                            {item.structured_formatting.secondary_text}
                                        </Text>
                                    ) : null}
                                </View>
                            </Pressable>
                        ))}
                    </View>
                ) : null}
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Apartment, Suite, Unit (optional)</Text>
                <TextInput
                    value={info.delivery_line2}
                    onChangeText={(t) => updateField('delivery_line2', t)}
                    placeholder="e.g. Level 4, Apt 12"
                    placeholderTextColor={colors.mutedForeground}
                    style={styles.input}
                />
            </View>

            <View style={styles.row}>
                <View style={{ flex: 2, marginRight: 8 }}>
                    <Text style={styles.label}>
                        Suburb <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                        value={info.delivery_suburb}
                        onChangeText={(t) => updateField('delivery_suburb', t)}
                        placeholder="Suburb"
                        placeholderTextColor={colors.mutedForeground}
                        style={[styles.input, errors.delivery_suburb ? styles.inputError : null]}
                    />
                    {errors.delivery_suburb ? <Text style={styles.errorText}>{errors.delivery_suburb}</Text> : null}
                </View>

                <View style={{ flex: 1.5, marginRight: 8 }}>
                    <Text style={styles.label}>
                        State <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.stateSelectorWrap}>
                        <TextInput
                            value={info.delivery_state}
                            onChangeText={(t) => updateField('delivery_state', t.toUpperCase())}
                            placeholder="VIC"
                            maxLength={3}
                            autoCapitalize="characters"
                            placeholderTextColor={colors.mutedForeground}
                            style={[styles.input, errors.delivery_state ? styles.inputError : null]}
                        />
                    </View>
                    {errors.delivery_state ? <Text style={styles.errorText}>{errors.delivery_state}</Text> : null}
                </View>

                <View style={{ flex: 1.5 }}>
                    <Text style={styles.label}>
                        Postcode <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                        value={info.delivery_postcode}
                        onChangeText={(t) => updateField('delivery_postcode', t.replace(/\D/g, '').substring(0, 4))}
                        keyboardType="numeric"
                        maxLength={4}
                        placeholder="3000"
                        placeholderTextColor={colors.mutedForeground}
                        style={[styles.input, errors.delivery_postcode ? styles.inputError : null]}
                    />
                    {errors.delivery_postcode ? <Text style={styles.errorText}>{errors.delivery_postcode}</Text> : null}
                </View>
            </View>

            {/* Quick State Chips */}
            <View style={styles.stateChipsRow}>
                {AU_STATES.map((st) => (
                    <Pressable
                        key={st}
                        onPress={() => updateField('delivery_state', st)}
                        style={[
                            styles.stateChip,
                            info.delivery_state === st && styles.stateChipActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.stateChipText,
                                info.delivery_state === st && styles.stateChipTextActive,
                            ]}
                        >
                            {st}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Privacy Note */}
            <View style={styles.securityNote}>
                <Text style={styles.securityIcon}>🔒</Text>
                <Text style={styles.securityText}>Your information is kept secure and confidential.</Text>
            </View>

            {/* Submit Button */}
            <Pressable
                style={[styles.continueBtn, isSubmitting && styles.continueBtnDisabled]}
                disabled={isSubmitting}
                onPress={handleContinue}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text style={styles.continueBtnText}>Continue to Questions →</Text>
                )}
            </Pressable>
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
    sectionHeader: {
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
    sectionSubtitle: {
        fontSize: 13,
        color: colors.mutedForeground,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    halfCol: {
        flex: 1,
        marginRight: 8,
    },
    fieldGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.foreground,
        marginBottom: 6,
    },
    requiredStar: {
        color: colors.destructive,
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.foreground,
    },
    disabledInput: {
        backgroundColor: colors.muted,
        color: colors.mutedForeground,
    },
    inputError: {
        borderColor: colors.destructive,
        borderWidth: 1.5,
    },
    errorText: {
        fontSize: 12,
        color: colors.destructive,
        marginTop: 4,
    },
    genderSelectRow: {
        flexDirection: 'row',
        gap: 6,
    },
    genderBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        backgroundColor: colors.card,
    },
    genderBtnActive: {
        backgroundColor: colors.primaryGreen,
        borderColor: colors.primaryGreen,
    },
    genderBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.mutedForeground,
    },
    genderBtnTextActive: {
        color: '#ffffff',
    },
    yesNoRow: {
        flexDirection: 'row',
        gap: 12,
    },
    yesNoBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: radii.full,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
    },
    yesNoBtnActive: {
        backgroundColor: colors.primaryGreen,
        borderColor: colors.primaryGreen,
        ...shadows.tier1,
    },
    yesNoBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.mutedForeground,
    },
    yesNoBtnTextActive: {
        color: '#ffffff',
    },
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: colors.secondary,
        padding: 12,
        borderRadius: radii.md,
        marginBottom: 14,
        alignItems: 'flex-start',
    },
    infoBannerIcon: {
        fontSize: 16,
        marginRight: 8,
        marginTop: 2,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        color: colors.mutedForeground,
    },
    infoLink: {
        color: colors.primaryGreen,
        textDecorationLine: 'underline',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 16,
    },
    stateSelectorWrap: {
        position: 'relative',
    },
    stateChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 16,
        marginTop: 2,
    },
    stateChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    stateChipActive: {
        backgroundColor: colors.accentLime,
        borderColor: colors.primaryGreen,
    },
    stateChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.mutedForeground,
    },
    stateChipTextActive: {
        color: colors.primaryGreen,
    },
    securityNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.muted,
        padding: 10,
        borderRadius: radii.md,
        marginBottom: 20,
    },
    securityIcon: {
        marginRight: 8,
        fontSize: 14,
    },
    securityText: {
        fontSize: 12,
        color: colors.mutedForeground,
    },
    continueBtn: {
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.full,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.tier2,
    },
    continueBtnDisabled: {
        opacity: 0.6,
    },
    continueBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    fieldLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    suggestionsContainer: {
        marginTop: 6,
        borderRadius: radii.md,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: colors.border,
        maxHeight: 220,
        overflow: 'hidden',
        ...shadows.tier1,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    suggestionItemPressed: {
        backgroundColor: colors.secondary,
    },
    suggestionIcon: {
        fontSize: 14,
        marginRight: 8,
    },
    suggestionTextWrapper: {
        flex: 1,
    },
    suggestionMainText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.foreground,
    },
    suggestionSubText: {
        fontSize: 11,
        color: colors.mutedForeground,
        marginTop: 2,
    },
});
