import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'patient_portal.refresh_token';
const REMEMBER_TOKEN_KEY = 'patient_portal.remember_token';
const REMEMBER_ME_FLAG_KEY = 'patient_portal.remember_me';

export function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken() {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export function getRememberToken() {
  return SecureStore.getItemAsync(REMEMBER_TOKEN_KEY);
}

export async function setRememberToken(token: string) {
  await SecureStore.setItemAsync(REMEMBER_TOKEN_KEY, token);
}

export async function clearRememberToken() {
  await SecureStore.deleteItemAsync(REMEMBER_TOKEN_KEY);
}

export function getRememberMePreference() {
  return SecureStore.getItemAsync(REMEMBER_ME_FLAG_KEY);
}

export async function setRememberMePreference(enabled: boolean) {
  await SecureStore.setItemAsync(REMEMBER_ME_FLAG_KEY, enabled ? 'true' : 'false');
}

export async function clearRememberMePreference() {
  await SecureStore.deleteItemAsync(REMEMBER_ME_FLAG_KEY);
}
