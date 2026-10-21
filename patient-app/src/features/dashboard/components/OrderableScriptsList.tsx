import { Pressable, StyleSheet, Text, View } from 'react-native';
import { brandLabel, colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { OrderablePrescription } from '../api/dashboard.types';

type Props = {
  scripts: OrderablePrescription[];
  onViewAll: () => void;
  onAddToCart: (scriptId: string) => void;
};

export function OrderableScriptsList({ scripts, onViewAll, onAddToCart }: Props) {
  if (scripts.length === 0) return null;
  const visible = scripts.slice(0, 2);

  return (
    <View>
      <View style={styles.header}>
        <Text style={brandLabel}>Scripts Ready to Order</Text>
        <Pressable onPress={onViewAll}>
          <Text style={styles.viewAll}>View All</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {visible.map((rx) => (
          <View key={rx.id} style={styles.row}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>💊</Text>
            </View>
            <View style={styles.textWrap}>
              <Text numberOfLines={1} style={styles.name}>
                {rx.name}
              </Text>
              <Text style={styles.meta}>
                {[rx.strength, rx.remainingRepeats != null ? `${rx.remainingRepeats} repeats left` : null].filter(Boolean).join(' • ')}
              </Text>
              {rx.unitPrice != null ? <Text style={styles.price}>${rx.unitPrice.toFixed(2)}</Text> : null}
            </View>
            <Pressable onPress={() => onAddToCart(rx.id)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
              <Text style={styles.addButtonText}>Add to Cart</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, paddingHorizontal: 4 },
  viewAll: { color: colors.emeraldChipText, fontSize: 12, fontWeight: '700' },
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
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: radii.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  icon: { fontSize: 20 },
  textWrap: { flex: 1, minWidth: 0 },
  name: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
  meta: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  price: { color: colors.emeraldChipText, fontSize: 12, fontWeight: '700', marginTop: 4 },
  addButton: { backgroundColor: colors.limeGradientStart, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 8 },
  addButtonText: { color: colors.primaryGreen, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});