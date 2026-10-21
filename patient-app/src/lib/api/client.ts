import { create } from 'axios';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://patient.cannaquest.com.au';

export const apiClient = create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});
