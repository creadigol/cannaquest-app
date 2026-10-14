# Authentication Implementation Contract

This file is the implementation source of truth for the patient portal authentication flow. Future authentication work must follow these boundaries unless the API contract requires a documented change.

The first release includes:

- Login
- Sign up
- Session restoration on app launch
- Secure refresh-token persistence
- In-memory access-token handling
- Automatic access-token refresh
- Logout
- Public and authenticated route protection
- React Hook Form + Zod validation
- Axios API calls
- TanStack Query mutations

## Non-negotiable architecture decisions

1. All authentication business logic lives under `src/features/auth`.
2. Only route files live under `src/app`.
3. Authentication is restored and guarded from `src/app/_layout.tsx`, not from `src/app/index.tsx`.
4. `(auth)` and `(app)` are Expo Router route groups. They do not become URL segments.
5. Refresh tokens are stored with `expo-secure-store` through an adapter. They are never stored in AsyncStorage, query cache, or a general state store.
6. Access tokens are held in memory unless the backend contract explicitly requires persistence.
7. Login and signup are TanStack Query `useMutation` operations.
8. Axios owns HTTP concerns. Route files never call Axios directly.
9. Axios interceptors never navigate. They update auth state and let the route guard react.
10. The native splash remains visible only while the minimum session restoration check is running.

## Target file structure

```text
src/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── verify-otp.tsx
│   └── (app)/
│       ├── _layout.tsx
│       └── index.tsx
│
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── FormTextInput.tsx
│       └── ErrorMessage.tsx
│
├── features/
│   └── auth/
│       ├── api/
│       │   ├── auth.api.ts
│       │   └── auth.types.ts
│       ├── components/
│       │   ├── LoginForm.tsx
│       │   ├── SignupForm.tsx
│       │   └── OtpForm.tsx
│       ├── hooks/
│       │   ├── useLogin.ts
│       │   ├── useSignup.ts
│       │   ├── useVerifyOtp.ts
│       │   └── useLogout.ts
│       ├── schemas/
│       │   ├── login.schema.ts
│       │   └── signup.schema.ts
│       ├── auth.context.tsx
│       ├── auth.service.ts
│       └── auth.store.ts
│
├── lib/
│   ├── api/
│   │   ├── api-error.ts
│   │   ├── client.ts
│   │   └── interceptors.ts
│   ├── storage/
│   │   └── secure-token-storage.ts
│   └── query-client.ts
│
└── providers/
    └── AppProviders.tsx
```

`src/app/(app)/index.tsx` will become the authenticated home screen. The current `src/app/index.tsx` must not own session restoration. It may remain as a thin entry route only if the final navigator needs it.

## Required backend contract before coding

Before implementing `auth.api.ts`, confirm these exact backend details. Do not guess endpoint names or response fields:

```text
Login:
  method and path:                 ____________________
  request body:                    ____________________
  success response:                otpSessionId

Signup:
  method and path:                 ____________________
  request body:                    ____________________
  success response:                otpSessionId
  requires email verification:     yes / no

OTP verify:
  method and path:                 ____________________
  request body:                    ____________________
  success response:                access + refresh token pair

OTP destination:
  method and path:                 GET /auth/otp/destination
  request parameters:              ____________________
  response shape:                  ____________________

Remembered-device OTP:
  method and path:                 POST /auth/remember/otp
  request body:                    ____________________
  success response:                ____________________

Refresh:
  method and path:                 POST /auth/refresh
  request body or header:          refreshToken
  rotates refresh token:           yes
  success response:                fresh access + refresh pair

Logout:
  method and path:                 ____________________
  requires server-side revocation: yes / no

Errors:
  status for invalid credentials:  ____________________
  validation error shape:          ____________________
  expired-token status:             ____________________
```

If the backend uses cookie-based sessions instead of bearer tokens, the token/interceptor design must be revised before implementation.

## Data contracts

Create `src/features/auth/api/auth.types.ts` with the real API shapes after the backend contract is confirmed. The expected conceptual types are:

```ts
export type AuthUser = {
  id: string;
  email: string;
  // Add only fields returned by the API.
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthUser;
  tokens: AuthTokens;
};
```

The implementation must map backend field names into these client names in one place. Screens and hooks must not know whether the backend calls a field `access_token`, `accessToken`, or something else.

Use a normalized client error:

```ts
export type ApiError = {
  kind: 'validation' | 'invalid_credentials' | 'network' | 'server' | 'unknown';
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
};
```

Raw Axios errors must never be rendered directly in the UI.

## Implementation phases

### Phase 1: Install and configure dependencies

Add:

- `axios`
- `@tanstack/react-query`
- `react-hook-form`
- `zod`
- `@hookform/resolvers`
- `expo-secure-store`

Use `npx expo install expo-secure-store` for the Expo package. Use the project package manager for the remaining JavaScript libraries.

After installation:

1. Confirm versions are compatible with Expo SDK 57.
2. Add the `expo-secure-store` config plugin only if required by the selected options.
3. Do not edit `ios/` or `android/`; this project uses Continuous Native Generation.

### Phase 2: Build secure token storage

Create `src/lib/storage/secure-token-storage.ts`.

It must expose only:

```ts
getRefreshToken(): Promise<string | null>;
setRefreshToken(token: string): Promise<void>;
clearRefreshToken(): Promise<void>;
```

Use a namespaced SecureStore key such as `patient_portal.refresh_token`.

Rules:

- Never log token values.
- Handle SecureStore read/write errors.
- Clear the token on logout and failed refresh.
- Do not store the access token here unless required by the backend design.

### Phase 3: Build the Axios client

Create `src/lib/api/client.ts`.

Configure:

- API base URL from environment configuration.
- A finite request timeout.
- JSON headers.
- No hardcoded production secrets.

Create `src/lib/api/api-error.ts` with `normalizeApiError(error)`.

Create `src/lib/api/interceptors.ts` with:

1. A request interceptor that reads the in-memory access token and adds `Authorization: Bearer <token>`.
2. A response interceptor that handles one expired-token response.
3. A single shared refresh promise so concurrent `401` responses perform one refresh request.
4. A retry marker so the refresh request and retried request cannot recurse.
5. A failure path that clears the session and rejects the original request.

The interceptor must not call `router.replace()` or any other navigation API.

### Phase 4: Build the auth service and state

Create `src/features/auth/auth.service.ts`.

It owns:

- The current in-memory access token.
- Reading/writing the refresh token through SecureStore.
- Login session persistence.
- OTP-session state while login or registration is awaiting verification.
- Session restoration.
- Token refresh.
- Logout cleanup.

Create `src/features/auth/auth.store.ts` with state equivalent to:

```ts
type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
};
```

The store holds status and user data. It does not persist secret tokens.

Create `src/features/auth/auth.context.tsx` with:

- `AuthProvider`.
- `useAuth()` hook.
- A one-time startup restoration effect.
- `signIn`, `signUp`, `signOut`, and `restoreSession` actions as appropriate.

Session restoration behavior:

```text
status = booting
read refresh token
if no refresh token:
  status = unauthenticated
if refresh token exists:
  call POST /auth/refresh
  success -> replace access + refresh pair, set authenticated
  failure -> clear refresh token, unauthenticated
```

Expected authentication failures should not leave the app stuck in `booting`.

### Phase 5: Add providers and startup splash control

Create `src/lib/query-client.ts` with a configured `QueryClient`.

Create `src/providers/AppProviders.tsx` and mount providers in this order:

```text
QueryClientProvider
  AuthProvider
    app routes
```

Update `src/app/_layout.tsx`:

1. Call `SplashScreen.preventAutoHideAsync()` at module scope.
2. Render `AppProviders` around the router stack.
3. Read `auth.status` from `useAuth()`.
4. Keep route content minimal while status is `booting`.
5. Hide the native splash only after status becomes authenticated or unauthenticated.
6. Configure public and authenticated groups with `Stack.Protected`.

Do not wait for arbitrary home-screen data before hiding the splash. The splash waits only for the auth decision.

### Phase 6: Create the route groups

Create `src/app/(auth)/_layout.tsx` with a stack for login and signup.

Create:

- `src/app/(auth)/login.tsx`
- `src/app/(auth)/signup.tsx`
- `src/app/(auth)/verify-otp.tsx`

These screens compose feature forms. They do not call Axios directly and do not read SecureStore directly.

Login and signup navigate to `verify-otp.tsx` after the API returns an `otpSessionId`. The OTP screen submits the verification code and does not mark the session authenticated itself; the auth mutation/service does that after receiving the token pair.

Create `src/app/(app)/_layout.tsx` for the authenticated navigator.

Move the authenticated home into `src/app/(app)/index.tsx`.

The root layout controls access:

```text
authenticated   -> (app) available, (auth) unavailable
unauthenticated -> (auth) available, (app) unavailable
booting         -> keep native splash visible
```

### Phase 7: Add schemas and form components

Create `src/features/auth/schemas/login.schema.ts`.

It must validate the actual login contract, initially expected to include:

- Required email.
- Valid email format.
- Required password.
- Backend-compatible password constraints.

Create `src/features/auth/schemas/signup.schema.ts`.

It must validate the actual signup contract, including only fields required by the backend. If signup includes password confirmation, validate it with a cross-field refinement.

Create `src/features/auth/schemas/otp.schema.ts` for the OTP code and session fields. Enforce the backend-confirmed code length and format.

Create `src/features/auth/components/LoginForm.tsx`, `SignupForm.tsx`, and `OtpForm.tsx`.

Each form must:

1. Use `useForm` with the corresponding Zod resolver.
2. Use controlled field components only where required; prefer React Hook Form field registration patterns.
3. Disable submission while the mutation is pending.
4. Display field-level validation errors.
5. Display normalized server errors.
6. Never log passwords or tokens.
7. Call the feature hook, not Axios directly.

### Phase 8: Add TanStack Query mutations

Create `src/features/auth/api/auth.api.ts` with functions for:

```text
login(payload)
signup(payload)
verifyOtp(payload)
getOtpDestination(params)
rememberOtp(payload)
forgotPassword(payload)
resetPassword(payload)
resendOtp(payload)
refresh(refreshToken)
logout()
```

These functions call the configured Axios client and map the backend response to the client types.

Create:

- `src/features/auth/hooks/useLogin.ts`
- `src/features/auth/hooks/useSignup.ts`
- `src/features/auth/hooks/useVerifyOtp.ts`
- `src/features/auth/hooks/useLogout.ts`

Each hook uses `useMutation`.

On successful login/signup request:

1. Normalize the response.
2. Store the returned `otpSessionId` in temporary auth-flow state.
3. Navigate to the OTP verification screen.
4. Do not mark the user authenticated and do not store tokens yet.

On successful OTP verification or remembered-device OTP:

1. Normalize the token response.
2. Save the refresh token securely.
3. Set the access token in memory.
4. Set the user and authenticated status.
5. Clear temporary OTP-session state and stale auth errors.
6. Invalidate or reset private TanStack Query cache data as appropriate.

On logout:

1. Attempt server logout if the contract requires it.
2. Always clear the local refresh token.
3. Clear the in-memory access token.
4. Reset private TanStack Query cache data.
5. Set status to unauthenticated.

Login, signup, OTP, and refresh must not use automatic retries. Refresh must never retry itself through the same Axios interceptor.

## Navigation behavior

### Fresh install

```text
launch -> native splash -> booting -> no token -> unauthenticated -> login
```

### Login or registration

```text
credentials -> login/register -> otpSessionId -> verify-otp -> token pair -> authenticated -> app home
```

### Existing valid session

```text
launch -> native splash -> booting -> refresh succeeds -> authenticated -> app home
```

### Existing expired/invalid session

```text
launch -> native splash -> booting -> refresh fails -> clear token -> login
```

### Expired access token during API request

```text
request -> 401 -> single refresh -> retry original request once
                         |
                         failed -> clear session -> protected route redirects to login
```

After successful login, use replacement navigation or protected-route state so the user cannot press back and return to the login screen.

## Required tests before completion

- Fresh install opens login after the splash.
- Existing valid refresh token opens the app without a login flash.
- Invalid refresh token is deleted and opens login.
- Login and registration keep the user in the OTP flow until verification succeeds.
- OTP verification is the only initial sign-in step that establishes the token pair.
- Access token is attached to authenticated requests.
- One `401` refreshes and retries the original request once.
- Five simultaneous `401` responses share one refresh request.
- Failed refresh logs the user out.
- Refresh requests cannot recursively trigger refresh.
- Logout clears SecureStore, memory, and private query data.
- Login and signup buttons cannot be double-submitted.
- Client and server validation errors render correctly.
- Passwords, access tokens, and refresh tokens never appear in logs.
- Android and iOS behave the same after cold launch and foreground resume.
- Deep links cannot open protected screens while unauthenticated.
- Back navigation cannot return to login after successful authentication.

## Implementation completion criteria

Authentication is complete only when:

1. The backend contract fields are filled in and implemented without guessed names.
2. All files in the target structure exist with the stated responsibilities.
3. `npx expo lint` passes.
4. `npx tsc --noEmit` passes.
5. Android and iOS development builds pass the required navigation and session tests.
6. A production-like build has been tested for native splash, secure storage, and token refresh behavior.

This document deliberately keeps the auth state machine, API client, route protection, and form logic separate. That separation is required for the app to grow into patient profiles, appointments, prescriptions, notifications, and role-based access without making the route files unmaintainable.
