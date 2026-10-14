import { useRouter, type Href } from 'expo-router';
import { AuthScreen } from '@/features/auth/components/AuthScreen';
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <AuthScreen title="Welcome Back" subtitle="Sign in to access your prescriptions, telehealth appointments, and treatment plans." mode="login" onModeChange={(mode) => router.replace((mode === 'login' ? '/(auth)/login' : '/(auth)/signup') as Href)}>
      <LoginForm />
    </AuthScreen>
  );
}
