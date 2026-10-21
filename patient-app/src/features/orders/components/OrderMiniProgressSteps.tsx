import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '@/lib/theme/tokens';
import type { OrderProgressStep } from '../api/orders.types';

interface Props {
    steps?: OrderProgressStep[];
}

export function OrderMiniProgressSteps({ steps }: Props) {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.25,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    if (!steps || steps.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Connecting progress track */}
            <View style={styles.trackBackground}>
                {steps.map((step, idx) => {
                    if (idx === steps.length - 1) return null;
                    const isNextPassed = step.status === 'completed';
                    return (
                        <View
                            key={`track-${idx}`}
                            style={[
                                styles.trackSegment,
                                isNextPassed && styles.trackSegmentCompleted,
                            ]}
                        />
                    );
                })}
            </View>

            {/* Step Nodes */}
            <View style={styles.nodesRow}>
                {steps.map((step, index) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent = step.status === 'current';
                    const isFailed = step.status === 'failed';

                    return (
                        <View key={`${step.name}-${index}`} style={styles.stepItem}>
                            <View style={styles.nodeWrapper}>
                                {isCurrent && (
                                    <Animated.View
                                        style={[
                                            styles.pulseRing,
                                            {
                                                transform: [{ scale: pulseAnim }],
                                                opacity: pulseAnim.interpolate({
                                                    inputRange: [1, 1.25],
                                                    outputRange: [0.6, 0],
                                                }),
                                            },
                                        ]}
                                    />
                                )}
                                <View
                                    style={[
                                        styles.circle,
                                        isCompleted && styles.circleCompleted,
                                        isCurrent && styles.circleCurrent,
                                        isFailed && styles.circleFailed,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.circleIcon,
                                            isCompleted && styles.iconCompleted,
                                            isCurrent && styles.iconCurrent,
                                            isFailed && styles.iconFailed,
                                        ]}
                                    >
                                        {isCompleted ? '✓' : isCurrent ? '⏳' : isFailed ? '✕' : `${index + 1}`}
                                    </Text>
                                </View>
                            </View>

                            <Text
                                numberOfLines={2}
                                style={[
                                    styles.stepLabel,
                                    isCompleted && styles.labelCompleted,
                                    isCurrent && styles.labelCurrent,
                                    isFailed && styles.labelFailed,
                                ]}
                            >
                                {step.name}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    circle: {
        alignItems: 'center',
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: radii.full,
        borderWidth: 1.5,
        height: 28,
        justifyContent: 'center',
        width: 28,
        zIndex: 2,
    },
    circleCompleted: {
        backgroundColor: '#15a05a',
        borderColor: '#15a05a',
    },
    circleCurrent: {
        backgroundColor: '#ecfdf5',
        borderColor: colors.primaryGreen,
        borderWidth: 2,
    },
    circleFailed: {
        backgroundColor: '#fee2e2',
        borderColor: '#e23c3c',
    },
    circleIcon: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
    },
    container: {
        marginVertical: 12,
        position: 'relative',
        width: '100%',
    },
    iconCompleted: {
        color: colors.white,
        fontSize: 12,
    },
    iconCurrent: {
        fontSize: 12,
    },
    iconFailed: {
        color: '#b91c1c',
        fontSize: 11,
    },
    labelCompleted: {
        color: colors.foreground,
        fontWeight: '600',
    },
    labelCurrent: {
        color: colors.primaryGreen,
        fontWeight: '700',
    },
    labelFailed: {
        color: '#b91c1c',
        fontWeight: '600',
    },
    nodeWrapper: {
        alignItems: 'center',
        height: 30,
        justifyContent: 'center',
        position: 'relative',
        width: 30,
    },
    nodesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    pulseRing: {
        backgroundColor: colors.accentLime,
        borderRadius: radii.full,
        bottom: -2,
        left: -2,
        position: 'absolute',
        right: -2,
        top: -2,
        zIndex: 1,
    },
    stepItem: {
        alignItems: 'center',
        flex: 1,
        gap: 6,
    },
    stepLabel: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '500',
        lineHeight: 13,
        textAlign: 'center',
    },
    trackBackground: {
        flexDirection: 'row',
        height: 2,
        left: 20,
        position: 'absolute',
        right: 20,
        top: 14,
        zIndex: 0,
    },
    trackSegment: {
        backgroundColor: colors.border,
        flex: 1,
        height: 2,
    },
    trackSegmentCompleted: {
        backgroundColor: '#15a05a',
    },
});
