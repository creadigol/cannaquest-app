# Authentication API Catalog

This file contains the authentication endpoints used by the patient portal. It is referenced by `auth.md` and is the API source of truth for the auth implementation.

All endpoint examples below use `POST` because they submit credentials or authentication state. Confirm the HTTP method with the backend before implementation if the API documentation specifies otherwise.

## Shared response envelope

The API uses a common response shape:

```ts
export type ApiResponse<T> = {
  success: boolean;
  statusCode: number;
  data: T | null;
  message?: string;
  correlationId: string;
};
```

The client must preserve `correlationId` for diagnostics but must not expose it as the primary patient-facing error message. Use the API `message` for a general error and map field errors separately when the backend provides them.

## Shared client types

These are the initial client-side types. They must be updated if the backend returns additional fields or uses a different success shape.

```ts
export type AuthChannel = 'email' | 'phone';

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
};

export type VerifyOtpPayload = {
  otpSessionId: string;
  code: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  token: string;
  password: string;
};

export type ResendOtpPayload = {
  otpSessionId: string;
  channel: AuthChannel;
};

export type LogoutPayload = {
  refreshToken: string;
};

export type OtpSessionData = {
  otpSessionId: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type TokenResponse = ApiResponse<TokenPair>;

export type ForgotPasswordData = {
  message: string;
};

export type LogoutData = {
  signedOut: boolean;
};
```

Registration and login return an `otpSessionId`; they do not issue tokens directly. `/otp/verify` is the token-issuing endpoint. The exact successful response field names still need to be confirmed from the API documentation or a successful response. Do not invent user or token fields.

## 1. Register

### Endpoint

```text
POST https://patient.cannaquest.com.au/patient/v1/auth/register
```

### Request payload

```json
{
  "firstName": "kira",
  "lastName": "106",
  "email": "kiras1065775@gmail.com",
  "phone": "0412 345 678",
  "password": "<password>"
}
```

TypeScript type:

```ts
export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};
```

### Supplied error response

```json
{
  "success": false,
  "statusCode": 409,
  "data": null,
  "message": "An account with this email already exists.",
  "correlationId": "0088fd26-d339-4026-a44f-f29c53f056d8"
}
```

Client behavior:

- Map `409` to an account-exists or registration-conflict error.
- Display the message as a general form error unless the backend identifies a specific field.
- Do not treat this as a network failure.
- On success, retain the returned `otpSessionId` and navigate to OTP verification. Do not store tokens at registration time.

## 2. Login

### Endpoint

```text
POST https://patient.cannaquest.com.au/patient/v1/auth/login
```

### Request payload

```json
{
  "email": "kiras1065775@gmail.com",
  "password": "<password>",
  "channel": "email",
  "remember": true
}
```

TypeScript type:

```ts
export type LoginPayload = {
  email: string;
  password: string;
  channel: 'email' | 'phone';
  remember: boolean;
};
```

### Supplied error response

```json
{
  "success": false,
  "statusCode": 401,
  "data": null,
  "message": "Invalid credentials.",
  "correlationId": "45bd9492-bd2d-4cf6-82be-838614e0b476"
}
```

Client behavior:

- Map `401` to `invalid_credentials`.
- Display a safe general error; do not reveal whether the email or password was incorrect.
- Do not retry automatically.
- On success, retain the returned `otpSessionId` and navigate to OTP verification. This endpoint does not issue tokens directly.

## 3. Verify OTP

### Endpoint

```text
POST https://patient.cannaquest.com.au/patient/v1/auth/otp/verify
```

### Request payload

```json
{
  "otpSessionId": "<otp-session-id>",
  "code": "811218"
}
```

TypeScript type:

```ts
export type VerifyOtpPayload = {
  otpSessionId: string;
  code: string;
};
```

### Supplied error response

```json
{
  "success": false,
  "statusCode": 422,
  "data": null,
  "message": "This sign-in has expired. Please start again.",
  "correlationId": "bb5205b0-79f0-4c98-8a07-4b3a806df13a"
}
```

Client behavior:

- Map `422` to an expired or invalid OTP flow.
- Return the patient to the beginning of the relevant authentication flow when the session has expired.
- Never log the OTP code.
- On successful verification, this is the endpoint that issues the access/refresh token pair. Save the refresh token with SecureStore and keep the access token in memory.

## 4. OTP destination

### Endpoint

```text
GET https://patient.cannaquest.com.au/patient/v1/auth/otp/destination
```

The API documentation describes this endpoint as returning the full email and phone destination where the OTP was sent, so the client can display the exact destination to the patient.

The request parameters and response shape were not included in the supplied examples. Confirm whether it receives `otpSessionId` as a query parameter or another request value before implementation.

Conceptual response type:

```ts
export type OtpDestinationData = {
  email?: string;
  phone?: string;
};
```

Do not expose more contact information than the backend intends. Prefer the backend-provided destination over client-side reconstruction.

## 5. Remembered-device OTP

### Endpoint

```text
POST https://patient.cannaquest.com.au/patient/v1/auth/remember/otp
```

The API documentation describes this endpoint as signing in from a remembered device using a code only, without email or password.

The exact request field names and response shape were not included in the supplied examples. Confirm whether the payload is an OTP code plus a remembered-device identifier, and whether successful response data is the same token pair returned by `/otp/verify`.

Conceptual request type:

```ts
export type RememberedOtpPayload = {
  code: string;
  // Add the backend's remembered-device identifier when confirmed.
};
```

This endpoint must receive the same token-handling treatment as OTP verification if it returns tokens.

## 6. Forgot password

### Endpoint

```text
POST https://patient.cannaquest.com.au/patient/v1/auth/forgot-password
```

### Request payload

```json
{
  "email": "kiras1065775@gmail.com"
}
```

TypeScript type:

```ts
export type ForgotPasswordPayload = {
  email: string;
};
```

### Supplied success response

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "If an account exists for this email, a reset link has been sent."
  },
  "correlationId": "edd72f8f-64e4-43c8-84a3-7bd1044e7db7"
}
```

Response type:

```ts
export type ForgotPasswordData = {
  message: string;
};

export type ForgotPasswordResponse = ApiResponse<ForgotPasswordData>;
```

Client behavior:

- Always show the neutral backend message.
- Do not disclose whether the email belongs to an account.
- Treat the request as successful only when `success === true` and the status is in the 2xx range.

## 7. Reset password

### Endpoint

```text
POST https://patient.cannaquest.com.au/patient/v1/auth/reset-password
```

### Request payload

```json
{
  "email": "kiras1065775@gmail.com",
  "token": "<reset-token>",
  "password": "<new-password>"
}
```

TypeScript type:

```ts
export type ResetPasswordPayload = {
  email: string;
  token: string;
  password: string;
};
```

### Supplied error response

```json
{
  "success": false,
  "statusCode": 422,
  "data": null,
  "message": "Invalid or expired reset link.",
  "correlationId": "1540acf5-efa1-489e-ab27-b9b025b1d9e4"
}
```

Client behavior:

- Map `422` to an invalid or expired reset-link error.
- Do not retain the reset token after the request finishes.
- Require the patient to request a new reset link when the token is invalid.
- Never log the reset token or new password.

## 8. Resend OTP

### Endpoint

```text
POST https://patient.cannaquest.com.au/patient/v1/auth/otp/resend
```

### Request payload

```json
{
  "otpSessionId": "<otp-session-id>",
  "channel": "email"
}
```

TypeScript type:

```ts
export type ResendOtpPayload = {
  otpSessionId: string;
  channel: 'email' | 'phone';
};
```

### Supplied error response

```json
{
  "success": false,
  "statusCode": 422,
  "data": null,
  "message": "This sign-in has expired. Please start again.",
  "correlationId": "c5b4a3e6-f8bd-4198-907c-4c6b1c600003"
}
```

Client behavior:

- Disable the resend action while the request is pending.
- Add a client-side cooldown to prevent accidental repeated requests.
- If the session is expired, return to the start of the relevant auth flow.

## 9. Refresh tokens

### Endpoint

```text
POST https://patient.cannaquest.com.au/patient/v1/auth/refresh
```

The API documentation describes this endpoint as trading a refresh token for a fresh access-token and refresh-token pair. This is refresh-token rotation.

### Request payload

The exact request shape was not visible in the supplied screenshot. The current implementation assumption is:

```json
{
  "refreshToken": "<refresh-token>"
}
```

TypeScript assumption pending backend confirmation:

```ts
export type RefreshPayload = {
  refreshToken: string;
};
```

### Expected response contract

The exact successful response was not supplied. It is expected to contain a new access/refresh pair:

```ts
export type RefreshResponse = ApiResponse<{
  accessToken: string;
  refreshToken: string;
}>;
```

The implementation must confirm the actual envelope and field names before coding.

Client behavior:

1. Read the current refresh token from SecureStore.
2. Send it to `/auth/refresh` without going through the authenticated request interceptor.
3. On success, replace both the in-memory access token and the stored refresh token.
4. Resolve all requests waiting on the shared refresh promise.
5. On failure, clear SecureStore and the in-memory access token, then mark the session unauthenticated.
6. Never retry the refresh request through the refresh interceptor.

Because the API rotates the refresh token, retaining the old refresh token after a successful refresh can invalidate the next session restoration.

## 10. Logout

### Endpoint

```text
POST https://patient.cannaquest.com.au/patient/v1/auth/logout
```

### Request payload

```json
{
  "refreshToken": "<refresh-token>"
}
```

TypeScript type:

```ts
export type LogoutPayload = {
  refreshToken: string;
};
```

### Supplied success response

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "signedOut": true
  },
  "correlationId": "760a6189-225a-4683-a225-c154967c7ac6"
}
```

Response type:

```ts
export type LogoutData = {
  signedOut: boolean;
};

export type LogoutResponse = ApiResponse<LogoutData>;
```

Client behavior:

1. Read the refresh token from SecureStore.
2. Attempt the server logout request when a token exists.
3. Clear SecureStore whether the server request succeeds or fails.
4. Clear the in-memory access token.
5. Clear private TanStack Query cache data.
6. Set the auth state to `unauthenticated`.

A network failure during logout must not leave the local user signed in.

## Endpoint-to-file mapping

```text
src/features/auth/api/auth.api.ts
  register(payload)
  login(payload)
  verifyOtp(payload)
  getOtpDestination(params)
  rememberOtp(payload)
  forgotPassword(payload)
  resetPassword(payload)
  resendOtp(payload)
  refresh(payload)
  logout(payload)

src/features/auth/hooks/
  useSignup.ts         # Signup request -> OTP session
  useLogin.ts
  useVerifyOtp.ts      # Add when OTP UI is implemented
  useOtpDestination.ts # Add when OTP UI is implemented
  useRememberOtp.ts    # Add when remembered-device login is implemented
  useForgotPassword.ts # Add when forgot-password UI is implemented
  useResetPassword.ts  # Add when reset-password UI is implemented
  useResendOtp.ts      # Add when OTP UI is implemented
  useRefreshSession.ts # Service/interceptor flow, not a screen mutation
  useLogout.ts
```

The first UI milestone may implement only register and login, but the API module should keep endpoint functions independent so OTP and password-reset flows can be added without changing the Axios client or auth provider.

## Open API questions

The following must be answered before the corresponding production implementation:

- What are the successful response shapes for register and login?
- What are the exact successful response shapes for registration and login's `otpSessionId` response?
- What are the exact request parameters and response shape for OTP destination?
- What are the exact payload and response for remembered-device OTP?
- What are the exact refresh request field and successful response field names?
- Does `remember` control refresh-token issuance or only server session lifetime?
- Are `channel` values limited to `email`, or can they include `phone`?
- What are the exact password and phone validation rules?
- Does logout require the refresh token in the body or an Authorization header?

Until these answers are confirmed, the client must not invent response field names or token-flow transitions. The confirmed flow is: login/register -> OTP session -> OTP verification -> token pair -> refresh rotation.
