import { clearRefreshToken, getRefreshToken, setRefreshToken } from '@/lib/storage/secure-token-storage';
import { login, logout, refresh, register, verifyOtp } from './api/auth.api';
import type { LoginPayload, RegisterPayload, VerifyOtpPayload } from './api/auth.types';

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function beginLogin(payload: LoginPayload) {
  return login(payload);
}

export async function beginRegistration(payload: RegisterPayload) {
  return register(payload);
}

export async function completeOtp(payload: VerifyOtpPayload) {
  const session = await verifyOtp(payload);
  setAccessToken(session.accessToken);
  await setRefreshToken(session.refreshToken);
  return session;
}

export async function restoreSession() {
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
}
