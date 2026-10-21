import { Pressable, StyleSheet, Text, View } from 'react-native';
import { brandLabel, colors, radii, spacing } from '@/lib/theme/tokens';

type QuickAccessItem = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
};

type Props = {
  items: QuickAccessItem[];
};

export function QuickAccessGrid({ items }: Props) {
  return (
    <View>
      <Text style={[brandLabel, styles.label]}>Quick Access</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <Pressable key={item.key} onPress={item.onPress} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={styles.tileLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    alignItems: 'center',
    backgroundColor: colors.glassCardSmBg,
    borderColor: colors.glassCardSmBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    paddingVertical: spacing.md,
  },
  iconWrap: { alignItems: 'center', backgroundColor: colors.emeraldChipBg, borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  icon: { fontSize: 15 },
  tileLabel: { color: colors.foreground, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
