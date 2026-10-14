import { AuthScreen } from '@/features/auth/components/AuthScreen';
import { OtpForm } from '@/features/auth/components/OtpForm';
import { useAuth } from '@/features/auth/auth.context';

export default function VerifyOtpScreen() {
  const { state } = useAuth();

  return (
    <AuthScreen otp email={state.pendingOtp?.email} title="Check your email" subtitle="We sent a verification code to">
      <OtpForm />
    </AuthScreen>
  );
}
