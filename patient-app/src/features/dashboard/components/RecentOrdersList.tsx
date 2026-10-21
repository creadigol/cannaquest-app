import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { brandLabel, colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { RecentOrder } from '../api/dashboard.types';

type Props = {
    orders: RecentOrder[];
    activeOrdersCount: number;
};

export function RecentOrdersList({ orders, activeOrdersCount }: Props) {
    if (orders.length === 0) return null;

    return (
        <View>
            <Pressable
                onPress={() => router.push('/(app)/(tabs)/orders')}
                style={({ pressed }) => [styles.header, pressed && styles.pressed]}
            >
                <Text style={brandLabel}>Recent Orders</Text>
                {activeOrdersCount > 0 ? (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {activeOrdersCount} active
                        </Text>
                    </View>
                ) : null}
                <View style={{ flex: 1 }} />
                <Text style={styles.viewAllText}>View All ›</Text>
            </Pressable>

            <View style={styles.list}>
                {orders.map((order) => (
                    <Pressable
                        key={order.id}
                        onPress={() => router.push('/(app)/(tabs)/orders')}
                        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                    >
                        <View style={styles.textWrap}>
                            <Text style={styles.orderId}>{order.uuid ?? `Order #${order.id}`}</Text>
                            {order.shippingSummary ? (
                                <Text numberOfLines={1} style={styles.shipping}>
                                    {order.shippingSummary}
                                </Text>
                            ) : null}
                        </View>
                        <Text style={styles.status}>{order.status}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: 4 },
    badge: { backgroundColor: colors.emeraldChipBg, borderColor: colors.emeraldChipBorder, borderRadius: radii.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { color: colors.emeraldChipText, fontSize: 10, fontWeight: '700' },
    list: { gap: 10 },
    row: {
        alignItems: 'center',
        backgroundColor: colors.surfaceCardBg,
        borderColor: colors.surfaceCardBorder,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: spacing.md,
        padding: 14,
        ...shadows.tier1,
    },
    textWrap: { flex: 1, minWidth: 0 },
    orderId: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
    shipping: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
    status: { color: colors.emeraldChipText, fontSize: 11, fontWeight: '700' },
    viewAllText: { color: colors.primaryGreen, fontSize: 11, fontWeight: '700' },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});