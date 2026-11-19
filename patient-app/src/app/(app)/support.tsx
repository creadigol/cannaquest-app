import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/lib/theme/tokens';
import { SupportScreenContent } from '@/features/support/components/SupportScreenContent';

export default function SupportScreen() {
    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SupportScreenContent />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
});
