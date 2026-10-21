import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme/tokens';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
};

export function ProductSearchBar({ value, onChangeText, onClear }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        placeholder="Search products or brands..."
        placeholderTextColor={colors.mutedForeground}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="words"
        autoCorrect={true}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable hitSlop={8} onPress={onClear} style={styles.clearButton}>
          <Text style={styles.clearIcon}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  icon: {
    fontSize: 14,
    marginRight: spacing.sm,
    opacity: 0.6,
  },
  input: {
    color: colors.foreground,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 13,
    paddingVertical: spacing.xs,
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  clearIcon: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: '700',
  },
});
