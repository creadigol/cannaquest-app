import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ImageStyle,
    Linking,
    Modal,
    Platform,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import { colors, radii } from '@/lib/theme/tokens';
import { AWS_CONFIG, getS3PresignedUrl, S3_BASE_URL } from '../api/s3ComplianceService';

type Props = {
    signature: string | null | undefined;
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<ImageStyle>;
    fallbackText?: string;
    allowEnlarge?: boolean;
};

type Point = { x: number; y: number };

function parseSvgPaths(svgString: string): Point[][] {
    const paths: Point[][] = [];
    const pathRegex = /<path[^>]*d="([^"]+)"/g;
    let match: RegExpExecArray | null;

    while ((match = pathRegex.exec(svgString)) !== null) {
        const d = match[1];
        const commands = d.trim().split(/(?=[ML])/);
        const currentPath: Point[] = [];

        for (const cmd of commands) {
            const parts = cmd.trim().split(/\s+/);
            if (parts.length >= 3) {
                const x = parseFloat(parts[1]);
                const y = parseFloat(parts[2]);
                if (!isNaN(x) && !isNaN(y)) {
                    currentPath.push({ x, y });
                }
            }
        }
        if (currentPath.length > 0) {
            paths.push(currentPath);
        }
    }

    return paths;
}

/**
 * Universal component to render patient signatures regardless of whether they were:
 * 1. Drawn (saved as SVG data URI)
 * 2. Typed (saved as text or data:text/plain URI)
 * 3. Uploaded (saved as PNG/JPEG base64 or remote S3 URL)
 * With built-in tap-to-enlarge modal preview support!
 */
export function SignatureDisplay({
    signature,
    style,
    imageStyle,
    fallbackText = 'No signature on file',
    allowEnlarge = true,
}: Props) {
    const [isEnlarged, setIsEnlarged] = useState(false);
    const [imgLoading, setImgLoading] = useState(false);

    if (!signature) {
        return (
            <View style={[styles.container, style]}>
                <Text style={styles.fallbackText}>{fallbackText}</Text>
            </View>
        );
    }

    // 1. Drawn SVG Signature (data:image/svg+xml)
    if (signature.startsWith('data:image/svg+xml')) {
        let svgContent = '';
        try {
            const commaIdx = signature.indexOf(',');
            const raw = commaIdx !== -1 ? signature.slice(commaIdx + 1) : '';
            svgContent = decodeURIComponent(raw);
        } catch {
            svgContent = '';
        }

        const strokePaths = parseSvgPaths(svgContent);

        // Find bounding box to scale and center properly inside container
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        strokePaths.forEach((pts) => {
            pts.forEach((pt) => {
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            });
        });

        const drawnWidth = maxX > minX ? maxX - minX : 320;
        const drawnHeight = maxY > minY ? maxY - minY : 160;
        const targetWidth = 260;
        const targetHeight = 80;
        const scale = Math.min(targetWidth / (drawnWidth || 1), targetHeight / (drawnHeight || 1), 1);
        const offsetX = minX !== Infinity ? minX : 0;
        const offsetY = minY !== Infinity ? minY : 0;

        const renderSvgContent = (w: number, h: number, s: number) => (
            <View
                style={{
                    width: w,
                    height: h,
                    position: 'relative',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {strokePaths.map((pts, pIdx) =>
                    pts.map((pt, idx) => {
                        if (idx === 0) return null;
                        const prevPt = pts[idx - 1];
                        const x1 = (prevPt.x - offsetX) * s;
                        const y1 = (prevPt.y - offsetY) * s;
                        const x2 = (pt.x - offsetX) * s;
                        const y2 = (pt.y - offsetY) * s;
                        const dx = x2 - x1;
                        const dy = y2 - y1;
                        const dist = Math.hypot(dx, dy);
                        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                        return (
                            <View
                                key={`sig-seg-${pIdx}-${idx}`}
                                pointerEvents="none"
                                style={{
                                    position: 'absolute',
                                    left: x1,
                                    top: y1,
                                    width: Math.max(dist, 1),
                                    height: 2.2,
                                    backgroundColor: '#153b24',
                                    borderRadius: 1.1,
                                    transform: [
                                        { translateY: -1.1 },
                                        { rotateZ: `${angle}deg` },
                                    ],
                                    transformOrigin: '0% 50%',
                                }}
                            />
                        );
                    })
                )}
            </View>
        );

        return (
            <>
                <Pressable
                    disabled={!allowEnlarge}
                    onPress={() => setIsEnlarged(true)}
                    style={[styles.container, style]}
                >
                    {renderSvgContent(targetWidth, targetHeight, scale)}
                    {allowEnlarge && (
                        <View style={styles.magnifyPill}>
                            <Text style={styles.magnifyPillText}>🔍 Tap to view</Text>
                        </View>
                    )}
                </Pressable>

                {isEnlarged && (
                    <Modal animationType="fade" onRequestClose={() => setIsEnlarged(false)} transparent visible>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalCard}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Signature Preview</Text>
                                    <Pressable onPress={() => setIsEnlarged(false)} style={styles.modalCloseBtn}>
                                        <Text style={styles.modalCloseText}>✕</Text>
                                    </Pressable>
                                </View>
                                <View style={styles.modalPreviewBody}>
                                    {renderSvgContent(320, 160, 1)}
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </>
        );
    }

    // 2. Typed Signature (data:text/plain or plain string)
    if (signature.startsWith('data:text/plain')) {
        let typedText = '';
        try {
            const commaIdx = signature.indexOf(',');
            typedText = decodeURIComponent(signature.slice(commaIdx + 1));
        } catch {
            typedText = signature;
        }

        return (
            <>
                <Pressable
                    disabled={!allowEnlarge}
                    onPress={() => setIsEnlarged(true)}
                    style={[styles.container, style]}
                >
                    <Text style={styles.typedText}>{typedText}</Text>
                    {allowEnlarge && (
                        <View style={styles.magnifyPill}>
                            <Text style={styles.magnifyPillText}>🔍 Tap to view</Text>
                        </View>
                    )}
                </Pressable>

                {isEnlarged && (
                    <Modal animationType="fade" onRequestClose={() => setIsEnlarged(false)} transparent visible>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalCard}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Signature Preview</Text>
                                    <Pressable onPress={() => setIsEnlarged(false)} style={styles.modalCloseBtn}>
                                        <Text style={styles.modalCloseText}>✕</Text>
                                    </Pressable>
                                </View>
                                <View style={styles.modalPreviewBody}>
                                    <Text style={[styles.typedText, { fontSize: 36 }]}>{typedText}</Text>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </>
        );
    }

    // If it's another non-image plain string (e.g. plain text name saved directly)
    if (!signature.startsWith('data:image') && !signature.startsWith('http')) {
        return (
            <View style={[styles.container, style]}>
                <Text style={styles.typedText}>{signature}</Text>
            </View>
        );
    }

    // Memoize the presigned URL calculation so it doesn't regenerate a new timestamp and force reload on every re-render
    const displayUri = React.useMemo(() => {
        if (!signature) return '';
        if (signature.startsWith('file://')) return signature;
        if (!signature.startsWith('data:') && !signature.startsWith('http://') && !signature.startsWith('https://')) {
            const cleanKey = signature.replace(/^\/+/, '');
            return getS3PresignedUrl(`${S3_BASE_URL}/${cleanKey}`);
        }
        if (signature.includes('cannaquest-storage.s3') || signature.includes(AWS_CONFIG.host)) {
            return getS3PresignedUrl(signature);
        }
        return signature;
    }, [signature]);

    // PDF signatures: open in the device viewer
    const isPdf = signature.startsWith('data:application/pdf') || /\.pdf(\?|$)/i.test(displayUri);
    if (isPdf) {
        return (
            <View style={[styles.container, style]}>
                <Text
                    style={styles.pdfLink}
                    onPress={() => {
                        Linking.openURL(displayUri).catch(() => undefined);
                    }}
                >
                    View PDF signature
                </Text>
            </View>
        );
    }

    return (
        <>
            <Pressable
                disabled={!allowEnlarge}
                onPress={() => setIsEnlarged(true)}
                style={[styles.container, style]}
            >
                <Image
                    onError={(e) => {
                        console.warn('[SignatureDisplay] Image load failed for URI:', displayUri, e.nativeEvent?.error);
                        setImgLoading(false);
                    }}
                    onLoadEnd={() => setImgLoading(false)}
                    onLoadStart={() => setImgLoading(true)}
                    resizeMode="contain"
                    source={{ uri: displayUri }}
                    style={[styles.image, imageStyle]}
                />
                {imgLoading && (
                    <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
                        <ActivityIndicator color={colors.primaryGreen} size="small" />
                    </View>
                )}
                {allowEnlarge && !imgLoading && (
                    <View style={styles.magnifyPill}>
                        <Text style={styles.magnifyPillText}>🔍 Tap to view</Text>
                    </View>
                )}
            </Pressable>

            {isEnlarged && (
                <Modal animationType="fade" onRequestClose={() => setIsEnlarged(false)} transparent visible>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCardLarge}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Signature Image</Text>
                                <Pressable onPress={() => setIsEnlarged(false)} style={styles.modalCloseBtn}>
                                    <Text style={styles.modalCloseText}>✕</Text>
                                </Pressable>
                            </View>
                            <View style={styles.modalImageContainer}>
                                <Image
                                    resizeMode="contain"
                                    source={{ uri: displayUri }}
                                    style={styles.enlargedImage}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 70,
        position: 'relative',
        width: '100%',
    },
    loadingOverlay: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        height: 70,
        width: '100%',
    },
    typedText: {
        color: colors.foreground,
        fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'sans-serif-condensed',
        fontSize: 26,
        fontStyle: 'italic',
        fontWeight: '600',
        paddingVertical: 6,
    },
    pdfLink: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '600',
        paddingVertical: 6,
        textDecorationLine: 'underline',
    },
    fallbackText: {
        color: colors.mutedForeground,
        fontSize: 13,
        fontStyle: 'italic',
    },
    magnifyPill: {
        backgroundColor: 'rgba(14, 48, 23, 0.08)',
        borderColor: 'rgba(14, 48, 23, 0.18)',
        borderRadius: radii.full,
        borderWidth: 1,
        marginTop: 6,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    magnifyPillText: {
        color: colors.primaryGreen,
        fontSize: 11,
        fontWeight: '600',
    },
    modalOverlay: {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: colors.white,
        borderRadius: radii.xl,
        maxWidth: 380,
        overflow: 'hidden',
        padding: 20,
        width: '100%',
    },
    modalCardLarge: {
        backgroundColor: colors.white,
        borderRadius: radii.xl,
        maxHeight: '80%',
        maxWidth: 440,
        overflow: 'hidden',
        padding: 20,
        width: '100%',
    },
    modalHeader: {
        alignItems: 'center',
        borderBottomColor: 'rgba(0, 0, 0, 0.08)',
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 12,
        width: '100%',
    },
    modalTitle: {
        color: colors.foreground,
        fontSize: 16,
        fontWeight: '700',
    },
    modalCloseBtn: {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.06)',
        borderRadius: radii.full,
        height: 32,
        justifyContent: 'center',
        width: 32,
    },
    modalCloseText: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    modalPreviewBody: {
        alignItems: 'center',
        backgroundColor: '#fafbfc',
        borderRadius: radii.lg,
        justifyContent: 'center',
        marginTop: 16,
        minHeight: 180,
        padding: 16,
    },
    modalImageContainer: {
        alignItems: 'center',
        backgroundColor: '#fafbfc',
        borderRadius: radii.lg,
        justifyContent: 'center',
        marginTop: 16,
        minHeight: 240,
        padding: 12,
        width: '100%',
    },
    enlargedImage: {
        height: 280,
        width: '100%',
    },
});
