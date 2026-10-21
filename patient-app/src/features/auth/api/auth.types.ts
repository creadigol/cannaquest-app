export type AuthChannel = 'email' | 'sms';

export type ApiResponse<T> = {
  success: boolean;
  statusCode: number;
  data: T | null;
  message?: string;
  correlationId: string;
};

export type AuthUser = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
  channel: AuthChannel;
  remember: boolean;
  phone?: string;
};

export type ResendOtpPayload = {
  otpSessionId: string;
  channel: AuthChannel;
  phone?: string;
};

export type VerifyOtpPayload = {
  otpSessionId: string;
  code?: string;
};

export type OtpSessionData = {
  otpSessionId: string;
  rememberToken?: string | null;
};

export type OtpDestinationData = {
  email?: string;
  phone?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = AuthTokens & {
  user: AuthUser | null;
};

export type RefreshPayload = {
  refreshToken: string;
};

export type LogoutPayload = {
  refreshToken: string;
};

export type LoginResult =
  | {
      requiresOtp: true;
      otpSessionId: string;
      rememberToken?: string | null;
      channel: AuthChannel;
      destination?: string;
      needsPhone?: boolean;
    }
  | {
      requiresOtp: false;
      session: AuthSession;
    };
