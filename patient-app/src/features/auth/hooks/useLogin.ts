import { useMutation } from '@tanstack/react-query';
import { beginLogin } from '../auth.service';

export function useLogin() {
  return useMutation({ mutationFn: beginLogin });
}
