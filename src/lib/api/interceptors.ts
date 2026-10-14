import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from './client';

type AuthInterceptorHandlers = {
  getAccessToken: () => string | null;
  refreshSession: () => Promise<void>;
  onRefreshFailure: () => Promise<void>;
};

let handlers: AuthInterceptorHandlers | null = null;
let refreshPromise: Promise<void> | null = null;
let installed = false;

type RetryableConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

function isAuthRequest(url?: string) {
  return Boolean(url?.includes('/patient/v1/auth/'));
}

export function configureAuthInterceptors(nextHandlers: AuthInterceptorHandlers) {
  handlers = nextHandlers;
  if (installed) return;
  installed = true;

  apiClient.interceptors.request.use((config) => {
    const token = handlers?.getAccessToken();
    if (token && !isAuthRequest(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryableConfig | undefined;
      const status = error.response?.status;
      const isRefreshRequest = error.config?.url?.includes('/auth/refresh');
      const isAuthRequest = error.config?.url ? isAuthRequestUrl(error.config.url) : false;

      // Login, registration, and OTP endpoints must surface their own API errors.
      // A 401 from these routes is not an expired access-token session.
      if (!handlers || status !== 401 || !original || original._authRetry || isRefreshRequest || isAuthRequest) {
        return Promise.reject(error);
      }

      original._authRetry = true;
      refreshPromise ??= handlers.refreshSession().finally(() => {
        refreshPromise = null;
      });

      try {
        await refreshPromise;
        return apiClient(original);
      } catch (refreshError) {
        await handlers.onRefreshFailure();
        return Promise.reject(refreshError);
      }
    },
  );
}

function isAuthRequestUrl(url: string) {
  return url.includes('/patient/v1/auth/');
}
