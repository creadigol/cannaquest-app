import {
  clearRefreshToken,
  clearRememberMePreference,
  clearRememberToken,
  getRefreshToken,
  getRememberMePreference,
  getRememberToken,
  setRefreshToken,
  setRememberMePreference,
  setRememberToken,
} from '@/lib/storage/secure-token-storage';
import { login, logout, refresh, register, verifyOtp } from './api/auth.api';
import type { AuthSession, LoginPayload, LoginResult, RegisterPayload, VerifyOtpPayload } from './api/auth.types';

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function beginLogin(payload: LoginPayload): Promise<LoginResult> {
  await setRememberMePreference(payload.remember);
  const result = await login(payload);

  if (!result.requiresOtp) {
    // User is exempt from OTP! Immediately activate session and persist if remembered
    await handleSuccessfulAuth(result.session);
    return result;
  }

  if (payload.remember && result.rememberToken) {
    await setRememberToken(result.rememberToken);
  }
  return result;
}

export async function beginRegistration(payload: RegisterPayload) {
  return register(payload);
}

export async function handleSuccessfulAuth(session: AuthSession) {
  setAccessToken(session.accessToken);
  const rememberPref = await getRememberMePreference();
  // If Remember Me is checked, store the refresh token for persistent automatic sign-in
  if (rememberPref !== 'false') {
    await setRefreshToken(session.refreshToken);
  }
  return session;
}

export async function completeOtp(payload: VerifyOtpPayload) {
  const session = await verifyOtp(payload);
  await handleSuccessfulAuth(session);
  return session;
}

export async function restoreSession() {
  const rememberPref = await getRememberMePreference();
  if (rememberPref === 'false') {
    // User chose not to be remembered; do not auto-restore session on next cold start
    return null;
  }

  const token = await getRefreshToken();
  if (!token) return null;

  try {
    const session = await refresh({ refreshToken: token });
    setAccessToken(session.accessToken);
    await setRefreshToken(session.refreshToken);
    return session;
  } catch (error) {
    await clearSession();
    throw error;
  }
}

export async function refreshSession() {
  const token = await getRefreshToken();
  if (!token) throw new Error('No refresh token is available.');

  const session = await refresh({ refreshToken: token });
  setAccessToken(session.accessToken);
  await setRefreshToken(session.refreshToken);
  return session;
}

export async function signOut() {
  const token = await getRefreshToken();
  try {
    if (token) await logout({ refreshToken: token });
  } finally {
    await clearSession();
  }
}

export async function clearSession() {
  setAccessToken(null);
  await clearRefreshToken();
  await clearRememberToken();
  await clearRememberMePreference();
}
