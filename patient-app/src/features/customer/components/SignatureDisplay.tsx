import React from 'react';
import { Image, ImageStyle, Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '@/lib/theme/tokens';
import { getS3PresignedUrl } from '../api/s3ComplianceService';

type Props = {
    signature: string | null | undefined;
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<ImageStyle>;
    fallbackText?: string;
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
 * 3. Uploaded (saved as PNG/JPEG base64 or remote URL)
 */
export function SignatureDisplay({ signature, style, imageStyle, fallbackText = 'No signature on file' }: Props) {
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

        return (
            <View style={[styles.container, style]}>
                <View
                    style={{
                        width: targetWidth,
                        height: targetHeight,
                        position: 'relative',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {strokePaths.map((pts, pIdx) =>
                        pts.map((pt, idx) => {
                            if (idx === 0) return null;
                            const prevPt = pts[idx - 1];
                            const x1 = (prevPt.x - offsetX) * scale;
                            const y1 = (prevPt.y - offsetY) * scale;
                            const x2 = (pt.x - offsetX) * scale;
                            const y2 = (pt.y - offsetY) * scale;
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
            </View>
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
            <View style={[styles.container, style]}>
                <Text style={styles.typedText}>{typedText}</Text>
            </View>
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

    // 3. Uploaded Signature (PNG, JPG Base64, S3 key, or Remote URL)
    let imageUri = signature;
    if (!signature.startsWith('data:image') && !signature.startsWith('http://') && !signature.startsWith('https://')) {
        // If it's an S3 file key or path (e.g. signatures/123.png)
        const cleanKey = signature.replace(/^\/+/, '');
        imageUri = getS3PresignedUrl(`https://cannaquest-storage.s3.ap-southeast-2.amazonaws.com/${cleanKey}`);
    } else if (signature.includes('cannaquest-storage.s3')) {
        imageUri = getS3PresignedUrl(signature);
    }

    return (
        <View style={[styles.container, style]}>
            <Image
                resizeMode="contain"
                source={{ uri: imageUri }}
                style={[styles.image, imageStyle]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 70,
        width: '100%',
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
    fallbackText: {
        color: colors.mutedForeground,
        fontSize: 13,
        fontStyle: 'italic',
    },
});
