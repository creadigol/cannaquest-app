import type { AuthSession, AuthUser } from './api/auth.types';

export type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated';

export type PendingOtp = {
  otpSessionId: string;
  flow: 'login' | 'register';
  email?: string;
};

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  pendingOtp: PendingOtp | null;
};

export const initialAuthState: AuthState = {
  status: 'booting',
  user: null,
  pendingOtp: null,
};

export function authenticatedState(session: AuthSession): AuthState {
  return {
    status: 'authenticated',
    user: session.user,
    pendingOtp: null,
  };
}
