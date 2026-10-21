import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radii } from '@/lib/theme/tokens';
import type { StatusPillColor } from '../api/orders.types';

interface Props {
    label: string;
    color?: StatusPillColor;
}

const pillStyles: Record<StatusPillColor, { pill: object; text: object }> = {
    emerald: {
        pill: {
            backgroundColor: '#ecfdf5',
            borderColor: 'rgba(16, 185, 129, 0.3)',
        },
        text: {
            color: '#065f46',
        },
    },
    blue: {
        pill: {
            backgroundColor: '#eff6ff',
            borderColor: 'rgba(59, 130, 246, 0.3)',
        },
        text: {
            color: '#1d4ed8',
        },
    },
    amber: {
        pill: {
            backgroundColor: '#fffbeb',
            borderColor: 'rgba(245, 158, 11, 0.3)',
        },
        text: {
            color: '#b45309',
        },
    },
    red: {
        pill: {
            backgroundColor: '#fef2f2',
            borderColor: 'rgba(239, 68, 68, 0.3)',
        },
        text: {
            color: '#b91c1c',
        },
    },
    gray: {
        pill: {
            backgroundColor: '#f9fafb',
            borderColor: 'rgba(107, 114, 128, 0.3)',
        },
        text: {
            color: '#4b5563',
        },
    },
};

export function OrderStatusPill({ label, color = 'gray' }: Props) {
    const styleObj = pillStyles[color] || pillStyles.gray;

    return (
        <View style={[styles.pill, styleObj.pill]}>
            <Text style={[styles.text, styleObj.text]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    text: {
        fontSize: 11,
        fontWeight: '600',
    },
});
