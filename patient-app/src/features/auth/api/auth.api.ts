import { apiClient } from '@/lib/api/client';
import { ApiRequestError, normalizeApiError } from '@/lib/api/api-error';
import type {
  ApiResponse,
  AuthSession,
  LoginPayload,
  LoginResult,
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
  const candidate = data as { otpSessionId?: unknown; rememberToken?: unknown; remember_token?: unknown } | null;
  if (typeof candidate?.otpSessionId !== 'string') {
    throw new Error('The authentication service did not return an OTP session.');
  }
  const rememberToken =
    typeof candidate.rememberToken === 'string'
      ? candidate.rememberToken
      : typeof candidate.remember_token === 'string'
      ? candidate.remember_token
      : null;
  return { otpSessionId: candidate.otpSessionId, rememberToken };
}

function readSession(data: unknown): AuthSession {
  const value = (data ?? {}) as Record<string, unknown>;
  const tokens = (value.tokens ?? value) as Record<string, unknown>;
  const accessToken = tokens.accessToken ?? tokens.access_token ?? tokens.token;
  const refreshToken = tokens.refreshToken ?? tokens.refresh_token ?? tokens.accessToken ?? tokens.access_token ?? tokens.token;

  if (typeof accessToken !== 'string') {
    throw new Error('The authentication service returned an invalid token response.');
  }

  const user = (value.user ?? null) as AuthSession['user'];
  return {
    accessToken,
    refreshToken: typeof refreshToken === 'string' ? refreshToken : accessToken,
    user,
  };
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

export async function login(payload: LoginPayload): Promise<LoginResult> {
  console.log(`\n========================================`);
  console.log(`[LOGIN REQUEST] Channel: ${payload.channel.toUpperCase()}, Email: ${payload.email}`);
  const response = await post<unknown, LoginPayload>('/patient/v1/auth/login', payload);
  const data = payloadOf(response) as Record<string, unknown> | null;
  console.log(`[LOGIN RESPONSE]:`, JSON.stringify(data, null, 2));
  if (data?.code || data?.otp || data?.verification_code) {
    console.log(`\n>>> [OTP CODE FROM LOGIN]: ${data.code || data.otp || data.verification_code} <<<\n`);
  }
  console.log(`========================================\n`);

  // 1. Direct token returned (e.g. requires_otp: false / exempt from OTP)
  if (data && (data.requires_otp === false || data.requiresOtp === false || typeof data.accessToken === 'string')) {
    return {
      requiresOtp: false,
      session: readSession(data),
    };
  }

  // 2. Standard flow: returned an otpSessionId
  if (data && typeof data.otpSessionId === 'string') {
    const otpSessionId = data.otpSessionId as string;
    const rememberToken =
      typeof data.rememberToken === 'string'
        ? data.rememberToken
        : typeof data.remember_token === 'string'
        ? (data.remember_token as string)
        : null;

    // Check if account is configured to skip OTP (can auto-verify with empty code)
    if (data.skip_otp === true || data.skipOtp === true || data.is_exempt === true || data.exempt === true) {
      try {
        const session = await verifyOtp({ otpSessionId, code: '' });
        return {
          requiresOtp: false,
          session,
        };
      } catch (e) {
        if (__DEV__) console.warn('[Auth API] Auto-verification for exempt account failed:', e);
      }
    }

    // Check destination on file from backend
    let destInfo: { email?: string; phone?: string } | null = null;
    try {
      destInfo = await getOtpDestination(otpSessionId);
    } catch {
      // ignore
    }

    const hasPhoneOnFile = Boolean(destInfo?.phone && destInfo.phone.trim().length > 0);
    const needsPhone = payload.channel === 'sms' && !hasPhoneOnFile && !payload.phone;

    // If user chose SMS and provided a phone number, send to resend endpoint to save phone and dispatch SMS
    if (payload.channel === 'sms' && payload.phone) {
      try {
        await resendOtp({
          otpSessionId,
          channel: 'sms',
          phone: payload.phone,
        });
      } catch (err) {
        if (__DEV__) console.warn('[Auth API] Failed to update phone via resendOtp:', err);
      }
    }

    const finalDestination =
      payload.channel === 'sms'
        ? (payload.phone || destInfo?.phone || undefined)
        : (destInfo?.email || payload.email);

    return {
      requiresOtp: true,
      otpSessionId,
      rememberToken,
      channel: payload.channel,
      destination: finalDestination,
      needsPhone,
    };
  }

  // Fallback check
  try {
    const session = readSession(data);
    return { requiresOtp: false, session };
  } catch {
    const sessionData = readOtpSession(data);
    return {
      requiresOtp: true,
      otpSessionId: sessionData.otpSessionId,
      rememberToken: sessionData.rememberToken,
      channel: payload.channel,
    };
  }
}

export async function verifyOtp(payload: VerifyOtpPayload) {
  if (__DEV__) console.log('[Auth API] Verifying OTP with payload:', payload);
  const response = await post<unknown, VerifyOtpPayload>('/patient/v1/auth/otp/verify', payload);
  if (__DEV__) console.log('[Auth API] Verify OTP response raw:', response);
  const session = readSession(payloadOf(response));
  if (__DEV__) console.log('[Auth API] Verify OTP session parsed:', session);
  return session;
}

export async function refresh(payload: RefreshPayload) {
  const response = await post<unknown, RefreshPayload>('/patient/v1/auth/refresh', payload);
  return readSession(payloadOf(response));
}

export async function getOtpDestination(otpSessionId: string): Promise<{ email?: string; phone?: string } | null> {
  try {
    const response = await apiClient.get<ApiResponse<{ email?: string; phone?: string }>>(
      `/patient/v1/auth/otp/destination?otpSessionId=${encodeURIComponent(otpSessionId)}`
    );
    return payloadOf(response.data);
  } catch (err) {
    if (__DEV__) console.warn('[Auth API] Failed to fetch OTP destination:', err);
    return null;
  }
}

export async function resendOtp(payload: { otpSessionId: string; channel: 'email' | 'sms'; phone?: string }): Promise<void> {
  const body: { otpSessionId: string; channel: string; phone?: string } = {
    otpSessionId: payload.otpSessionId,
    channel: payload.channel,
  };
  if (payload.phone) {
    body.phone = payload.phone;
  }

  console.log(`\n========================================`);
  console.log(`[OTP RESEND REQUEST] Channel: ${payload.channel.toUpperCase()}`);
  console.log(`Payload:`, body);

  const response = await post<any, typeof body>('/patient/v1/auth/otp/resend', body);

  console.log(`[OTP RESEND RESPONSE]:`, JSON.stringify(response, null, 2));
  if (response?.data?.code || response?.data?.otp || response?.data?.verification_code) {
    console.log(`\n>>> [OTP CODE RECEIVED FROM API]: ${response.data.code || response.data.otp || response.data.verification_code} <<<\n`);
  }
  console.log(`========================================\n`);
}

export async function forgotPassword(email: string): Promise<void> {
  await post<unknown, { email: string }>('/patient/v1/auth/forgot-password', { email });
}

export async function logout(payload: LogoutPayload) {
  await post<unknown, LogoutPayload>('/patient/v1/auth/logout', payload);
}


