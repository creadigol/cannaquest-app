import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/lib/theme/tokens';
import { QuestionnaireScreenContent } from '@/features/questionnaire/components/QuestionnaireScreenContent';

export default function QuestionnaireScreen() {
    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Medical Questionnaire',
                    headerStyle: {
                        backgroundColor: colors.background,
                    },
                    headerTintColor: colors.foreground,
                    headerShadowVisible: false,
                    headerTitleStyle: {
                        fontWeight: '700',
                        fontSize: 17,
                    },
                }}
            />
            <View style={styles.container}>
                <QuestionnaireScreenContent />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
});
