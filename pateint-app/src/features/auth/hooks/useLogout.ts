import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth.context';

export function useLogout() {
  const { signOut } = useAuth();
  return useMutation({ mutationFn: signOut });
}
