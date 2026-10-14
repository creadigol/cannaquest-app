import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLogout } from '@/features/auth/hooks/useLogout';

export default function HomeScreen() {
  const logout = useLogout();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patient portal</Text>
      <Text style={styles.subtitle}>You are signed in. Your portal experience starts here.</Text>
      <Pressable disabled={logout.isPending} onPress={() => logout.mutateAsync().then(() => router.replace('/(auth)/login' as Href))} style={styles.button}>
        <Text style={styles.buttonText}>{logout.isPending ? 'Signing out…' : 'Sign out'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#DDF4C7', flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#183a28', fontSize: 30, fontWeight: '800', marginBottom: 10 },
  subtitle: { color: '#55725b', fontSize: 16, lineHeight: 24, marginBottom: 30 },
  button: { alignItems: 'center', backgroundColor: '#267b38', borderRadius: 14, padding: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
