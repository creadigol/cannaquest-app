import { StyleSheet, Text } from 'react-native';

export function ErrorMessage({ message }: { message?: string }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}

const styles = StyleSheet.create({
  error: { color: '#b23c3c', fontSize: 14, lineHeight: 20 },
});
