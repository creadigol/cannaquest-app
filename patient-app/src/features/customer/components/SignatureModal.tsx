import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Keyboard,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';

type Props = {
    visible: boolean;
    onClose: () => void;
    onSave: (signatureData: string) => Promise<void>;
};

type Point = { x: number; y: number };

export function SignatureModal({ visible, onClose, onSave }: Props) {
    const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
    const [typedName, setTypedName] = useState('');
    const [paths, setPaths] = useState<Point[][]>([]);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
    const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const scrollViewRef = useRef<ScrollView>(null);
    const canvasRef = useRef<View>(null);
    const currentStrokeRef = useRef<Point[]>([]);

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
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

    const panResponder = React.useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onStartShouldSetPanResponderCapture: () => false,
                onMoveShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponderCapture: () => false,
                onPanResponderGrant: (evt) => {
                    const { locationX, locationY } = evt.nativeEvent;
                    currentStrokeRef.current = [{ x: locationX, y: locationY }];
                    setCurrentPath([{ x: locationX, y: locationY }]);
                },
                onPanResponderMove: (evt) => {
                    const { locationX, locationY } = evt.nativeEvent;
                    currentStrokeRef.current = [...currentStrokeRef.current, { x: locationX, y: locationY }];
                    setCurrentPath([...currentStrokeRef.current]);
                },
                onPanResponderRelease: () => {
                    if (currentStrokeRef.current.length > 0) {
                        const finishedStroke = [...currentStrokeRef.current];
                        setPaths((prev) => [...prev, finishedStroke]);
                    }
                    currentStrokeRef.current = [];
                    setCurrentPath([]);
                },
                onPanResponderTerminate: () => {
                    if (currentStrokeRef.current.length > 0) {
                        const finishedStroke = [...currentStrokeRef.current];
                        setPaths((prev) => [...prev, finishedStroke]);
                    }
                    currentStrokeRef.current = [];
                    setCurrentPath([]);
                },
            }),
        []
    );

    const handleClear = () => {
        setPaths([]);
        setCurrentPath([]);
        currentStrokeRef.current = [];
    };

    const handlePickImage = async () => {
        try {
            setError(null);

            let pickedAsset: { uri: string; base64?: string | null; mimeType?: string } | null = null;

            // Use DocumentPicker directly (safe and does not throw ExponentImagePicker missing module crash)
            const DocumentPicker = await import('expo-document-picker');
            const docRes = await DocumentPicker.getDocumentAsync({
                type: ['image/png', 'image/jpeg', 'image/jpg', 'image/*'],
                copyToCacheDirectory: true,
            });
            if (!docRes.canceled && docRes.assets && docRes.assets.length > 0) {
                pickedAsset = docRes.assets[0];
            }

            if (pickedAsset) {
                setUploadedImageUri(pickedAsset.uri);
                if (pickedAsset.base64) {
                    const mime = pickedAsset.mimeType || 'image/png';
                    setUploadedBase64(`data:${mime};base64,${pickedAsset.base64}`);
                } else {
                    // Convert URI to base64 via FileSystem if base64 not provided directly
                    try {
                        const FileSystem = await import('expo-file-system');
                        const base64Data = await FileSystem.readAsStringAsync(pickedAsset.uri, {
                            encoding: 'base64',
                        });
                        const mime = pickedAsset.mimeType || 'image/png';
                        setUploadedBase64(`data:${mime};base64,${base64Data}`);
                    } catch {
                        setUploadedBase64(pickedAsset.uri);
                    }
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg || 'Failed to select signature image. Please use Draw or Type tab.');
        }
    };

    const handleSaveDrawn = async () => {
        if (paths.length === 0 && currentPath.length === 0) {
            setError('Please draw your signature first.');
            return;
        }

        try {
            setError(null);
            setIsSaving(true);

            const allPaths = [...paths, ...(currentPath.length > 0 ? [currentPath] : [])];
            const svgPaths = allPaths
                .map((pts) => {
                    if (pts.length === 0) return '';
                    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                    return `<path d="${d}" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
                })
                .join('');

            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160" width="320" height="160">${svgPaths}</svg>`;
            const signatureData = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

            await onSave(signatureData);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save drawn signature.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTyped = async () => {
        if (!typedName.trim()) {
            setError('Please type your name first.');
            return;
        }

        try {
            setError(null);
            setIsSaving(true);
            const signatureData = `data:text/plain;charset=utf-8,${encodeURIComponent(typedName.trim())}`;
            await onSave(signatureData);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save typed signature.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveUploaded = async () => {
        if (!uploadedBase64) {
            setError('Please select an image of your signature first.');
            return;
        }

        try {
            setError(null);
            setIsSaving(true);

            let signatureResult = uploadedBase64;
            try {
                const { uploadFileToS3 } = await import('../api/s3ComplianceService');
                const s3Key = `signatures/signature_${Date.now()}.png`;
                const uploadRes = await uploadFileToS3(s3Key, uploadedBase64, 'image/png');
                if (uploadRes.success) {
                    signatureResult = uploadRes.url;
                }
            } catch (s3Err) {
                console.warn('Direct S3 signature upload fallback:', s3Err);
            }

            await onSave(signatureResult);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save uploaded signature.');
        } finally {
            setIsSaving(false);
        }
    };

    const allDrawnSegments = [...paths, ...(currentPath.length > 0 ? [currentPath] : [])];

    return (
        <Modal animationType="slide" transparent visible={visible}>
            <View style={styles.backdrop}>
                <View style={[styles.sheet, keyboardHeight > 0 ? { marginBottom: keyboardHeight } : null]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>My Signature</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </Pressable>
                    </View>

                    {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

                    {/* Tabs matching Private_Medi_Platform (Draw | Type | Upload) */}
                    <View style={styles.tabRow}>
                        <Pressable
                            onPress={() => setTab('draw')}
                            style={[styles.tabBtn, tab === 'draw' && styles.tabBtnActive]}
                        >
                            <Text style={[styles.tabText, tab === 'draw' && styles.tabTextActive]}>Draw</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setTab('type')}
                            style={[styles.tabBtn, tab === 'type' && styles.tabBtnActive]}
                        >
                            <Text style={[styles.tabText, tab === 'type' && styles.tabTextActive]}>Type</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setTab('upload')}
                            style={[styles.tabBtn, tab === 'upload' && styles.tabBtnActive]}
                        >
                            <Text style={[styles.tabText, tab === 'upload' && styles.tabTextActive]}>Upload</Text>
                        </Pressable>
                    </View>

                    <ScrollView
                        ref={scrollViewRef}
                        bounces={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        style={styles.scrollView}
                    >
                        {tab === 'draw' ? (
                            <View style={styles.contentWrap}>
                                <View style={styles.canvasHeader}>
                                    <Text style={styles.subtext}>Draw your signature below using your finger.</Text>
                                    <Pressable hitSlop={8} onPress={handleClear} style={styles.clearBtnRow}>
                                        <Text style={styles.clearBtnText}>Clear Canvas</Text>
                                    </Pressable>
                                </View>

                                <View
                                    ref={canvasRef}
                                    style={styles.canvasContainer}
                                    {...panResponder.panHandlers}
                                >
                                    {/* Render drawn stroke segments inside steady container */}
                                    {allDrawnSegments.map((pts, pIdx) =>
                                        pts.map((pt, idx) => {
                                            if (idx === 0) return null;
                                            const prevPt = pts[idx - 1];
                                            const dx = pt.x - prevPt.x;
                                            const dy = pt.y - prevPt.y;
                                            const distance = Math.hypot(dx, dy);
                                            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                                            return (
                                                <View
                                                    key={`line-${pIdx}-${idx}`}
                                                    pointerEvents="none"
                                                    style={{
                                                        position: 'absolute',
                                                        left: prevPt.x,
                                                        top: prevPt.y,
                                                        width: distance,
                                                        height: 2.5,
                                                        backgroundColor: '#153b24',
                                                        borderRadius: 1.25,
                                                        transform: [
                                                            { translateX: 0 },
                                                            { translateY: -1.25 },
                                                            { rotateZ: `${angle}deg` },
                                                        ],
                                                        transformOrigin: '0% 50%',
                                                    }}
                                                />
                                            );
                                        })
                                    )}

                                    {allDrawnSegments.length === 0 ? (
                                        <View pointerEvents="none" style={styles.placeholderBox}>
                                            <Text style={styles.placeholderText}>Sign here</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <Pressable
                                    disabled={isSaving}
                                    onPress={handleSaveDrawn}
                                    style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, isSaving && styles.btnDisabled]}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color={colors.primaryGreen} />
                                    ) : (
                                        <Text style={styles.saveBtnText}>Save Drawn Signature</Text>
                                    )}
                                </Pressable>
                            </View>
                        ) : tab === 'type' ? (
                            <View style={styles.contentWrap}>
                                <Text style={styles.subtext}>Type your full name — it will be saved as your digital signature.</Text>
                                <TextInput
                                    onChangeText={setTypedName}
                                    onFocus={() => {
                                        setTimeout(() => {
                                            scrollViewRef.current?.scrollToEnd({ animated: true });
                                        }, 150);
                                    }}
                                    placeholder="Your full name"
                                    placeholderTextColor={colors.gray400}
                                    style={styles.input}
                                    value={typedName}
                                />
                                <View style={styles.typedPreview}>
                                    <Text style={styles.typedText}>{typedName || 'Signature Preview'}</Text>
                                </View>

                                <Pressable
                                    disabled={isSaving}
                                    onPress={handleSaveTyped}
                                    style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, isSaving && styles.btnDisabled]}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color={colors.primaryGreen} />
                                    ) : (
                                        <Text style={styles.saveBtnText}>Save Typed Signature</Text>
                                    )}
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.contentWrap}>
                                <Text style={styles.subtext}>Upload an image of your handwritten signature (PNG or JPG).</Text>
                                <Pressable
                                    onPress={handlePickImage}
                                    style={({ pressed }) => [styles.uploadDropzone, pressed && styles.pressed]}
                                >
                                    <Text style={styles.uploadIcon}>📤</Text>
                                    <Text style={styles.uploadLabel}>Click to upload signature image</Text>
                                    <Text style={styles.uploadHint}>PNG, JPEG or JPG (max 5MB)</Text>
                                </Pressable>

                                {uploadedImageUri ? (
                                    <View style={styles.uploadPreview}>
                                        <Image
                                            resizeMode="contain"
                                            source={{ uri: uploadedImageUri }}
                                            style={styles.uploadPreviewImg}
                                        />
                                    </View>
                                ) : null}

                                <Pressable
                                    disabled={isSaving || !uploadedBase64}
                                    onPress={handleSaveUploaded}
                                    style={({ pressed }) => [
                                        styles.saveBtn,
                                        pressed && styles.pressed,
                                        (!uploadedBase64 || isSaving) && styles.btnDisabled,
                                    ]}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color={colors.primaryGreen} />
                                    ) : (
                                        <Text style={styles.saveBtnText}>Save Uploaded Signature</Text>
                                    )}
                                </Pressable>
                            </View>
                        )}
                    </ScrollView>
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
    keyboardWrap: {
        justifyContent: 'flex-end',
        width: '100%',
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
    scrollView: {
        maxHeight: 340,
    },
    scrollContent: {
        paddingBottom: 20,
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
    tabRow: {
        backgroundColor: colors.gray100,
        borderRadius: radii.md,
        flexDirection: 'row',
        marginBottom: 16,
        padding: 4,
    },
    tabBtn: {
        alignItems: 'center',
        borderRadius: radii.sm,
        flex: 1,
        paddingVertical: 8,
    },
    tabBtnActive: {
        backgroundColor: colors.white,
        ...shadows.tier1,
    },
    tabText: {
        color: colors.mutedForeground,
        fontSize: 13,
        fontWeight: '600',
    },
    tabTextActive: {
        color: colors.foreground,
        fontWeight: '700',
    },
    contentWrap: {
        gap: 12,
    },
    canvasHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    clearBtnRow: {
        backgroundColor: colors.gray100,
        borderColor: colors.gray200,
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    clearBtnText: {
        color: colors.foreground,
        fontSize: 12,
        fontWeight: '600',
    },
    subtext: {
        color: colors.mutedForeground,
        fontSize: 12,
        flex: 1,
        marginRight: 8,
    },
    canvasContainer: {
        backgroundColor: '#fafaf9',
        borderColor: colors.gray200,
        borderRadius: radii.md,
        borderStyle: 'dashed',
        borderWidth: 2,
        height: 160,
        overflow: 'hidden',
        position: 'relative',
    },
    placeholderBox: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        width: '100%',
    },
    placeholderText: {
        color: colors.gray400,
        fontSize: 14,
        fontWeight: '500',
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
    typedPreview: {
        alignItems: 'center',
        backgroundColor: '#fafaf9',
        borderColor: colors.gray200,
        borderRadius: radii.md,
        borderWidth: 1,
        height: 80,
        justifyContent: 'center',
    },
    typedText: {
        color: colors.foreground,
        fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'sans-serif-condensed',
        fontSize: 26,
        fontStyle: 'italic',
    },
    errorBanner: {
        backgroundColor: '#fee2e2',
        borderRadius: radii.sm,
        color: '#dc2626',
        fontSize: 12,
        marginBottom: 12,
        padding: 8,
    },
    saveBtn: {
        alignItems: 'center',
        backgroundColor: colors.brandLime,
        borderRadius: radii.full,
        marginTop: 6,
        paddingVertical: 14,
    },
    saveBtnText: {
        color: colors.primaryGreen,
        fontSize: 15,
        fontWeight: '700',
    },
    uploadDropzone: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.gray200,
        borderRadius: radii.lg,
        borderStyle: 'dashed',
        borderWidth: 2,
        gap: 6,
        justifyContent: 'center',
        paddingVertical: 28,
    },
    uploadIcon: {
        fontSize: 26,
    },
    uploadLabel: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    uploadHint: {
        color: colors.mutedForeground,
        fontSize: 11,
    },
    uploadPreview: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.gray200,
        borderRadius: radii.md,
        borderWidth: 1,
        height: 84,
        justifyContent: 'center',
        marginTop: 6,
        padding: 8,
    },
    uploadPreviewImg: {
        height: 68,
        width: '90%',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    pressed: {
        opacity: 0.85,
    },
});

