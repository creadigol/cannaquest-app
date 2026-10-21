import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { CartScreenContent } from '@/features/cart';
import { colors } from '@/lib/theme/tokens';

export default function CartScreen() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <CartScreenContent />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: colors.background,
        flex: 1,
    },
});
