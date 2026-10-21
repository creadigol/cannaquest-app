import React, { useState } from 'react';
import {
    ActivityIndicator,
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
import type { CustomerAddress, UpdateAddressDto } from '../api/customer.types';

type Props = {
    visible: boolean;
    address: CustomerAddress | null;
    onClose: () => void;
    onSave: (data: UpdateAddressDto) => Promise<void>;
};

const AU_STATES: Array<UpdateAddressDto['addrState']> = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

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

export function EditAddressModal({ visible, address, onClose, onSave }: Props) {
    const [line1, setLine1] = useState(address?.line1 || '');
    const [line2, setLine2] = useState(address?.line2 || '');
    const [suburb, setSuburb] = useState(address?.suburb || '');
    const [state, setState] = useState<UpdateAddressDto['addrState']>(
        (address?.state as UpdateAddressDto['addrState']) || 'NSW'
    );
    const [postcode, setPostcode] = useState(address?.postcode || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Google Places autocomplete state
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync state when address prop changes
    React.useEffect(() => {
        if (address) {
            setLine1(address.line1 || '');
            setLine2(address.line2 || '');
            setSuburb(address.suburb || '');
            setState((address.state as UpdateAddressDto['addrState']) || 'NSW');
            setPostcode(address.postcode || '');
        }
    }, [address]);

    const searchPlaces = async (text: string) => {
        if (!text || text.trim().length < 3) {
            setPredictions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            setIsSearching(true);
            // Strictly Australia only: components=country:au
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
            setIsSearching(false);
        }
    };

    const handleLine1Change = (text: string) => {
        setLine1(text);
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

                const parsedLine1 = [streetNumber, route].filter(Boolean).join(' ') || prediction.structured_formatting?.main_text || prediction.description;
                setLine1(parsedLine1);

                if (subpremise) {
                    setLine2(`Unit ${subpremise}`);
                }

                if (locality) {
                    setSuburb(locality);
                }

                if (stateVal && AU_STATES.includes(stateVal as UpdateAddressDto['addrState'])) {
                    setState(stateVal as UpdateAddressDto['addrState']);
                }

                if (postalCode) {
                    setPostcode(postalCode);
                }
            } else {
                setLine1(prediction.structured_formatting?.main_text || prediction.description);
            }
        } catch {
            setLine1(prediction.structured_formatting?.main_text || prediction.description);
        }
    };

    const handleSave = async () => {
        if (!line1.trim() || !suburb.trim() || !postcode.trim()) {
            setError('Please complete Address line 1, Suburb, and Postcode.');
            return;
        }

        try {
            setError(null);
            setIsSaving(true);
            await onSave({
                addrLine1: line1.trim(),
                addrLine2: line2.trim() || undefined,
                addrSuburb: suburb.trim(),
                addrState: state,
                addrPostcode: postcode.trim(),
            });
            onClose();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update delivery address.';
            setError(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal animationType="slide" transparent visible={visible}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Delivery Address</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </Pressable>
                    </View>

                    {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        style={styles.form}
                    >
                        <View style={styles.fieldHeader}>
                            <Text style={styles.label}>Address Line 1 (Australia only) *</Text>
                            {isSearching ? <ActivityIndicator color={colors.primaryGreen} size="small" /> : null}
                        </View>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                onChangeText={handleLine1Change}
                                placeholder="Start typing Australian street address..."
                                placeholderTextColor={colors.gray400}
                                style={styles.input}
                                value={line1}
                            />
                        </View>

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

                        <Text style={styles.label}>Address Line 2 (Optional)</Text>
                        <TextInput
                            onChangeText={setLine2}
                            placeholder="Unit, suite, level"
                            placeholderTextColor={colors.gray400}
                            style={styles.input}
                            value={line2}
                        />

                        <Text style={styles.label}>Suburb *</Text>
                        <TextInput
                            onChangeText={setSuburb}
                            placeholder="Suburb"
                            placeholderTextColor={colors.gray400}
                            style={styles.input}
                            value={suburb}
                        />

                        <Text style={styles.label}>State *</Text>
                        <View style={styles.stateRow}>
                            {AU_STATES.map((st) => {
                                const selected = state === st;
                                return (
                                    <Pressable
                                        key={st}
                                        onPress={() => setState(st)}
                                        style={[styles.stateChip, selected && styles.stateChipSelected]}
                                    >
                                        <Text style={[styles.stateChipText, selected && styles.stateChipTextSelected]}>
                                            {st}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={styles.label}>Postcode (4 digits) *</Text>
                        <TextInput
                            keyboardType="numeric"
                            maxLength={4}
                            onChangeText={setPostcode}
                            placeholder="2000"
                            placeholderTextColor={colors.gray400}
                            style={styles.input}
                            value={postcode}
                        />
                    </ScrollView>

                    <Pressable
                        disabled={isSaving}
                        onPress={handleSave}
                        style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, isSaving && styles.btnDisabled]}
                    >
                        {isSaving ? (
                            <ActivityIndicator color={colors.primaryGreen} />
                        ) : (
                            <Text style={styles.saveBtnText}>Save Address</Text>
                        )}
                    </Pressable>
                </View>
            </View>
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
        maxHeight: '90%',
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
    form: {
        maxHeight: 380,
    },
    label: {
        color: colors.foreground,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        backgroundColor: colors.white,
        borderColor: colors.gray200,
        borderRadius: radii.md,
        borderWidth: 1,
        color: colors.foreground,
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    fieldHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 6,
    },
    inputWrapper: {
        position: 'relative',
    },
    suggestionsContainer: {
        backgroundColor: colors.white,
        borderColor: colors.gray200,
        borderRadius: radii.md,
        borderWidth: 1,
        marginTop: 4,
        maxHeight: 180,
        overflow: 'hidden',
        ...shadows.tier2,
    },
    suggestionItem: {
        alignItems: 'center',
        borderBottomColor: colors.gray100,
        borderBottomWidth: 1,
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    suggestionItemPressed: {
        backgroundColor: colors.gray100,
    },
    suggestionIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    suggestionTextWrapper: {
        flex: 1,
    },
    suggestionMainText: {
        color: colors.foreground,
        fontSize: 13,
        fontWeight: '600',
    },
    suggestionSubText: {
        color: colors.mutedForeground,
        fontSize: 11,
        marginTop: 2,
    },
    stateRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 2,
    },
    stateChip: {
        alignItems: 'center',
        backgroundColor: colors.gray100,
        borderRadius: radii.md,
        justifyContent: 'center',
        minWidth: 44,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    stateChipSelected: {
        backgroundColor: colors.emeraldChipBg,
        borderColor: colors.emeraldChipBorder,
        borderWidth: 1,
    },
    stateChipText: {
        color: colors.mutedForeground,
        fontSize: 12,
        fontWeight: '600',
    },
    stateChipTextSelected: {
        color: colors.primaryGreen,
        fontWeight: '700',
    },
    saveBtn: {
        alignItems: 'center',
        backgroundColor: colors.brandLime,
        borderRadius: radii.full,
        marginTop: 16,
        paddingVertical: 14,
    },
    saveBtnText: {
        color: colors.primaryGreen,
        fontSize: 15,
        fontWeight: '700',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    pressed: {
        opacity: 0.85,
    },
});
