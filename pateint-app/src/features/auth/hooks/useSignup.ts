import { useMutation } from '@tanstack/react-query';
import { beginRegistration } from '../auth.service';

export function useSignup() {
  return useMutation({ mutationFn: beginRegistration });
}
