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

// Global Request / Response Logger for Metro terminal output
apiClient.interceptors.request.use((config) => {
  const method = (config.method || 'GET').toUpperCase();
  const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
  console.log(`\x1b[36m[API REQ]\x1b[0m \x1b[1m${method}\x1b[0m ${fullUrl}`);
  if (config.params) {
    console.log(`  \x1b[90mParams:\x1b[0m`, config.params);
  }
  if (config.data && method !== 'GET') {
    console.log(`  \x1b[90mPayload:\x1b[0m`, typeof config.data === 'string' ? config.data.slice(0, 200) : config.data);
  }
  (config as any).__startTime = Date.now();
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const elapsed = Date.now() - ((response.config as any).__startTime || Date.now());
    console.log(
      `\x1b[32m[API SUCCESS]\x1b[0m \x1b[1m${response.status}\x1b[0m ${response.config.url} \x1b[90m(${elapsed}ms)\x1b[0m`
    );
    if (response.data) {
      console.log(`  \x1b[32mResponse Body:\x1b[0m`, typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    const elapsed = Date.now() - ((error.config as any)?.__startTime || Date.now());
    const status = error.response?.status || 'NETWORK/TIMEOUT';
    const errorData = error.response?.data;
    console.log(
      `\x1b[31m[API ERROR]\x1b[0m \x1b[1m${status}\x1b[0m ${error.config?.url} \x1b[90m(${elapsed}ms)\x1b[0m`
    );
    if (errorData) {
      console.log(`  \x1b[31mResponse Body:\x1b[0m`, typeof errorData === 'object' ? JSON.stringify(errorData, null, 2) : errorData);
    } else {
      console.log(`  \x1b[31mMessage:\x1b[0m`, error.message);
    }
    return Promise.reject(error);
  }
);

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
