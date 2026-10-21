import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, shadows } from '@/lib/theme/tokens';
import type { QuestionChild, QuestionnaireQuestion } from '../api/questionnaire.types';

type Props = {
    question: QuestionnaireQuestion | QuestionChild;
    value: string | string[] | undefined;
    onChange: (val: string | string[]) => void;
    error?: string;
    answersState: Record<string, string | string[]>;
    onChildChange: (childId: number, val: string | string[]) => void;
    childErrors?: Record<string, string>;
};

export function QuestionRenderer({
    question,
    value,
    onChange,
    error,
    answersState,
    onChildChange,
    childErrors = {},
}: Props) {
    const options = question.options || [];
    const isYesNo =
        options.length === 2 &&
        options.includes('Yes') &&
        options.includes('No');

    const renderInput = () => {
        switch (question.type) {
            case 'Radio': {
                if (isYesNo) {
                    return (
                        <View style={styles.yesNoRow}>
                            {['Yes', 'No'].map((opt) => {
                                const selected = value === opt;
                                return (
                                    <Pressable
                                        key={opt}
                                        onPress={() => onChange(opt)}
                                        style={[
                                            styles.yesNoBtn,
                                            selected && styles.yesNoBtnSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.yesNoBtnText,
                                                selected && styles.yesNoBtnTextSelected,
                                            ]}
                                        >
                                            {opt === 'Yes' ? '✓ Yes' : '✕ No'}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    );
                }

                // Standard options list
                return (
                    <View style={styles.optionsList}>
                        {options.map((opt) => {
                            const selected = value === opt;
                            return (
                                <Pressable
                                    key={opt}
                                    onPress={() => onChange(opt)}
                                    style={[
                                        styles.optionCard,
                                        selected && styles.optionCardSelected,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.radioCircle,
                                            selected && styles.radioCircleSelected,
                                        ]}
                                    >
                                        {selected ? <View style={styles.radioInner} /> : null}
                                    </View>
                                    <Text
                                        style={[
                                            styles.optionText,
                                            selected && styles.optionTextSelected,
                                        ]}
                                    >
                                        {opt}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                );
            }

            case 'Select': {
                // Render as selection chips or list
                return (
                    <View style={styles.selectWrap}>
                        <View style={styles.chipsWrap}>
                            {options.map((opt) => {
                                const selected = value === opt;
                                return (
                                    <Pressable
                                        key={opt}
                                        onPress={() => onChange(opt)}
                                        style={[
                                            styles.selectChip,
                                            selected && styles.selectChipSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.selectChipText,
                                                selected && styles.selectChipTextSelected,
                                            ]}
                                        >
                                            {opt}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                );
            }

            case 'Checkboxlist': {
                const currentArr = Array.isArray(value) ? value : [];
                return (
                    <View style={styles.optionsList}>
                        {options.map((opt) => {
                            const isChecked = currentArr.includes(opt);
                            return (
                                <Pressable
                                    key={opt}
                                    onPress={() => {
                                        if (isChecked) {
                                            onChange(currentArr.filter((item) => item !== opt));
                                        } else {
                                            onChange([...currentArr, opt]);
                                        }
                                    }}
                                    style={[
                                        styles.optionCard,
                                        isChecked && styles.optionCardSelected,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.checkboxSquare,
                                            isChecked && styles.checkboxSquareSelected,
                                        ]}
                                    >
                                        {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
                                    </View>
                                    <Text
                                        style={[
                                            styles.optionText,
                                            isChecked && styles.optionTextSelected,
                                        ]}
                                    >
                                        {opt}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                );
            }

            case 'CheckboxlistConsent': {
                const currentArr = Array.isArray(value) ? value : [];
                return (
                    <View style={styles.optionsList}>
                        <View style={styles.consentNotice}>
                            <Text style={styles.consentNoticeText}>
                                ℹ️ Please read and agree to all items below to continue
                            </Text>
                        </View>
                        {options.map((opt) => {
                            const isChecked = currentArr.includes(opt);
                            return (
                                <Pressable
                                    key={opt}
                                    onPress={() => {
                                        if (isChecked) {
                                            onChange(currentArr.filter((item) => item !== opt));
                                        } else {
                                            onChange([...currentArr, opt]);
                                        }
                                    }}
                                    style={[
                                        styles.consentCard,
                                        isChecked && styles.optionCardSelected,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.checkboxSquare,
                                            isChecked && styles.checkboxSquareSelected,
                                        ]}
                                    >
                                        {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
                                    </View>
                                    <Text
                                        style={[
                                            styles.consentText,
                                            isChecked && styles.optionTextSelected,
                                        ]}
                                    >
                                        {opt}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                );
            }

            case 'Text': {
                const strVal = typeof value === 'string' ? value : '';
                return (
                    <TextInput
                        value={strVal}
                        onChangeText={onChange}
                        multiline
                        numberOfLines={4}
                        placeholder="Enter your answer..."
                        placeholderTextColor={colors.mutedForeground}
                        style={styles.textArea}
                    />
                );
            }

            default: {
                const strVal = typeof value === 'string' ? value : '';
                return (
                    <TextInput
                        value={strVal}
                        onChangeText={onChange}
                        placeholder="Enter your answer..."
                        placeholderTextColor={colors.mutedForeground}
                        style={styles.textInput}
                    />
                );
            }
        }
    };

    // Sub questions rendering
    const renderChildren = () => {
        if (!question.has_sub_questions || !question.children || question.children.length === 0) {
            return null;
        }

        return question.children.map((child) => {
            const currentParentAnswer = value;
            const parentAnswersArr = Array.isArray(currentParentAnswer)
                ? currentParentAnswer
                : [currentParentAnswer];

            // Render sub-question if child's triggering_answer matches parent answer
            const isTriggered =
                !child.triggering_answer || parentAnswersArr.includes(child.triggering_answer);

            if (!isTriggered) return null;

            const childKey = `q${child.id}`;
            const childValue = answersState[childKey];
            const childErr = childErrors[childKey];

            return (
                <View key={child.id} style={styles.childContainer}>
                    <Text style={styles.childLabel}>{child.content}</Text>
                    <QuestionRenderer
                        question={child}
                        value={childValue}
                        onChange={(val) => onChildChange(child.id, val)}
                        error={childErr}
                        answersState={answersState}
                        onChildChange={onChildChange}
                        childErrors={childErrors}
                    />
                </View>
            );
        });
    };

    const isMandatory =
        question.type === 'Radio' ||
        question.type === 'Select' ||
        question.type === 'Checkboxlist' ||
        question.type === 'CheckboxlistConsent';

    return (
        <View style={styles.questionCard}>
            <Text style={styles.questionTitle}>
                {question.content}
                {isMandatory ? <Text style={styles.star}> *</Text> : null}
            </Text>

            {renderInput()}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {renderChildren()}
        </View>
    );
}

const styles = StyleSheet.create({
    questionCard: {
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
        marginBottom: 16,
        ...shadows.tier1,
    },
    questionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.foreground,
        marginBottom: 12,
        lineHeight: 22,
    },
    star: {
        color: colors.destructive,
    },
    yesNoRow: {
        flexDirection: 'row',
        gap: 12,
    },
    yesNoBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: radii.full,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
    },
    yesNoBtnSelected: {
        backgroundColor: colors.primaryGreen,
        borderColor: colors.primaryGreen,
        ...shadows.tier1,
    },
    yesNoBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.mutedForeground,
    },
    yesNoBtnTextSelected: {
        color: '#ffffff',
    },
    optionsList: {
        gap: 8,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: radii.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    optionCardSelected: {
        borderColor: colors.primaryGreen,
        backgroundColor: 'rgba(14, 48, 23, 0.04)',
    },
    optionText: {
        flex: 1,
        fontSize: 14,
        color: colors.foreground,
        marginLeft: 10,
    },
    optionTextSelected: {
        fontWeight: '600',
        color: colors.primaryGreen,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioCircleSelected: {
        borderColor: colors.primaryGreen,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primaryGreen,
    },
    checkboxSquare: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSquareSelected: {
        backgroundColor: colors.primaryGreen,
        borderColor: colors.primaryGreen,
    },
    checkmark: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '900',
    },
    consentNotice: {
        backgroundColor: colors.secondary,
        padding: 10,
        borderRadius: radii.sm,
        marginBottom: 6,
    },
    consentNoticeText: {
        fontSize: 12,
        color: colors.mutedForeground,
    },
    consentCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        borderRadius: radii.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    consentText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        color: colors.foreground,
        marginLeft: 10,
    },
    textArea: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        padding: 14,
        fontSize: 14,
        color: colors.foreground,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    textInput: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        padding: 14,
        fontSize: 14,
        color: colors.foreground,
    },
    selectWrap: {
        gap: 8,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    selectChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radii.full,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    selectChipSelected: {
        backgroundColor: colors.primaryGreen,
        borderColor: colors.primaryGreen,
    },
    selectChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.foreground,
    },
    selectChipTextSelected: {
        color: '#ffffff',
    },
    childContainer: {
        marginTop: 14,
        marginLeft: 10,
        paddingLeft: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.accentLime,
    },
    childLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.mutedForeground,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 12,
        color: colors.destructive,
        marginTop: 8,
        fontWeight: '600',
    },
});
