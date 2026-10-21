import { createContext, useContext, useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { configureAuthInterceptors } from '@/lib/api/interceptors';
import { clearSession, completeOtp, beginLogin, beginRegistration, getAccessToken, handleSuccessfulAuth, refreshSession, restoreSession, signOut } from './auth.service';
import { authenticatedState, initialAuthState, type AuthState, type PendingOtp } from './auth.store';
import type { AuthSession, LoginPayload, LoginResult, RegisterPayload } from './api/auth.types';

type AuthContextValue = {
  state: AuthState;
  beginLogin: (payload: LoginPayload) => Promise<LoginResult>;
  beginRegistration: (payload: RegisterPayload) => ReturnType<typeof beginRegistration>;
  verifyOtp: (code: string) => ReturnType<typeof completeOtp>;
  setPendingOtp: (pendingOtp: PendingOtp) => void;
  setAuthenticatedSession: (session: AuthSession) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type Action =
  | { type: 'authenticated'; session: AuthSession }
  | { type: 'unauthenticated' }
  | { type: 'pendingOtp'; pendingOtp: PendingOtp };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'authenticated':
      return authenticatedState(action.session);
    case 'pendingOtp':
      return { ...state, pendingOtp: action.pendingOtp };
    case 'unauthenticated':
      return { status: 'unauthenticated', user: null, pendingOtp: null };
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, initialAuthState);

  useEffect(() => {
    configureAuthInterceptors({
      getAccessToken,
      refreshSession: async () => {
        await refreshSession();
      },
      onRefreshFailure: async () => {
        await clearSession();
        dispatch({ type: 'unauthenticated' });
      },
    });

    restoreSession()
      .then((session) => {
        if (session) dispatch({ type: 'authenticated', session });
        else dispatch({ type: 'unauthenticated' });
      })
      .catch(() => dispatch({ type: 'unauthenticated' }));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    state,
    beginLogin: async (payload: LoginPayload) => {
      const result = await beginLogin(payload);
      if (!result.requiresOtp) {
        dispatch({ type: 'authenticated', session: result.session });
      }
      return result;
    },
    beginRegistration,
    verifyOtp: async (code) => {
      if (!state.pendingOtp) throw new Error('Your OTP session has expired. Please start again.');
      const session = await completeOtp({ otpSessionId: state.pendingOtp.otpSessionId, code });
      dispatch({ type: 'authenticated', session });
      return session;
    },
    setPendingOtp: (pendingOtp) => dispatch({ type: 'pendingOtp', pendingOtp }),
    setAuthenticatedSession: (session) => dispatch({ type: 'authenticated', session }),
    signOut: async () => {
      await signOut();
      dispatch({ type: 'unauthenticated' });
    },
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
