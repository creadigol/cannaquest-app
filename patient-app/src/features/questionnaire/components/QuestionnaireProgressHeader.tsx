import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';

type Props = {
    currentStep: number;
    totalSteps: number;
    sectionName: string;
};

export function getEncouragingMessage(currentStep: number, totalSteps: number): string {
    if (currentStep === 0) {
        return "Let's make sure we have your correct details so we can provide you with the best care.";
    }

    const progress = ((currentStep + 1) / totalSteps) * 100;

    if (progress < 40) {
        return 'Great start! Take your time with each question.';
    } else if (progress < 60) {
        return "You're doing wonderfully. We're almost halfway there!";
    } else if (progress < 80) {
        return 'Excellent progress! Just a few more sections to go.';
    }

    return "Nearly there! You're in the home stretch now.";
}

export function QuestionnaireProgressHeader({ currentStep, totalSteps, sectionName }: Props) {
    const percentage = Math.min(100, Math.round(((currentStep + 1) / Math.max(1, totalSteps)) * 100));
    const encouragingMessage = getEncouragingMessage(currentStep, totalSteps);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.stepInfoGroup}>
                    <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{currentStep + 1}</Text>
                    </View>
                    <View style={styles.sectionTextGroup}>
                        <Text style={styles.sectionName} numberOfLines={1}>
                            {sectionName}
                        </Text>
                        <Text style={styles.stepSub}>
                            Step {currentStep + 1} of {totalSteps}
                        </Text>
                    </View>
                </View>

                <View style={styles.percentGroup}>
                    <Text style={styles.percentText}>{percentage}%</Text>
                    <Text style={styles.percentLabel}>Complete</Text>
                </View>
            </View>

            {/* Step Segments */}
            <View style={styles.track}>
                {Array.from({ length: totalSteps }).map((_, idx) => {
                    const isDoneOrActive = idx <= currentStep;
                    const isActive = idx === currentStep;
                    return (
                        <View
                            key={idx}
                            style={[
                                styles.segment,
                                isDoneOrActive && styles.segmentActive,
                                isActive && styles.segmentCurrent,
                            ]}
                        />
                    );
                })}
            </View>

            <Text style={styles.encouragingText}>{encouragingMessage}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 16,
        ...shadows.tier1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    stepInfoGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    stepBadge: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.primaryGreen,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        ...shadows.tier1,
    },
    stepBadgeText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    sectionTextGroup: {
        flex: 1,
    },
    sectionName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.foreground,
    },
    stepSub: {
        fontSize: 12,
        color: colors.mutedForeground,
        marginTop: 2,
    },
    percentGroup: {
        alignItems: 'flex-end',
    },
    percentText: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.primaryGreen,
    },
    percentLabel: {
        fontSize: 11,
        color: colors.mutedForeground,
    },
    track: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginVertical: 4,
    },
    segment: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.border,
    },
    segmentActive: {
        backgroundColor: colors.accentLime,
    },
    segmentCurrent: {
        backgroundColor: colors.primaryGreen,
    },
    encouragingText: {
        marginTop: 10,
        fontSize: 12,
        color: colors.mutedForeground,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
