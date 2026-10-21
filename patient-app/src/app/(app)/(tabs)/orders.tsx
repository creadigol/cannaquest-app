import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { OrdersScreenContent } from '@/features/orders';
import { colors } from '@/lib/theme/tokens';

export default function OrdersScreen() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <OrdersScreenContent />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: colors.background,
        flex: 1,
    },
});
