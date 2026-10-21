import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/lib/theme/tokens';

export type StatusPillColor = 'emerald' | 'amber' | 'red' | 'blue' | 'gray';

type Props = {
    icon: string;
    label: string;
    subtitle?: string;
    value?: string;
    chip?: string;
    pillLabel?: string;
    pillColor?: StatusPillColor;
    onPress?: () => void;
    last?: boolean;
};

export function ProfileRow({
    icon,
    label,
    subtitle,
    value,
    chip,
    pillLabel,
    pillColor = 'gray',
    onPress,
    last = false,
}: Props) {
    const isClickable = !!onPress;

    const pillStyle = pillStyles[pillColor] || pillStyles.gray;

    const content = (
        <View style={[styles.row, !last && styles.hairline]}>
            <View style={styles.iconWrap}>
                <Text style={styles.iconText}>{icon}</Text>
            </View>
            <View style={styles.textCol}>
                <Text numberOfLines={1} style={styles.label}>{label}</Text>
                {subtitle ? (
                    <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
                ) : null}
            </View>
            {value ? <Text numberOfLines={1} style={styles.value}>{value}</Text> : null}
            {chip ? (
                <View style={styles.chip}>
                    <Text style={styles.chipText}>{chip}</Text>
                </View>
            ) : null}
            {pillLabel ? (
                <View style={[styles.statusPill, pillStyle.pill]}>
                    <Text style={[styles.statusPillText, pillStyle.text]}>{pillLabel}</Text>
                </View>
            ) : null}
            {isClickable ? <Text style={styles.chevron}>›</Text> : null}
        </View>
    );

    if (isClickable) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
            >
                {content}
            </Pressable>
        );
    }

    return content;
}

const styles = StyleSheet.create({
    pressable: {
        width: '100%',
    },
    pressed: {
        backgroundColor: 'rgba(238, 240, 231, 0.4)',
    },
    row: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        minHeight: 56,
        paddingHorizontal: 16,
        paddingVertical: 14,
        width: '100%',
    },
    hairline: {
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
        borderBottomWidth: 1,
    },
    iconWrap: {
        alignItems: 'center',
        backgroundColor: 'rgba(14, 48, 23, 0.08)',
        borderRadius: 10,
        flexShrink: 0,
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    iconText: {
        fontSize: 16,
    },
    textCol: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0,
    },
    label: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    subtitle: {
        color: colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    value: {
        color: colors.mutedForeground,
        fontSize: 14,
        fontWeight: '400',
        maxWidth: '50%',
        textAlign: 'right',
    },
    chip: {
        backgroundColor: colors.emeraldChipBg,
        borderColor: colors.emeraldChipBorder,
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    chipText: {
        color: colors.emeraldChipText,
        fontSize: 10,
        fontWeight: '700',
    },
    statusPill: {
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '600',
    },
    chevron: {
        color: colors.mutedForeground,
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 2,
    },
});


const pillStyles = {
    emerald: StyleSheet.create({
        pill: {
            backgroundColor: '#ecfdf5',
            borderColor: 'rgba(16, 185, 129, 0.3)',
        },
        text: {
            color: '#065f46',
        },
    }),
    blue: StyleSheet.create({
        pill: {
            backgroundColor: '#eff6ff',
            borderColor: 'rgba(59, 130, 246, 0.3)',
        },
        text: {
            color: '#1d4ed8',
        },
    }),
    amber: StyleSheet.create({
        pill: {
            backgroundColor: '#fffbeb',
            borderColor: 'rgba(245, 158, 11, 0.3)',
        },
        text: {
            color: '#b45309',
        },
    }),
    red: StyleSheet.create({
        pill: {
            backgroundColor: '#fef2f2',
            borderColor: 'rgba(239, 68, 68, 0.3)',
        },
        text: {
            color: '#b91c1c',
        },
    }),
    gray: StyleSheet.create({
        pill: {
            backgroundColor: '#f9fafb',
            borderColor: 'rgba(107, 114, 128, 0.3)',
        },
        text: {
            color: '#4b5563',
        },
    }),
};

