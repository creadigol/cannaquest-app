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
import type { Customer, UpdateProfileDto } from '../api/customer.types';

type Props = {
    visible: boolean;
    customer: Customer;
    onClose: () => void;
    onSave: (data: UpdateProfileDto) => Promise<void>;
};

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

// Helper to format Australian mobile: 0412 345 678
function formatAustralianMobile(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

// Helper to format DOB input: YYYY-MM-DD
function formatDobInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function EditProfileModal({ visible, customer, onClose, onSave }: Props) {
    const [firstName, setFirstName] = useState(customer.firstName || '');
    const [lastName, setLastName] = useState(customer.lastName || '');
    const [phone, setPhone] = useState(formatAustralianMobile(customer.phone || ''));
    const [dateOfBirth, setDateOfBirth] = useState(
        customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : ''
    );
    const [gender, setGender] = useState(customer.gender || '');
    const [medicareNumber, setMedicareNumber] = useState(customer.medicareNumber || '');
    const [medicareIrn, setMedicareIrn] = useState(customer.medicareIrn || '');
    const [medicareExpiry, setMedicareExpiry] = useState(customer.medicareExpiry || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePhoneChange = (text: string) => {
        setPhone(formatAustralianMobile(text));
    };

    const handleDobChange = (text: string) => {
        setDateOfBirth(formatDobInput(text));
    };

    const handleSave = async () => {
        // Validate First Name and Last Name
        if (!firstName.trim()) {
            setError('Please enter your first name.');
            return;
        }
        if (!lastName.trim()) {
            setError('Please enter your last name.');
            return;
        }

        // Validate Australian Phone
        const rawDigits = phone.replace(/\D/g, '');
        if (!rawDigits.startsWith('04') || rawDigits.length !== 10) {
            setError('Please enter a valid Australian mobile number starting with 04 (e.g. 0412 345 678).');
            return;
        }

        // Validate Date of Birth
        let formattedIsoDob: string | undefined = undefined;
        if (dateOfBirth.trim()) {
            const dobClean = dateOfBirth.trim();
            const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dobRegex.test(dobClean)) {
                setError('Date of birth must be in YYYY-MM-DD format (e.g. 1990-05-15).');
                return;
            }

            const [yearStr, monthStr, dayStr] = dobClean.split('-');
            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10);
            const day = parseInt(dayStr, 10);

            const parsedDate = new Date(`${yearStr}-${monthStr}-${dayStr}T00:00:00.000Z`);
            if (
                isNaN(parsedDate.getTime()) ||
                month < 1 ||
                month > 12 ||
                day < 1 ||
                day > 31 ||
                year < 1900 ||
                parsedDate > new Date()
            ) {
                setError('Please enter a valid past calendar date of birth (YYYY-MM-DD).');
                return;
            }

            formattedIsoDob = dobClean;
        }

        try {
            setError(null);
            setIsSaving(true);
            await onSave({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: rawDigits,
                dateOfBirth: formattedIsoDob,
                gender: gender || undefined,
                medicareNumber: medicareNumber.trim().replace(/\s+/g, '') || null,
                medicareIrn: medicareIrn.trim() || null,
                medicareExpiry: medicareExpiry.trim() || null,
            });
            onClose();
        } catch (err: unknown) {
            let message = err instanceof Error ? err.message : 'Failed to update personal details.';
            if (message.includes('ISO 8601') || message.includes('dateOfBirth')) {
                message = 'Please enter a valid date of birth (YYYY-MM-DD).';
            }
            if (message.includes('phone')) {
                message = 'Please enter a valid Australian mobile number (04xx xxx xxx).';
            }
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
                        <Text style={styles.title}>Edit Personal Details</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </Pressable>
                    </View>

                    {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.form}>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <Text style={styles.label}>First Name *</Text>
                                <TextInput
                                    onChangeText={setFirstName}
                                    placeholder="First name"
                                    placeholderTextColor={colors.gray400}
                                    style={styles.input}
                                    value={firstName}
                                />
                            </View>
                            <View style={styles.half}>
                                <Text style={styles.label}>Last Name *</Text>
                                <TextInput
                                    onChangeText={setLastName}
                                    placeholder="Last name"
                                    placeholderTextColor={colors.gray400}
                                    style={styles.input}
                                    value={lastName}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Mobile Phone (Australian) *</Text>
                        <TextInput
                            keyboardType="phone-pad"
                            maxLength={12}
                            onChangeText={handlePhoneChange}
                            placeholder="0412 345 678"
                            placeholderTextColor={colors.gray400}
                            style={styles.input}
                            value={phone}
                        />

                        <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
                        <TextInput
                            keyboardType="numeric"
                            maxLength={10}
                            onChangeText={handleDobChange}
                            placeholder="1990-05-15"
                            placeholderTextColor={colors.gray400}
                            style={styles.input}
                            value={dateOfBirth}
                        />

                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.genderRow}>
                            {GENDERS.map((g) => {
                                const selected = gender.toLowerCase() === g.toLowerCase();
                                return (
                                    <Pressable
                                        key={g}
                                        onPress={() => setGender(g)}
                                        style={[styles.genderChip, selected && styles.genderChipSelected]}
                                    >
                                        <Text style={[styles.genderChipText, selected && styles.genderChipTextSelected]}>
                                            {g}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={styles.label}>Medicare Card Number</Text>
                        <TextInput
                            keyboardType="numeric"
                            maxLength={10}
                            onChangeText={setMedicareNumber}
                            placeholder="2123456789"
                            placeholderTextColor={colors.gray400}
                            style={styles.input}
                            value={medicareNumber}
                        />

                        <View style={styles.row}>
                            <View style={styles.half}>
                                <Text style={styles.label}>Individual Ref (IRN)</Text>
                                <TextInput
                                    keyboardType="numeric"
                                    maxLength={1}
                                    onChangeText={setMedicareIrn}
                                    placeholder="1"
                                    placeholderTextColor={colors.gray400}
                                    style={styles.input}
                                    value={medicareIrn}
                                />
                            </View>
                            <View style={styles.half}>
                                <Text style={styles.label}>Expiry (MM/YYYY)</Text>
                                <TextInput
                                    maxLength={7}
                                    onChangeText={(v) => {
                                        const clean = v.replace(/[^0-9]/g, '');
                                        if (clean.length > 2) {
                                            setMedicareExpiry(`${clean.slice(0, 2)}/${clean.slice(2, 6)}`);
                                        } else {
                                            setMedicareExpiry(clean);
                                        }
                                    }}
                                    placeholder="01/2028"
                                    placeholderTextColor={colors.gray400}
                                    style={styles.input}
                                    value={medicareExpiry}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <Pressable
                        disabled={isSaving}
                        onPress={handleSave}
                        style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, isSaving && styles.btnDisabled]}
                    >
                        {isSaving ? (
                            <ActivityIndicator color={colors.primaryGreen} />
                        ) : (
                            <Text style={styles.saveBtnText}>Save Changes</Text>
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
        maxHeight: 420,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    half: {
        flex: 1,
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
    genderRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 2,
    },
    genderChip: {
        backgroundColor: colors.gray100,
        borderRadius: radii.full,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    genderChipSelected: {
        backgroundColor: colors.emeraldChipBg,
        borderColor: colors.emeraldChipBorder,
        borderWidth: 1,
    },
    genderChipText: {
        color: colors.mutedForeground,
        fontSize: 12,
        fontWeight: '600',
    },
    genderChipTextSelected: {
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
