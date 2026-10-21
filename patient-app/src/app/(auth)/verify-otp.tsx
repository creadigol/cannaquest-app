import { useEffect, useState } from 'react';
import { AuthScreen } from '@/features/auth/components/AuthScreen';
import { OtpForm } from '@/features/auth/components/OtpForm';
import { useAuth } from '@/features/auth/auth.context';
import { getOtpDestination } from '@/features/auth/api/auth.api';

export default function VerifyOtpScreen() {
  const { state } = useAuth();
  const pendingOtp = state.pendingOtp;
  const isPhone = pendingOtp?.channel === 'sms';

  const [contactDestination, setContactDestination] = useState<string | undefined>(
    pendingOtp?.destination || (isPhone ? pendingOtp?.phone : pendingOtp?.email)
  );

  // If backend provides a dedicated endpoint to resolve the exact non-masked destination, query it
  useEffect(() => {
    if (pendingOtp?.otpSessionId) {
      getOtpDestination(pendingOtp.otpSessionId).then((dest) => {
        if (dest) {
          const directTarget = isPhone ? dest.phone : (dest.email || dest.phone);
          if (directTarget) {
            setContactDestination(directTarget);
          }
        }
      });
    }
  }, [pendingOtp?.otpSessionId, isPhone]);

  // Keep state updated when user enters and sends their phone in OtpForm
  useEffect(() => {
    if (pendingOtp?.destination) {
      setContactDestination(pendingOtp.destination);
    }
  }, [pendingOtp?.destination]);

  const title = isPhone
    ? (contactDestination ? 'Check your messages' : 'Mobile number required')
    : 'Check your email';

  const subtitle = isPhone
    ? (contactDestination
        ? 'We sent a 6-digit verification code via SMS to'
        : 'Please enter your mobile number below to receive your SMS code.')
    : 'We sent a 6-digit verification code to';

  return (
    <AuthScreen
      otp
      channel={pendingOtp?.channel}
      destination={contactDestination}
      title={title}
      subtitle={subtitle}
    >
      <OtpForm />
    </AuthScreen>
  );
}
