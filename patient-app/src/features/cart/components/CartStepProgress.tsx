import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/lib/theme/tokens';
import type { CartStep } from '../api/cart.types';

interface Props {
    currentStep: CartStep;
}

const STEPS: { id: CartStep; label: string; index: number }[] = [
    { id: 'cart', label: 'Cart', index: 1 },
    { id: 'delivery', label: 'Delivery', index: 2 },
    { id: 'payment', label: 'Payment', index: 3 },
];

export function CartStepProgress({ currentStep }: Props) {
    const stepOrder: Record<CartStep, number> = {
        cart: 1,
        delivery: 2,
        payment: 3,
    };

    const currentOrder = stepOrder[currentStep];

    return (
        <View style={styles.container}>
            {STEPS.map((step, idx) => {
                const isPast = currentOrder > step.index;
                const isCurrent = currentOrder === step.index;

                return (
                    <React.Fragment key={step.id}>
                        <View style={styles.stepItem}>
                            <View
                                style={[
                                    styles.circle,
                                    isPast && styles.circlePast,
                                    isCurrent && styles.circleCurrent,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.circleText,
                                        isPast && styles.circleTextPast,
                                        isCurrent && styles.circleTextCurrent,
                                    ]}
                                >
                                    {isPast ? '✓' : step.index}
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    isCurrent && styles.stepLabelCurrent,
                                    isPast && styles.stepLabelPast,
                                ]}
                            >
                                {step.label}
                            </Text>
                        </View>
                        {idx < STEPS.length - 1 && (
                            <View
                                style={[
                                    styles.line,
                                    currentOrder > step.index && styles.lineActive,
                                ]}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    circle: {
        alignItems: 'center',
        backgroundColor: colors.muted,
        borderRadius: radii.full,
        height: 22,
        justifyContent: 'center',
        width: 22,
    },
    circleCurrent: {
        backgroundColor: colors.primaryGreen,
    },
    circlePast: {
        backgroundColor: colors.statusEmerald,
    },
    circleText: {
        color: colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
    },
    circleTextCurrent: {
        color: colors.white,
    },
    circleTextPast: {
        color: colors.white,
    },
    container: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    line: {
        backgroundColor: colors.border,
        flex: 1,
        height: 1.5,
        marginHorizontal: 8,
        maxWidth: 36,
    },
    lineActive: {
        backgroundColor: colors.statusEmerald,
    },
    stepItem: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    stepLabel: {
        color: colors.mutedForeground,
        fontSize: 12,
        fontWeight: '500',
    },
    stepLabelCurrent: {
        color: colors.foreground,
        fontWeight: '700',
    },
    stepLabelPast: {
        color: colors.statusEmerald,
        fontWeight: '600',
    },
});
