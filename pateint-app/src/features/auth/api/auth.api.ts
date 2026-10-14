import { apiClient } from '@/lib/api/client';
import { ApiRequestError, normalizeApiError } from '@/lib/api/api-error';
import type {
  ApiResponse,
  AuthSession,
  LoginPayload,
  LogoutPayload,
  OtpSessionData,
  RefreshPayload,
  RegisterPayload,
  VerifyOtpPayload,
} from './auth.types';

function payloadOf<T>(response: ApiResponse<T>) {
  if (!response.success) {
    throw new ApiRequestError({
      kind: response.statusCode === 401 ? 'invalid_credentials' : 'unknown',
      message: response.message ?? 'The request was not successful.',
      status: response.statusCode,
      correlationId: response.correlationId,
      responseData: response,
    });
  }

  return response.data;
}

function readOtpSession(data: unknown): OtpSessionData {
  const candidate = data as { otpSessionId?: unknown } | null;
  if (typeof candidate?.otpSessionId !== 'string') {
    throw new Error('The authentication service did not return an OTP session.');
  }
  return { otpSessionId: candidate.otpSessionId };
}

function readSession(data: unknown): AuthSession {
  const value = (data ?? {}) as Record<string, unknown>;
  const tokens = (value.tokens ?? value) as Record<string, unknown>;
  const accessToken = tokens.accessToken ?? tokens.access_token;
  const refreshToken = tokens.refreshToken ?? tokens.refresh_token;

  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
    throw new Error('The authentication service returned an invalid token response.');
  }

  const user = (value.user ?? null) as AuthSession['user'];
  return { accessToken, refreshToken, user };
}

async function post<TResponse, TBody>(url: string, body: TBody) {
  try {
    const response = await apiClient.post<ApiResponse<TResponse>>(url, body);
    if (!response.data.success) {
      throw new ApiRequestError({
        kind: response.data.statusCode === 401 ? 'invalid_credentials' : 'unknown',
        message: response.data.message ?? 'The request was not successful.',
        status: response.data.statusCode,
        correlationId: response.data.correlationId,
        responseData: response.data,
      });
    }
    return response.data;
  } catch (error) {
    const apiError = normalizeApiError(error);
    if (__DEV__) {
      console.error(`[Auth API] ${url}`, {
        kind: apiError.kind,
        status: apiError.status,
        message: apiError.message,
        responseData: apiError.responseData,
        correlationId: apiError.correlationId,
      });
    }
    throw apiError;
  }
}

export async function register(payload: RegisterPayload) {
  const response = await post<unknown, RegisterPayload>('/patient/v1/auth/register', payload);
  return readOtpSession(payloadOf(response));
}

export async function login(payload: LoginPayload) {
  const response = await post<unknown, LoginPayload>('/patient/v1/auth/login', payload);
  return readOtpSession(payloadOf(response));
}

export async function verifyOtp(payload: VerifyOtpPayload) {
  const response = await post<unknown, VerifyOtpPayload>('/patient/v1/auth/otp/verify', payload);
  return readSession(payloadOf(response));
}

export async function refresh(payload: RefreshPayload) {
  const response = await post<unknown, RefreshPayload>('/patient/v1/auth/refresh', payload);
  return readSession(payloadOf(response));
}

export async function logout(payload: LogoutPayload) {
  await post<unknown, LogoutPayload>('/patient/v1/auth/logout', payload);
}
