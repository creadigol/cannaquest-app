import { Pressable, StyleSheet, Text, View } from 'react-native';

export function CheckboxRow({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.row}>
      <View style={[styles.box, checked && styles.checked]}>{checked ? <Text style={styles.tick}>✓</Text> : null}</View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  box: { alignItems: 'center', borderColor: '#a8b7ab', borderRadius: 4, borderWidth: 1, height: 14, justifyContent: 'center', width: 14 },
  checked: { backgroundColor: '#0c3e20', borderColor: '#0c3e20' },
  tick: { color: '#ffffff', fontSize: 10, fontWeight: '900', lineHeight: 12 },
  label: { color: '#718178', flex: 1, fontSize: 11, lineHeight: 16 },
});
