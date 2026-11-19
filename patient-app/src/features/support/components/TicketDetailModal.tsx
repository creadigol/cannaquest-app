import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import {
    useReplyToTicket,
    useRevokeTicket,
    useSupportContext,
    useTicketDetail,
    useUploadAttachment,
} from '../hooks/useSupport';
import { getAttachmentUrl, getSupportHeaders } from '../api/support.api';
import {
    Attachment,
    TICKET_STATUS_LABELS,
    TicketPriority,
    TicketStatus,
} from '../api/support.types';

interface Props {
    ticketId: string | null;
    visible: boolean;
    onClose: () => void;
}

function formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(iso?: string | null): string {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-AU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return String(iso);
    }
}

function isImageAttachment(att: Attachment): boolean {
    const mime = (att.mime || '').toLowerCase();
    const name = (att.fileName || '').toLowerCase();
    return (
        mime.startsWith('image/') ||
        mime.includes('heic') ||
        mime.includes('heif') ||
        name.endsWith('.png') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.webp') ||
        name.endsWith('.gif') ||
        name.endsWith('.heic') ||
        name.endsWith('.heif') ||
        name.endsWith('.bmp') ||
        name.endsWith('.svg')
    );
}

function getPriorityStyle(priority?: TicketPriority) {
    switch (priority) {
        case 'urgent':
            return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
        case 'high':
            return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' };
        case 'medium':
            return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
        case 'low':
        default:
            return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
    }
}

function getStatusStyle(status?: TicketStatus) {
    switch (status) {
        case 'resolved':
        case 'closed':
            return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
        case 'revoked':
            return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
        case 'waiting':
            return { bg: '#fef9c3', text: '#a16207', border: '#fde047' };
        case 'in_progress':
            return { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' };
        case 'open':
        default:
            return { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' };
    }
}

export function TicketDetailModal({ ticketId, visible, onClose }: Props) {
    useSupportContext();

    const { data: ticket, isLoading } = useTicketDetail(ticketId);
    const replyMutation = useReplyToTicket();
    const revokeMutation = useRevokeTicket();
    const uploadMutation = useUploadAttachment();

    // Image preview state
    const [previewImage, setPreviewImage] = useState<{
        uri: string;
        headers?: Record<string, string>;
        fileName: string;
        size?: number;
    } | null>(null);
    const [isImageLoading, setIsImageLoading] = useState(false);

    // Download loader tracking
    const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);

    // Revoke prompt modal state
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [revokeReason, setRevokeReason] = useState('');

    // Reply state (ONLY active when ticket is revoked by user)
    const [replyText, setReplyText] = useState('');
    const [stagedFiles, setStagedFiles] = useState<Array<{ uri: string; name: string; type: string }>>([]);
    const [isSendingReply, setIsSendingReply] = useState(false);

    // Dynamic keyboard tracking for responsive dialog positioning
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    if (!visible || !ticketId) return null;

    const isRevoked = ticket?.status === 'revoked';
    const statusTheme = getStatusStyle(ticket?.status);
    const priorityTheme = getPriorityStyle(ticket?.priority);

    // Handles viewing or downloading attachments with full authentication
    const handleOpenAttachment = async (att: Attachment) => {
        if (isImageAttachment(att)) {
            setIsImageLoading(true);
            setPreviewImage({
                uri: getAttachmentUrl(att.id),
                headers: getSupportHeaders(),
                fileName: att.fileName,
                size: att.size,
            });
            return;
        }

        try {
            setIsDownloadingId(att.id);
            const headers = getSupportHeaders();
            const cleanName = (att.fileName || `file_${att.id}`).replace(/[^a-zA-Z0-9._-]/g, '_');
            const localPath = `${FileSystem.cacheDirectory}${cleanName}`;

            const fileInfo = await FileSystem.getInfoAsync(localPath);
            let finalUri = localPath;

            if (!fileInfo.exists) {
                const res = await FileSystem.downloadAsync(
                    getAttachmentUrl(att.id),
                    localPath,
                    { headers }
                );
                if (res.status >= 400) {
                    throw new Error(`Server returned status ${res.status}`);
                }
                finalUri = res.uri;
            }

            if (Platform.OS === 'android') {
                const contentUri = await FileSystem.getContentUriAsync(finalUri);
                const can = await Linking.canOpenURL(contentUri);
                if (can) {
                    await Linking.openURL(contentUri);
                } else {
                    Alert.alert('File Saved', `Saved to device: ${att.fileName}`);
                }
            } else {
                const can = await Linking.canOpenURL(finalUri);
                if (can) {
                    await Linking.openURL(finalUri);
                } else {
                    Alert.alert('File Saved', `File saved: ${att.fileName}`);
                }
            }
        } catch (err: any) {
            Alert.alert('Attachment Error', err?.message || 'Could not download attachment.');
        } finally {
            setIsDownloadingId(null);
        }
    };

    // Confirm revocation
    const handleConfirmRevoke = async () => {
        try {
            await revokeMutation.mutateAsync({
                ticketId,
                reason: revokeReason.trim() || 'Ticket revoked by patient',
            });
            setShowRevokeModal(false);
            setRevokeReason('');
            Alert.alert('Ticket Revoked', 'Your ticket has been marked as revoked.');
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to revoke ticket.');
        }
    };

    // Staged attachments for reply (only accessible when ticket is revoked)
    const handlePickReplyAttachment = async () => {
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
            }));

            setStagedFiles((prev) => [...prev, ...selected].slice(0, 10));
        } catch (err: any) {
            Alert.alert('Upload Error', err?.message || 'Failed to pick attachment.');
        }
    };

    const handleSendRevokedReply = async () => {
        if (!replyText.trim() && stagedFiles.length === 0) return;

        setIsSendingReply(true);
        try {
            const attachmentIds: string[] = [];
            for (const file of stagedFiles) {
                const uploaded = await uploadMutation.mutateAsync({ file, ticketId });
                attachmentIds.push(uploaded.id);
            }

            await replyMutation.mutateAsync({
                ticketId,
                payload: {
                    body: replyText.trim(),
                    attachmentIds,
                },
            });

            setReplyText('');
            setStagedFiles([]);
            Alert.alert('Message Sent', 'Your follow-up message has been sent.');
        } catch (err: any) {
            Alert.alert('Reply Failed', err?.message || 'Failed to send reply.');
        } finally {
            setIsSendingReply(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={() => {
                if (previewImage) {
                    setPreviewImage(null);
                } else if (showRevokeModal) {
                    setShowRevokeModal(false);
                } else {
                    onClose();
                }
            }}
            statusBarTranslucent
        >
            <View style={styles.modalRoot}>
                <View style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <View style={styles.sheetContainer}>
                    <View style={styles.sheet}>
                        {/* Header Bar */}
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <View style={styles.refRow}>
                                    <Text style={styles.referenceText}>
                                        {ticket?.reference || `#${ticketId.slice(0, 8)}`}
                                    </Text>
                                    {ticket?.status ? (
                                        <View
                                            style={[
                                                styles.badgePill,
                                                {
                                                    backgroundColor: statusTheme.bg,
                                                    borderColor: statusTheme.border,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.badgePillText,
                                                    { color: statusTheme.text },
                                                ]}
                                            >
                                                {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                                            </Text>
                                        </View>
                                    ) : null}
                                    {ticket?.priority ? (
                                        <View
                                            style={[
                                                styles.badgePill,
                                                {
                                                    backgroundColor: priorityTheme.bg,
                                                    borderColor: priorityTheme.border,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.badgePillText,
                                                    { color: priorityTheme.text },
                                                ]}
                                            >
                                                {ticket.priority.toUpperCase()}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text numberOfLines={2} style={styles.ticketSubject}>
                                    {ticket?.subject || 'Support Ticket Details'}
                                </Text>
                            </View>

                            <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </Pressable>
                        </View>

                        {/* Content Area */}
                        {isLoading ? (
                            <View style={styles.centerLoading}>
                                <ActivityIndicator color={colors.primaryGreen} size="large" />
                                <Text style={styles.loadingText}>Loading ticket details...</Text>
                            </View>
                        ) : (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.scrollContent}
                            >
                                {/* Revoked Banner */}
                                {isRevoked && (
                                    <View style={styles.revokedBanner}>
                                        <Text style={styles.revokedBannerIcon}>⚠️</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.revokedBannerTitle}>Ticket Revoked</Text>
                                            <Text style={styles.revokedBannerDesc}>
                                                This ticket was revoked by you. You can review the complete
                                                timeline below or send a follow-up reply if needed.
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* New Update Alert Banner */}
                                {ticket?.unread && (
                                    <View style={styles.newUpdateAlertBanner}>
                                        <View style={styles.newUpdateIconCircle}>
                                            <Text style={{ fontSize: 16 }}>🔔</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.newUpdateAlertTitle}>New Update on This Ticket</Text>
                                            <Text style={styles.newUpdateAlertDesc}>
                                                Support staff has replied with an update. Review their latest response in the conversation below.
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Ticket Details Card */}
                                <View style={styles.detailsCard}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Where did it happen?</Text>
                                        <Text style={styles.detailVal}>
                                            {ticket?.pageContext || 'General / Whole Portal'}
                                        </Text>
                                    </View>
                                    <View style={styles.detailDivider} />
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Submitted</Text>
                                        <Text style={styles.detailVal}>{formatDate(ticket?.createdAt)}</Text>
                                    </View>
                                    <View style={styles.detailDivider} />
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Last Updated</Text>
                                        <Text style={styles.detailVal}>{formatDate(ticket?.updatedAt)}</Text>
                                    </View>
                                    {ticket?.resolvedAt ? (
                                        <>
                                            <View style={styles.detailDivider} />
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Resolved At</Text>
                                                <Text style={styles.detailVal}>
                                                    {formatDate(ticket.resolvedAt)}
                                                </Text>
                                            </View>
                                        </>
                                    ) : null}
                                    {ticket?.closedAt ? (
                                        <>
                                            <View style={styles.detailDivider} />
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Closed At</Text>
                                                <Text style={styles.detailVal}>
                                                    {formatDate(ticket.closedAt)}
                                                </Text>
                                            </View>
                                        </>
                                    ) : null}

                                    {/* Revoke Action */}
                                    {ticket?.canRevoke && !isRevoked && (
                                        <View style={styles.revokeSection}>
                                            <Pressable
                                                onPress={() => setShowRevokeModal(true)}
                                                style={styles.revokeBtn}
                                            >
                                                <Text style={styles.revokeBtnText}>Revoke Ticket</Text>
                                            </Pressable>
                                            <Text style={styles.revokeHint}>
                                                You can revoke this resolved or closed ticket within 24 hours.
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Ticket Messages & Timeline */}
                                <Text style={styles.sectionHeader}>Issue Description & Conversation</Text>

                                {(!ticket?.messages?.length) && (
                                    <View style={styles.emptyCard}>
                                        <Text style={styles.emptyCardText}>
                                            {ticket?.description || 'No message content available.'}
                                        </Text>
                                    </View>
                                )}

                                {(ticket?.messages || []).map((msg, index) => {
                                    const isStaff = msg.fromAdmin;
                                    const isRevokeMsg = msg.kind === 'revoke';

                                    return (
                                        <View
                                            key={msg.id || `msg-${index}`}
                                            style={[
                                                styles.msgCard,
                                                isRevokeMsg
                                                    ? styles.msgCardRevoke
                                                    : isStaff
                                                    ? styles.msgCardStaff
                                                    : styles.msgCardPatient,
                                            ]}
                                        >
                                            <View style={styles.msgHeader}>
                                                <View style={styles.msgAuthorRow}>
                                                    <Text numberOfLines={1} style={styles.msgAuthor}>
                                                        {isRevokeMsg
                                                            ? '⚠️ Revocation Notice'
                                                            : isStaff
                                                            ? `👨‍⚕️ Support Staff (${msg.authorName || 'Clinical Admin'})`
                                                            : '👤 You (Patient)'}
                                                    </Text>
                                                    {isStaff && ticket?.messages && index === (ticket.messages.length - 1) && (
                                                        <View style={styles.newStaffReplyBadge}>
                                                            <Text style={styles.newStaffReplyBadgeText}>New</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.msgDate}>
                                                    {formatDate(msg.createdAt)}
                                                </Text>
                                            </View>

                                            <Text selectable style={styles.msgBody}>
                                                {msg.body}
                                            </Text>

                                            {/* Attachments Section */}
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <View style={styles.attachmentsBlock}>
                                                    <Text style={styles.attachmentsTitle}>
                                                        Attachments ({msg.attachments.length})
                                                    </Text>
                                                    <View style={styles.attachmentList}>
                                                        {msg.attachments.map((att) => {
                                                            const isImg = isImageAttachment(att);
                                                            const isDownloading = isDownloadingId === att.id;

                                                            return (
                                                                <View
                                                                    key={att.id}
                                                                    style={styles.attachmentItem}
                                                                >
                                                                    {isImg ? (
                                                                        <Pressable
                                                                            onPress={() =>
                                                                                handleOpenAttachment(att)
                                                                            }
                                                                            style={styles.thumbContainer}
                                                                        >
                                                                            <ExpoImage
                                                                                source={{
                                                                                    uri: getAttachmentUrl(
                                                                                        att.id
                                                                                    ),
                                                                                    headers:
                                                                                        getSupportHeaders(),
                                                                                }}
                                                                                style={styles.thumbImage}
                                                                                contentFit="cover"
                                                                            />
                                                                            <View style={styles.thumbZoomIcon}>
                                                                                <Text
                                                                                    style={
                                                                                        styles.thumbZoomIconText
                                                                                    }
                                                                                >
                                                                                    🔍
                                                                                </Text>
                                                                            </View>
                                                                        </Pressable>
                                                                    ) : (
                                                                        <View style={styles.fileIconBox}>
                                                                            <Text style={styles.fileIconText}>
                                                                                📄
                                                                            </Text>
                                                                        </View>
                                                                    )}

                                                                    <View style={styles.attachmentMeta}>
                                                                        <Text
                                                                            numberOfLines={1}
                                                                            style={styles.attachmentFileName}
                                                                        >
                                                                            {att.fileName}
                                                                        </Text>
                                                                        <Text style={styles.attachmentFileSize}>
                                                                            {formatBytes(att.size)}
                                                                        </Text>
                                                                    </View>

                                                                    <Pressable
                                                                        onPress={() =>
                                                                            handleOpenAttachment(att)
                                                                        }
                                                                        disabled={isDownloading}
                                                                        style={styles.actionBtn}
                                                                    >
                                                                        {isDownloading ? (
                                                                            <ActivityIndicator
                                                                                size="small"
                                                                                color={colors.primaryGreen}
                                                                            />
                                                                        ) : (
                                                                            <Text style={styles.actionBtnText}>
                                                                                {isImg ? 'View' : 'Open'}
                                                                            </Text>
                                                                        )}
                                                                    </Pressable>
                                                                </View>
                                                            );
                                                        })}
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}

                                <View style={{ height: 30 }} />
                            </ScrollView>
                        )}

                        {/* Reply Composer: ONLY visible when ticket is revoked by user */}
                        {isRevoked && (
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                            >
                                <View
                                    style={[
                                        styles.replyBox,
                                        Platform.OS === 'android' && keyboardHeight > 0 && {
                                            paddingBottom: keyboardHeight + 10,
                                        },
                                    ]}
                                >
                                    <Text style={styles.replyBoxTitle}>Send Follow-up Message</Text>

                                    {stagedFiles.length > 0 && (
                                        <View style={styles.stagedList}>
                                            {stagedFiles.map((file, idx) => (
                                                <View
                                                    key={`${file.name}-${idx}`}
                                                    style={styles.stagedPill}
                                                >
                                                    <Text
                                                        numberOfLines={1}
                                                        style={styles.stagedPillText}
                                                    >
                                                        📎 {file.name}
                                                    </Text>
                                                    <Pressable
                                                        onPress={() =>
                                                            setStagedFiles((prev) =>
                                                                prev.filter((_, i) => i !== idx)
                                                            )
                                                        }
                                                    >
                                                        <Text style={styles.stagedPillClose}>✕</Text>
                                                    </Pressable>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <View style={styles.composerRow}>
                                        <Pressable
                                            disabled={isSendingReply}
                                            onPress={handlePickReplyAttachment}
                                            style={styles.clipBtn}
                                        >
                                            <Text style={styles.clipBtnIcon}>📎</Text>
                                        </Pressable>

                                        <TextInput
                                            placeholder="Write a follow-up reply..."
                                            placeholderTextColor={colors.textTertiary}
                                            value={replyText}
                                            onChangeText={setReplyText}
                                            multiline
                                            style={styles.replyInput}
                                        />

                                        <Pressable
                                            disabled={
                                                isSendingReply ||
                                                (!replyText.trim() && stagedFiles.length === 0)
                                            }
                                            onPress={handleSendRevokedReply}
                                            style={[
                                                styles.sendBtn,
                                                (!replyText.trim() && stagedFiles.length === 0) &&
                                                    styles.sendBtnDisabled,
                                            ]}
                                        >
                                            {isSendingReply ? (
                                                <ActivityIndicator
                                                    color={colors.white}
                                                    size="small"
                                                />
                                            ) : (
                                                <Text style={styles.sendBtnText}>Send</Text>
                                            )}
                                        </Pressable>
                                    </View>
                                </View>
                            </KeyboardAvoidingView>
                        )}
                    </View>
                </View>

                {/* Revoke Prompt Dialog Overlay (Non-nested to guarantee display on Android & iOS) */}
                {showRevokeModal && (
                    <View style={styles.dialogBackdrop}>
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={() => {
                                Keyboard.dismiss();
                                setShowRevokeModal(false);
                            }}
                        />

                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                            style={[
                                styles.dialogKavContainer,
                                keyboardHeight > 0 && {
                                    justifyContent: 'flex-start',
                                    paddingTop: Math.max(
                                        Platform.OS === 'ios' ? 50 : 30,
                                        (Dimensions.get('window').height - keyboardHeight - 340) / 2
                                    ),
                                },
                            ]}
                            pointerEvents="box-none"
                        >
                            <ScrollView
                                bounces={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={[
                                    styles.dialogScrollContent,
                                    keyboardHeight > 0 && {
                                        paddingBottom: keyboardHeight + 20,
                                    },
                                ]}
                                showsVerticalScrollIndicator={false}
                                style={styles.dialogScrollView}
                            >
                                <Pressable
                                    onPress={(e) => e.stopPropagation()}
                                    style={styles.dialogBox}
                                >
                                    <View style={styles.dialogHeaderRow}>
                                        <Text style={styles.dialogTitle}>Revoke Support Ticket</Text>
                                        <Pressable
                                            hitSlop={10}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowRevokeModal(false);
                                                setRevokeReason('');
                                            }}
                                            style={styles.dialogCloseIconBtn}
                                        >
                                            <Text style={styles.dialogCloseIconText}>✕</Text>
                                        </Pressable>
                                    </View>

                                    <Text style={styles.dialogDesc}>
                                        Please state the reason for revoking this ticket. This will mark the
                                        ticket as revoked.
                                    </Text>

                                    <Text style={styles.dialogInputLabel}>Reason for Revocation *</Text>
                                    <TextInput
                                        placeholder="e.g., Issue resolved on my own, entered by mistake..."
                                        placeholderTextColor={colors.textTertiary}
                                        value={revokeReason}
                                        onChangeText={setRevokeReason}
                                        multiline
                                        numberOfLines={3}
                                        autoFocus
                                        style={styles.dialogInput}
                                    />

                                    <View style={styles.dialogBtnRow}>
                                        <Pressable
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowRevokeModal(false);
                                                setRevokeReason('');
                                            }}
                                            style={styles.dialogCancelBtn}
                                        >
                                            <Text style={styles.dialogCancelBtnText}>Cancel</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={handleConfirmRevoke}
                                            disabled={revokeMutation.isPending}
                                            style={styles.dialogConfirmBtn}
                                        >
                                            {revokeMutation.isPending ? (
                                                <ActivityIndicator color={colors.white} size="small" />
                                            ) : (
                                                <Text style={styles.dialogConfirmBtnText}>Confirm Revoke</Text>
                                            )}
                                        </Pressable>
                                    </View>
                                </Pressable>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                )}

            </View>

            {/* Full-Screen Image Preview Overlay */}
            {Boolean(previewImage) && (
                <View style={styles.imageViewerBackdrop}>
                    <View style={styles.imageViewerHeader}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text numberOfLines={1} style={styles.imageViewerTitle}>
                                {previewImage?.fileName}
                            </Text>
                            {previewImage?.size ? (
                                <Text style={styles.imageViewerSubtitle}>
                                    {formatBytes(previewImage.size)}
                                </Text>
                            ) : null}
                        </View>
                        <Pressable
                            hitSlop={12}
                            onPress={() => setPreviewImage(null)}
                            style={styles.imageViewerCloseBtn}
                        >
                            <Text style={styles.imageViewerCloseBtnText}>✕</Text>
                        </Pressable>
                    </View>

                    <Pressable
                        onPress={() => setPreviewImage(null)}
                        style={styles.imageViewerBody}
                    >
                        {isImageLoading && (
                            <ActivityIndicator
                                color={colors.white}
                                size="large"
                                style={StyleSheet.absoluteFill}
                            />
                        )}
                        {previewImage && (
                            <ExpoImage
                                source={{
                                    uri: previewImage.uri,
                                    headers: previewImage.headers,
                                }}
                                style={styles.imageViewerImage}
                                contentFit="contain"
                                transition={200}
                                onLoad={() => setIsImageLoading(false)}
                                onError={() => setIsImageLoading(false)}
                            />
                        )}
                    </Pressable>
                </View>
            )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalRoot: {
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    backdrop: {
        backgroundColor: 'rgba(15, 30, 18, 0.65)',
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        width: '100%',
        height: '92%',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        flex: 1,
        overflow: 'hidden',
    },
    header: {
        alignItems: 'flex-start',
        borderBottomColor: colors.borderLight,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        backgroundColor: colors.white,
    },
    headerLeft: {
        flex: 1,
        paddingRight: 12,
    },
    refRow: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 6,
    },
    referenceText: {
        color: colors.textSecondary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12.5,
        fontWeight: '700',
    },
    badgePill: {
        borderRadius: 4,
        borderWidth: 1,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    badgePillText: {
        fontSize: 10.5,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    ticketSubject: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: '800',
        lineHeight: 22,
    },
    closeBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceNeutral,
        borderRadius: radii.full,
        width: 32,
        height: 32,
    },
    closeBtnText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
        includeFontPadding: false,
        textAlign: 'center',
        textAlignVertical: 'center',
        transform: [{ translateY: Platform.OS === 'android' ? -1 : 0 }],
    },
    centerLoading: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
    },
    revokedBanner: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        borderRadius: radii.md,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        padding: 14,
    },
    revokedBannerIcon: {
        fontSize: 20,
    },
    revokedBannerTitle: {
        color: '#dc2626',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
    },
    revokedBannerDesc: {
        color: '#7f1d1d',
        fontSize: 12.5,
        lineHeight: 17,
    },
    newUpdateAlertBanner: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        borderRadius: radii.md,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        padding: 14,
    },
    newUpdateIconCircle: {
        alignItems: 'center',
        backgroundColor: '#d1fae5',
        borderRadius: 20,
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    newUpdateAlertTitle: {
        color: '#065f46',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
    },
    newUpdateAlertDesc: {
        color: '#047857',
        fontSize: 12.5,
        lineHeight: 17,
    },
    newStaffReplyBadge: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        borderRadius: 4,
        borderWidth: 1,
        marginLeft: 6,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    newStaffReplyBadgeText: {
        color: '#059669',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    detailsCard: {
        backgroundColor: colors.surfaceNeutral,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        marginBottom: 20,
        padding: 14,
    },
    detailRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    detailLabel: {
        color: colors.textSecondary,
        fontSize: 12.5,
        fontWeight: '600',
    },
    detailVal: {
        color: colors.textPrimary,
        fontSize: 12.5,
        fontWeight: '700',
    },
    detailDivider: {
        backgroundColor: colors.borderLight,
        height: 1,
        marginVertical: 4,
        opacity: 0.7,
    },
    revokeSection: {
        borderTopColor: colors.borderLight,
        borderTopWidth: 1,
        marginTop: 10,
        paddingTop: 10,
    },
    revokeBtn: {
        alignSelf: 'flex-start',
        backgroundColor: '#fee2e2',
        borderColor: '#fca5a5',
        borderRadius: radii.sm,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    revokeBtnText: {
        color: '#b91c1c',
        fontSize: 12,
        fontWeight: '700',
    },
    revokeHint: {
        color: colors.textTertiary,
        fontSize: 11,
        marginTop: 4,
    },
    sectionHeader: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 12,
    },
    emptyCard: {
        backgroundColor: colors.surfaceNeutral,
        borderRadius: radii.md,
        padding: 14,
    },
    emptyCardText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
    },
    msgCard: {
        borderRadius: radii.md,
        borderWidth: 1,
        marginBottom: 14,
        padding: 14,
    },
    msgCardPatient: {
        backgroundColor: '#ffffff',
        borderColor: colors.borderLight,
    },
    msgCardStaff: {
        backgroundColor: '#f8fafc',
        borderColor: '#cbd5e1',
    },
    msgCardRevoke: {
        backgroundColor: '#fff1f2',
        borderColor: '#fecdd3',
    },
    msgHeader: {
        marginBottom: 8,
        gap: 3,
    },
    msgAuthorRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    msgAuthor: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    msgDate: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '500',
    },
    msgBody: {
        color: colors.textPrimary,
        fontSize: 13.5,
        lineHeight: 20,
    },
    attachmentsBlock: {
        borderTopColor: colors.borderLight,
        borderTopWidth: 1,
        marginTop: 12,
        paddingTop: 10,
    },
    attachmentsTitle: {
        color: colors.textSecondary,
        fontSize: 11.5,
        fontWeight: '700',
        marginBottom: 8,
    },
    attachmentList: {
        gap: 8,
    },
    attachmentItem: {
        alignItems: 'center',
        backgroundColor: colors.surfaceNeutral,
        borderColor: colors.borderLight,
        borderRadius: radii.sm,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 10,
        padding: 8,
    },
    thumbContainer: {
        borderRadius: radii.sm,
        height: 48,
        overflow: 'hidden',
        position: 'relative',
        width: 48,
    },
    thumbImage: {
        height: '100%',
        width: '100%',
    },
    thumbZoomIcon: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        bottom: 2,
        paddingHorizontal: 2,
        position: 'absolute',
        right: 2,
        borderRadius: 2,
    },
    thumbZoomIconText: {
        fontSize: 9,
    },
    fileIconBox: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.borderLight,
        borderRadius: radii.sm,
        borderWidth: 1,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    fileIconText: {
        fontSize: 20,
    },
    attachmentMeta: {
        flex: 1,
    },
    attachmentFileName: {
        color: colors.textPrimary,
        fontSize: 12.5,
        fontWeight: '700',
    },
    attachmentFileSize: {
        color: colors.textTertiary,
        fontSize: 11,
        marginTop: 2,
    },
    actionBtn: {
        backgroundColor: colors.white,
        borderColor: colors.borderLight,
        borderRadius: radii.sm,
        borderWidth: 1,
        minWidth: 54,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        color: colors.primaryGreen,
        fontSize: 12,
        fontWeight: '700',
    },
    replyBox: {
        backgroundColor: colors.white,
        borderTopColor: colors.borderLight,
        borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 28 : 14,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    replyBoxTitle: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
    },
    stagedList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    stagedPill: {
        alignItems: 'center',
        backgroundColor: colors.surfaceNeutral,
        borderRadius: 4,
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    stagedPillText: {
        color: colors.textPrimary,
        fontSize: 11,
        maxWidth: 160,
    },
    stagedPillClose: {
        color: colors.destructive,
        fontSize: 11,
        fontWeight: '800',
    },
    composerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    clipBtn: {
        backgroundColor: colors.surfaceNeutral,
        borderRadius: radii.md,
        padding: 10,
    },
    clipBtnIcon: {
        fontSize: 16,
    },
    replyInput: {
        backgroundColor: colors.surfaceNeutral,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        color: colors.textPrimary,
        flex: 1,
        fontSize: 13.5,
        maxHeight: 80,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    sendBtn: {
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.md,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
    sendBtnText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    dialogBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 9999,
        elevation: 25,
    },
    dialogKavContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialogScrollView: {
        width: '100%',
        flex: 1,
    },
    dialogScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        width: '100%',
    },
    dialogBox: {
        backgroundColor: colors.white,
        borderRadius: radii.lg,
        padding: 20,
        width: '100%',
        maxWidth: 420,
        ...shadows.tier2,
        zIndex: 10000,
        elevation: 30,
    },
    dialogHeaderRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    dialogCloseIconBtn: {
        padding: 4,
    },
    dialogCloseIconText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '700',
    },
    dialogTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
    },
    dialogDesc: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 14,
    },
    dialogInputLabel: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
    },
    dialogInput: {
        backgroundColor: colors.surfaceNeutral,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        color: colors.textPrimary,
        fontSize: 13.5,
        minHeight: 75,
        textAlignVertical: 'top',
        marginBottom: 18,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    dialogBtnRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'flex-end',
    },
    dialogCancelBtn: {
        borderRadius: radii.md,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    dialogCancelBtnText: {
        color: colors.textSecondary,
        fontSize: 13.5,
        fontWeight: '700',
    },
    dialogConfirmBtn: {
        backgroundColor: colors.destructive,
        borderRadius: radii.md,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    dialogConfirmBtnText: {
        color: colors.white,
        fontSize: 13.5,
        fontWeight: '700',
    },
    imageViewerBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(5, 10, 6, 0.98)',
        zIndex: 999999,
        elevation: 99999,
        flexDirection: 'column',
    },
    imageViewerHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 56 : 42,
        paddingBottom: 14,
        backgroundColor: 'rgba(0,0,0,0.85)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        zIndex: 10,
    },
    imageViewerTitle: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    imageViewerSubtitle: {
        color: colors.gray400,
        fontSize: 11.5,
        marginTop: 2,
    },
    imageViewerCloseBtn: {
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: 20,
        height: 36,
        width: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageViewerCloseBtnText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    imageViewerBody: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        padding: 16,
        width: '100%',
    },
    imageViewerImage: {
        height: '100%',
        width: '100%',
    },
});
