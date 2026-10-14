import { useRouter, type Href } from 'expo-router';
import { AuthScreen } from '@/features/auth/components/AuthScreen';
import { SignupForm } from '@/features/auth/components/SignupForm';

export default function SignupScreen() {
  const router = useRouter();

  return (
    <AuthScreen title="Create your account" subtitle="Enter your details and we’ll verify your email with a code." mode="signup" onModeChange={(mode) => router.replace((mode === 'login' ? '/(auth)/login' : '/(auth)/signup') as Href)}>
      <SignupForm />
    </AuthScreen>
  );
}
