import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CartScreenContent } from '@/features/cart';
import { colors, radii, spacing, typography } from '@/lib/theme/tokens';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class CartErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[CartErrorBoundary] Caught Cart crash:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={errorStyles.container}>
                    <Text style={errorStyles.icon}>⚠️</Text>
                    <Text style={errorStyles.title}>Cart display error</Text>
                    <Text style={errorStyles.sub}>
                        {this.state.error?.message || 'An unexpected error occurred while loading your cart.'}
                    </Text>
                    {this.state.error?.stack ? (
                        <View style={errorStyles.stackBox}>
                            <Text numberOfLines={10} style={errorStyles.stackText}>
                                {this.state.error.stack}
                            </Text>
                        </View>
                    ) : null}
                    <View style={errorStyles.btnRow}>
                        <Pressable onPress={this.handleReset} style={errorStyles.retryBtn}>
                            <Text style={errorStyles.retryBtnText}>Retry</Text>
                        </Pressable>
                        <Pressable onPress={() => router.push('/(app)/(tabs)/scripts')} style={errorStyles.scriptsBtn}>
                            <Text style={errorStyles.scriptsBtnText}>Back to Scripts</Text>
                        </Pressable>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const errorStyles = StyleSheet.create({
    container: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        padding: spacing.xl,
        backgroundColor: colors.background,
    },
    icon: {
        fontSize: 36,
        marginBottom: 12,
    },
    title: {
        color: colors.foreground,
        fontFamily: typography.bold,
        fontSize: 18,
        marginBottom: 8,
    },
    sub: {
        color: colors.mutedForeground,
        fontFamily: typography.regular,
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 12,
    },
    stackBox: {
        backgroundColor: '#f1f5f9',
        borderRadius: radii.md,
        padding: spacing.sm,
        width: '100%',
        marginBottom: 16,
    },
    stackText: {
        color: '#475569',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    btnRow: {
        flexDirection: 'row',
        gap: 12,
    },
    retryBtn: {
        backgroundColor: colors.primaryGreen,
        borderRadius: radii.xl,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    retryBtnText: {
        color: colors.white,
        fontFamily: typography.bold,
        fontSize: 14,
    },
    scriptsBtn: {
        backgroundColor: colors.secondary,
        borderRadius: radii.xl,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    scriptsBtnText: {
        color: colors.foreground,
        fontFamily: typography.medium,
        fontSize: 14,
    },
});

export default function CartScreen() {
    return (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
            <StatusBar barStyle="dark-content" />
            <CartErrorBoundary>
                <CartScreenContent />
            </CartErrorBoundary>
        </SafeAreaView>
    );
}
