import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme/tokens';

export const PRODUCT_CATEGORIES = ['All', 'Flower', 'Oil', 'Cartridge', 'Devices'] as const;

type Props = {
  selected: string;
  onSelect: (category: string) => void;
};

export function ProductCategoryChips({ selected, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {PRODUCT_CATEGORIES.map((cat) => {
          const isActive = selected.toLowerCase() === cat.toLowerCase();
          return (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.8}
              onPress={() => onSelect(cat)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -spacing.md,
  },
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipActive: {
    backgroundColor: colors.primaryGreen,
    borderColor: colors.primaryGreen,
  },
  chipText: {
    color: colors.foreground,
    fontFamily: typography.semiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.accentLime,
    fontWeight: '700',
  },
});
