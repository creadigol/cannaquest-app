import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import { useCreateTicket, useSupportContext, useUploadAttachment } from '../hooks/useSupport';
import type { Attachment, TicketPriority } from '../api/support.types';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSuccess: (ticketId: string) => void;
}

const PORTAL_PAGES = [
    { label: 'General / Whole App', value: 'General' },
    { label: 'Home / Dashboard', value: 'Home / Dashboard' },
    { label: 'Consultations & Bookings', value: 'Consultations' },
    { label: 'Prescriptions & Scripts', value: 'Prescriptions' },
    { label: 'Products & Medicine', value: 'Products' },
    { label: 'Orders & History', value: 'Orders' },
    { label: 'Shopping Cart', value: 'Cart' },
    { label: 'Checkout & Payment', value: 'Checkout' },
    { label: 'Patient Profile & Medical Info', value: 'Profile' },
    { label: 'Support & Tickets', value: 'Support' },
];

const PRIORITIES: Array<{
    value: TicketPriority;
    label: string;
    desc: string;
    dot: string;
    badgeBg: string;
    badgeBorder: string;
}> = [
    {
        value: 'low',
        label: 'Low',
        desc: 'Question or minor issue',
        dot: '#16a34a',
        badgeBg: '#f0fdf4',
        badgeBorder: '#bbf7d0',
    },
    {
        value: 'medium',
        label: 'Medium',
        desc: 'Something isn’t working',
        dot: '#d97706',
        badgeBg: '#fffbeb',
        badgeBorder: '#fde68a',
    },
    {
        value: 'high',
        label: 'High',
        desc: 'Unable to continue',
        dot: '#ea580c',
        badgeBg: '#fff7ed',
        badgeBorder: '#fdba74',
    },
    {
        value: 'urgent',
        label: 'Urgent',
        desc: 'Critical error affecting health or care',
        dot: '#dc2626',
        badgeBg: '#fef2f2',
        badgeBorder: '#fecaca',
    },
];

export function CreateTicketModal({ visible, onClose, onSuccess }: Props) {
    // Ensure context is loaded
    useSupportContext();

    const scrollRef = useRef<ScrollView>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setIsKeyboardVisible(true)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setIsKeyboardVisible(false)
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [priority, setPriority] = useState<TicketPriority>('medium');
    const [pageContext, setPageContext] = useState('');
    const [showPagePicker, setShowPagePicker] = useState(false);
    const [files, setFiles] = useState<Array<{ uri: string; name: string; type: string; size?: number }>>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const createMutation = useCreateTicket();
    const uploadMutation = useUploadAttachment();

    const handlePickFiles = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'image/*',
                    'video/*',
                    'application/pdf',
                    'text/csv',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel',
                ],
                multiple: true,
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.length) return;

            const selected = result.assets.map((a) => ({
                uri: a.uri,
                name: a.name,
                type: a.mimeType || 'application/octet-stream',
                size: a.size,
            }));

            // Validate against patient-portal limits (200MB max per file or total)
            for (const file of selected) {
                if (file.size && file.size > 200 * 1024 * 1024) {
                    Alert.alert('File too large', `${file.name} exceeds the 200 MB limit.`);
                    return;
                }
            }

            setFiles((prev) => {
                const combined = [...prev, ...selected];
                if (combined.length > 10) {
                    Alert.alert('File limit', 'You can attach up to 10 files in total.');
                    return combined.slice(0, 10);
                }
                return combined;
            });
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not select document.');
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!subject.trim()) {
            Alert.alert('Required', 'Please enter a subject.');
            return;
        }
        if (!pageContext) {
            Alert.alert('Required', 'Please select where it happened.');
            return;
        }
        if (!body.trim()) {
            Alert.alert('Required', 'Please explain what happened in the description.');
            return;
        }

        setUploading(true);
        try {
            // Upload files sequentially with progress
            const attachmentIds: string[] = [];
            for (let i = 0; i < files.length; i++) {
                setUploadProgress(`Uploading attachment ${i + 1} of ${files.length}...`);
                const uploaded = await uploadMutation.mutateAsync({ file: files[i] });
                attachmentIds.push(uploaded.id);
            }

            setUploadProgress('Submitting your ticket...');
            const requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            });

            const created = await createMutation.mutateAsync({
                requestId,
                subject: subject.trim(),
                description: body.trim(),
                priority,
                pageContext,
                attachmentIds,
            });

            // Reset state
            setSubject('');
            setBody('');
            setPriority('medium');
            setPageContext('');
            setFiles([]);
            setUploadProgress('');

            onSuccess(created.id);
        } catch (err: any) {
            Alert.alert('Submission Error', err?.message || 'Failed to submit support ticket.');
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    const selectedPageLabel =
        PORTAL_PAGES.find((p) => p.value === pageContext)?.label || null;

    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.backdrop}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => {
                        Keyboard.dismiss();
                        onClose();
                    }}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                    style={styles.sheetContainer}
                >
                    <View style={styles.sheet}>
                        {/* Drag Handle */}
                        <View style={styles.dragHandleWrap}>
                            <View style={styles.dragHandle} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>New Support Ticket</Text>
                                <Text style={styles.subtitle}>
                                    Direct to CannaQuest clinical and administrative support team
                                </Text>
                            </View>
                            <Pressable
                                hitSlop={12}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    onClose();
                                }}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </Pressable>
                        </View>

                        <ScrollView
                            ref={scrollRef}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            contentContainerStyle={[
                                styles.scrollContent,
                                isKeyboardVisible && styles.scrollContentKeyboard,
                            ]}
                        >
                            {/* Subject */}
                            <Text style={styles.fieldLabel}>Subject *</Text>
                            <TextInput
                                placeholder="A short summary of what you need help with"
                                placeholderTextColor={colors.textTertiary}
                                value={subject}
                                maxLength={120}
                                onChangeText={setSubject}
                                onFocus={() => {
                                    scrollRef.current?.scrollTo({ y: 0, animated: true });
                                }}
                                style={styles.textInput}
                            />

                            {/* Priority Radios (matching patient-portal exactly) */}
                            <Text style={styles.fieldLabel}>Priority</Text>
                            <View style={styles.priorityGrid}>
                                {PRIORITIES.map((p) => {
                                    const active = priority === p.value;
                                    return (
                                        <Pressable
                                            key={p.value}
                                            onPress={() => setPriority(p.value)}
                                            style={[
                                                styles.priorityCard,
                                                active && {
                                                    backgroundColor: p.badgeBg,
                                                    borderColor: p.dot,
                                                    borderWidth: 2,
                                                },
                                            ]}
                                        >
                                            <View style={styles.prioTopRow}>
                                                <View style={[styles.prioDot, { backgroundColor: p.dot }]} />
                                                <Text
                                                    style={[
                                                        styles.prioTitle,
                                                        active && { color: p.dot, fontWeight: '800' },
                                                    ]}
                                                >
                                                    {p.label}
                                                </Text>
                                            </View>
                                            <Text numberOfLines={2} style={styles.prioDesc}>
                                                {p.desc}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Where did it happen? Dropdown picker */}
                            <Text style={styles.fieldLabel}>Where did it happen? *</Text>

                            <Pressable
                                onPress={() => setShowPagePicker((prev) => !prev)}
                                style={styles.selectTrigger}
                            >
                                <Text
                                    style={[
                                        styles.selectTriggerText,
                                        !selectedPageLabel && { color: colors.textTertiary },
                                    ]}
                                >
                                    📍 {selectedPageLabel || 'Select where it happened...'}
                                </Text>
                                <Text style={styles.selectChevron}>{showPagePicker ? '▲' : '▼'}</Text>
                            </Pressable>

                            {showPagePicker && (
                                <View style={styles.pickerBox}>
                                    {PORTAL_PAGES.map((opt) => {
                                        const isSelected = opt.value === pageContext;
                                        return (
                                            <Pressable
                                                key={opt.label}
                                                onPress={() => {
                                                    setPageContext(opt.value);
                                                    setShowPagePicker(false);
                                                }}
                                                style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.pickerItemText,
                                                        isSelected && styles.pickerItemTextSelected,
                                                    ]}
                                                >
                                                    {opt.label}
                                                </Text>
                                                {isSelected && <Text style={styles.pickerCheck}>✓</Text>}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Description (What happened?) */}
                            <Text style={styles.fieldLabel}>What happened? *</Text>
                            <TextInput
                                placeholder="Tell us what you were doing, what happened, and what you expected. You can include order numbers or details."
                                placeholderTextColor={colors.textTertiary}
                                value={body}
                                maxLength={10000}
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                                onChangeText={setBody}
                                onFocus={() => {
                                    setTimeout(() => {
                                        scrollRef.current?.scrollToEnd({ animated: true });
                                    }, 150);
                                }}
                                style={[styles.textInput, styles.textArea]}
                            />

                            {/* Attachments Section */}
                            <View style={styles.attachCard}>
                                <View style={styles.attachCardTop}>
                                    <Text style={styles.attachIcon}>📎</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.attachTitle}>Attach screenshots or recordings</Text>
                                        <Text style={styles.attachSubtitle}>
                                            Images, videos, PDFs · Up to 10 files (200MB max)
                                        </Text>
                                    </View>
                                    <Pressable
                                        disabled={uploading || files.length >= 10}
                                        onPress={handlePickFiles}
                                        style={styles.addFilesBtn}
                                    >
                                        <Text style={styles.addFilesBtnText}>+ Choose File</Text>
                                    </Pressable>
                                </View>

                                {files.length > 0 && (
                                    <View style={styles.fileChipsRow}>
                                        {files.map((file, idx) => (
                                            <View key={`${file.name}-${idx}`} style={styles.fileChip}>
                                                <Text numberOfLines={1} style={styles.fileChipName}>
                                                    📎 {file.name}
                                                </Text>
                                                <Pressable
                                                    hitSlop={8}
                                                    onPress={() => handleRemoveFile(idx)}
                                                    style={styles.fileChipRemove}
                                                >
                                                    <Text style={styles.fileChipRemoveText}>✕</Text>
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {/* Bottom Action Footer */}
                        <View style={styles.footer}>
                            <Pressable
                                disabled={
                                    uploading ||
                                    createMutation.isPending ||
                                    !subject.trim() ||
                                    !pageContext ||
                                    !body.trim()
                                }
                                onPress={handleSubmit}
                                style={[
                                    styles.submitBtn,
                                    (uploading ||
                                        createMutation.isPending ||
                                        !subject.trim() ||
                                        !pageContext ||
                                        !body.trim()) &&
                                        styles.submitBtnDisabled,
                                ]}
                            >
                                {uploading || createMutation.isPending ? (
                                    <View style={styles.loadingRow}>
                                        <ActivityIndicator color={colors.white} size="small" />
                                        <Text style={styles.submitBtnText}>
                                            {uploadProgress || 'Submitting ticket...'}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={styles.submitBtnText}>Submit Support Ticket</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
    sheetContainer: {
        width: '100%',
        maxHeight: '94%',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        flexShrink: 1,
        width: '100%',
        maxHeight: '100%',
    },
    dragHandleWrap: {
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 4,
    },
    dragHandle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(0,0,0,0.18)',
    },
    header: {
        alignItems: 'center',
        borderBottomColor: colors.borderLight,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        backgroundColor: colors.surfaceNeutral,
        borderRadius: 20,
        padding: 8,
    },
    closeBtnText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 24,
    },
    scrollContentKeyboard: {
        paddingBottom: 140,
    },
    fieldLabel: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 6,
        marginTop: spacing.sm + 2,
    },
    labelRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm + 2,
    },
    optionalText: {
        color: colors.textTertiary,
        fontSize: 11.5,
    },
    textInput: {
        backgroundColor: colors.surfaceNeutral,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        color: colors.textPrimary,
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    textArea: {
        height: 110,
    },
    priorityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    priorityCard: {
        backgroundColor: colors.surfaceNeutral,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        flexBasis: '48%',
        flexGrow: 1,
        padding: 10,
    },
    prioTopRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
        marginBottom: 3,
    },
    prioDot: {
        borderRadius: 4,
        height: 8,
        width: 8,
    },
    prioTitle: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    prioDesc: {
        color: colors.textSecondary,
        fontSize: 10.5,
        lineHeight: 14,
    },
    selectTrigger: {
        alignItems: 'center',
        backgroundColor: colors.surfaceNeutral,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    selectTriggerText: {
        color: colors.textPrimary,
        fontSize: 13.5,
        fontWeight: '500',
    },
    selectChevron: {
        color: colors.textSecondary,
        fontSize: 10,
    },
    pickerBox: {
        backgroundColor: colors.white,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        marginTop: 6,
        ...shadows.sm,
    },
    pickerItem: {
        alignItems: 'center',
        borderBottomColor: colors.borderLight,
        borderBottomWidth: 0.5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    pickerItemSelected: {
        backgroundColor: '#f0fdf4',
    },
    pickerItemText: {
        color: colors.textPrimary,
        fontSize: 13,
    },
    pickerItemTextSelected: {
        color: colors.primaryGreen,
        fontWeight: '700',
    },
    pickerCheck: {
        color: colors.primaryGreen,
        fontSize: 13,
        fontWeight: '800',
    },
    attachCard: {
        backgroundColor: colors.surfaceNeutral,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        marginTop: 16,
        padding: 12,
    },
    attachCardTop: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    attachIcon: {
        fontSize: 20,
    },
    attachTitle: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    attachSubtitle: {
        color: colors.textSecondary,
        fontSize: 11,
        marginTop: 1,
    },
    addFilesBtn: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderRadius: radii.md,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    addFilesBtnText: {
        color: colors.primaryGreen,
        fontSize: 11.5,
        fontWeight: '700',
    },
    fileChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    fileChip: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.borderLight,
        borderRadius: radii.sm,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    fileChipName: {
        color: colors.textPrimary,
        fontSize: 11,
        maxWidth: 160,
    },
    fileChipRemove: {
        padding: 2,
    },
    fileChipRemoveText: {
        color: colors.destructive,
        fontSize: 11,
        fontWeight: '800',
    },
    footer: {
        borderTopColor: colors.borderLight,
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
        backgroundColor: colors.white,
    },
    submitBtn: {
        alignItems: 'center',
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.md,
        paddingVertical: 14,
        ...shadows.sm,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    loadingRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    submitBtnText: {
        color: colors.white,
        fontSize: 14.5,
        fontWeight: '700',
    },
});
