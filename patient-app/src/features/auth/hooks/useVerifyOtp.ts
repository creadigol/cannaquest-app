import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth.context';

export function useVerifyOtp() {
  const { verifyOtp } = useAuth();
  return useMutation({ mutationFn: verifyOtp });
}
