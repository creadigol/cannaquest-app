import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'lime';
};

export function Button({ label, loading = false, onPress, variant = 'primary' }: Props) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'lime' && styles.lime, pressed && styles.pressed, loading && styles.disabled]}>
      {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.text}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#267b38',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 54,
  },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 },
  lime: { backgroundColor: '#b8f276' },
  text: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
