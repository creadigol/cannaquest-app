# Patient Portal Mobile App Overview

This document is the onboarding and implementation guide for the CannaQuest Patient Portal mobile application. It is intended for the project team and for future coding agents, including Codex and other LLM-based agents.

The application is a cross-platform mobile patient portal for Android and iOS. It uses the existing CannaQuest Patient API; the mobile app is responsible for the frontend, navigation, authentication experience, local session handling, and future patient-facing features.

## 1. Technology stack

### Application framework

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript with strict mode enabled
- Expo Router for file-based navigation
- Continuous Native Generation (CNG)
- Hermes/New Architecture support provided by the Expo project setup

This is an Expo development-build project, not an Expo Go-only project. Expo Go can be used only when all required native modules are included in Expo Go. This app uses `expo-secure-store`, so a development build is the expected development environment.

### Core libraries

- `expo-router` - navigation and route protection
- `axios` - HTTP requests to the backend API
- `@tanstack/react-query` - request mutations, server-state coordination, and cache management
- `react-hook-form` - form state and submission handling
- `zod` - client-side validation schemas
- `@hookform/resolvers` - connects Zod schemas to React Hook Form
- `expo-secure-store` - encrypted native storage for refresh tokens
- `expo-splash-screen` - native splash-screen control
- `expo-dev-client` - custom development builds

### Development tools

- ESLint with `eslint-config-expo`
- TypeScript compiler
- npm and `package-lock.json`
- EAS Build for cloud Android/iOS builds

This repository does not currently contain `bun.lock`, so use `npm` and `npx` commands. Do not introduce Bun commands unless the package manager is intentionally migrated.

## 2. Current project identity and configuration

Important configuration files:

| File | Responsibility |
| --- | --- |
| `package.json` | Dependencies, scripts, and project metadata |
| `package-lock.json` | npm dependency lockfile |
| `app.json` | Expo app identity, icons, splash screen, plugins, and platform configuration |
| `eas.json` | EAS development, preview, and production build profiles |
| `tsconfig.json` | Strict TypeScript configuration and `@/*` path alias |
| `eslint.config.js` | ESLint configuration |
| `AGENTS.md` | Required instructions for coding agents |
| `apps-readme/auth-md/auth.md` | Authentication implementation contract |
| `apps-readme/auth-md/auth-api.md` | Authentication API catalog and response examples |

Current Expo app values include:

- App name: `pateint-app`
- Slug: `pateint-app`
- Android package: `com.kiras106.pateintapp`
- Deep-link scheme: `pateintapp`
- API base URL: `EXPO_PUBLIC_API_URL`, with the current production API as the fallback
- Branding assets: `assets/logos/app-logo.png` and `assets/logos/splash-logo.png`

The spelling `pateint-app` is part of the existing project identity. Do not rename it casually because package names, EAS configuration, imports, and build metadata may depend on it.

## 3. Repository structure

```text
.
├── AGENTS.md
├── app.json
├── eas.json
├── package.json
├── package-lock.json
├── tsconfig.json
├── overview.md
├── apps-readme/
│   ├── Tech_Stack_React_Native_App.md
│   └── auth-md/
│       ├── auth.md
│       └── auth-api.md
├── assets/
│   └── logos/
│       ├── app-logo.png
│       └── splash-logo.png
└── src/
    ├── app/
    │   ├── _layout.tsx
    │   ├── (auth)/
    │   │   ├── _layout.tsx
    │   │   ├── login.tsx
    │   │   ├── signup.tsx
    │   │   └── verify-otp.tsx
    │   └── (app)/
    │       ├── _layout.tsx
    │       └── index.tsx
    ├── components/
    │   └── ui/
    │       ├── Button.tsx
    │       ├── CheckboxRow.tsx
    │       ├── ErrorMessage.tsx
    │       └── FormTextInput.tsx
    ├── features/
    │   └── auth/
    │       ├── api/
    │       │   ├── auth.api.ts
    │       │   └── auth.types.ts
    │       ├── components/
    │       │   ├── AuthScreen.tsx
    │       │   ├── LoginForm.tsx
    │       │   ├── OtpForm.tsx
    │       │   └── SignupForm.tsx
    │       ├── hooks/
    │       │   ├── useLogin.ts
    │       │   ├── useLogout.ts
    │       │   ├── useSignup.ts
    │       │   └── useVerifyOtp.ts
    │       ├── schemas/
    │       │   ├── login.schema.ts
    │       │   ├── otp.schema.ts
    │       │   └── signup.schema.ts
    │       ├── auth.context.tsx
    │       ├── auth.service.ts
    │       └── auth.store.ts
    ├── lib/
    │   ├── api/
    │   │   ├── api-error.ts
    │   │   ├── client.ts
    │   │   └── interceptors.ts
    │   ├── query-client.ts
    │   └── storage/
    │       └── secure-token-storage.ts
    └── providers/
        └── AppProviders.tsx
```

## 4. Architecture rules

These boundaries must remain in place as the app grows.

1. `src/app/` contains route screens and route layouts only.
2. Feature-specific business logic belongs under `src/features/<feature>/`.
3. Shared UI belongs under `src/components/ui/`.
4. Shared infrastructure belongs under `src/lib/`.
5. Providers are composed in `src/providers/`.
6. Route screens must not call Axios directly.
7. Route screens must not read or write SecureStore directly.
8. API request functions belong in a feature's `api/` directory.
9. TanStack Query hooks belong in a feature's `hooks/` directory.
10. Zod schemas belong in a feature's `schemas/` directory.
11. Authentication state and auth orchestration belong under `src/features/auth/`.
12. New patient features should follow the same feature-first structure, for example `src/features/profile/`, `src/features/questionnaire/`, or `src/features/orders/`.
13. Do not create or edit `ios/` or `android/` manually. They are generated native projects under Expo CNG.
14. Do not move authentication checks into `src/app/index.tsx`. The root layout owns startup restoration and route protection.

## 5. Routing and authentication orchestration

`src/app/_layout.tsx` is the top-level orchestrator. It mounts providers, restores the existing session, controls the native splash screen, and protects the `(auth)` and `(app)` route groups.

The route groups are:

- `(auth)` - login, signup, and OTP verification
- `(app)` - authenticated patient experience

The groups are organizational route groups and do not become URL segments.

The intended state machine is:

```text
app launch
  └── booting + native splash visible
        ├── no refresh token       -> unauthenticated -> (auth)
        ├── valid refresh token    -> authenticated   -> (app)
        └── failed refresh         -> clear session   -> unauthenticated -> (auth)
```

The initial authentication flow is:

```text
login/register
  -> otpSessionId
  -> verify OTP
  -> access token + refresh token
  -> authenticated state
  -> patient app
```

The backend is expected to return `otpSessionId` for both login and registration. The current registration API response still needs to be aligned by the backend developer; the frontend intentionally follows the `otpSessionId` contract.

## 6. Authentication responsibilities by file

### `src/features/auth/api/auth.api.ts`

Contains the auth endpoint functions and maps backend responses into client-side types. It is the only auth layer that should call the Axios client.

### `src/features/auth/api/auth.types.ts`

Contains request and normalized response types. Backend field-name differences must be mapped here or in the API module, not spread through UI code.

### `src/features/auth/auth.service.ts`

Owns the access-token memory value, refresh-token persistence, session restoration, OTP completion, refresh, logout, and cleanup.

### `src/features/auth/auth.context.tsx`

Exposes auth state and actions to the app. It runs the startup restoration flow and configures the auth interceptor handlers.

### `src/features/auth/auth.store.ts`

Stores non-secret auth state such as `booting`, `authenticated`, `unauthenticated`, user data, and pending OTP flow data. Secret tokens do not belong in this store.

### `src/lib/storage/secure-token-storage.ts`

Stores only the refresh token through `expo-secure-store`. Never log tokens or store them in AsyncStorage, React state, query cache, or route params.

### `src/lib/api/client.ts`

Creates the shared Axios client, including the base URL, JSON headers, and timeout.

### `src/lib/api/interceptors.ts`

Adds the in-memory access token to protected requests and handles one shared refresh operation for concurrent expired-token responses. It must not navigate.

### `src/lib/api/api-error.ts`

Normalizes transport and backend errors while preserving the backend message, HTTP status, response body, and correlation ID for diagnostics.

## 7. API and environment configuration

The API base URL is configured as:

```ts
process.env.EXPO_PUBLIC_API_URL
```

The current client has a production fallback in `src/lib/api/client.ts`. For local or staging work, use an environment value such as:

```text
EXPO_PUBLIC_API_URL=https://patient.cannaquest.com.au
```

Expo public environment variables are bundled into the app and are not secrets. Only place values there that are safe to expose to a mobile client, such as a public API base URL or public feature flag.

Never put these in the mobile app or an `EXPO_PUBLIC_` variable:

- Database passwords
- Stripe secret keys
- Backend admin tokens
- Private API keys
- OpenAI secret keys
- Any credential that grants privileged backend access

Those secrets belong on the backend server. The mobile app should call a backend endpoint that performs privileged server-side work.

## 8. Authentication API source of truth

Read these documents before changing auth code:

- [`apps-readme/auth-md/auth.md`](apps-readme/auth-md/auth.md) - implementation contract and architecture decisions
- [`apps-readme/auth-md/auth-api.md`](apps-readme/auth-md/auth-api.md) - endpoint paths, payloads, response examples, and open API questions

Current confirmed auth endpoints include:

```text
POST /patient/v1/auth/register
POST /patient/v1/auth/login
POST /patient/v1/auth/otp/verify
POST /patient/v1/auth/otp/resend
POST /patient/v1/auth/forgot-password
POST /patient/v1/auth/reset-password
POST /patient/v1/auth/refresh
POST /patient/v1/auth/logout
```

The login and registration requests begin an OTP flow. Token persistence starts only after successful OTP verification. The refresh endpoint rotates the access/refresh pair, so both values must be replaced after refresh.

Before implementing an endpoint whose successful response is not documented, confirm the response with the backend or API documentation. Do not invent response field names.

## 9. Development commands

### Install dependencies

```bash
npm install
```

### Start the Expo development server

```bash
npx expo start
```

Useful server options:

```bash
npx expo start --clear
npx expo start --android
npx expo start --ios
npx expo start --web
```

Use `--clear` when Metro has stale JavaScript or asset cache. A JavaScript-only change normally requires a reload or Metro restart, not a new native build.

### Run checks

```bash
npx expo lint
npx tsc --noEmit
npx expo-doctor
```

Run lint and typecheck before considering a change complete. Run Expo Doctor when dependencies, app configuration, or native modules change.

### Install Expo-compatible packages

For Expo packages, always use:

```bash
npx expo install <package-name>
```

This selects a version compatible with the installed Expo SDK. Do not use `npm install` for Expo-native packages when `expo install` is available.

For ordinary JavaScript-only libraries, use npm and commit the updated `package.json` and `package-lock.json`.

## 10. Local native development builds

Use a development build when a package includes native code that is not available in Expo Go, especially `expo-secure-store` in this project.

### Android local build

```bash
npx expo run:android
```

### iOS local build

```bash
npx expo run:ios
```

These commands may generate `android/` or `ios/` through Expo prebuild. Do not manually edit generated native files. Change native behavior through `app.json`, Expo config plugins, or supported package configuration.

Local native builds require the relevant local toolchain. Android requires Android Studio/SDK and an emulator or device. iOS requires macOS with Xcode and a simulator or device.

## 11. EAS cloud builds

The project has three EAS build profiles in `eas.json`:

- `development` - development client and internal distribution
- `preview` - internal distribution build for testing
- `production` - store/release build with automatic version incrementing

Use the local EAS CLI through `npx` because this project uses npm:

### Authenticate with EAS

```bash
npx eas-cli@latest login
```

### Check project configuration

```bash
npx eas-cli@latest whoami
npx eas-cli@latest project:info
```

### Development build

```bash
npx eas-cli@latest build --profile development
```

Build a specific platform:

```bash
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
```

Install the resulting development build on the device, then start the bundler with:

```bash
npx expo start --dev-client
```

### Preview/internal testing build

```bash
npx eas-cli@latest build --profile preview
```

### Production build

```bash
npx eas-cli@latest build --profile production
```

Build one production platform:

```bash
npx eas-cli@latest build --profile production --platform android
npx eas-cli@latest build --profile production --platform ios
```

### Build status and artifacts

```bash
npx eas-cli@latest build:list
npx eas-cli@latest build:view <BUILD_ID>
```

Do not use a development build as the production store artifact. Development builds include development-client behavior and are intended for engineering/testing.

## 12. EAS submission and updates

After store credentials and app-store metadata are configured:

```bash
npx eas-cli@latest submit --platform android
npx eas-cli@latest submit --platform ios
```

For JavaScript-only over-the-air updates, after the project has been configured for EAS Update:

```bash
npx eas-cli@latest update --branch production --message "Describe the change"
```

OTA updates cannot replace native changes. A new development or production build is required after native dependencies, config plugins, permissions, icons, splash configuration, package identifiers, or other native settings change.

## 13. When a rebuild is required

### Usually no native rebuild required

- React components
- TypeScript logic
- React Hook Form schemas
- Zod validation
- Axios request logic
- TanStack Query hooks
- Expo Router route logic
- Styling and layout

Reload Metro or restart with `npx expo start --clear`.

### Native rebuild required

- Adding or removing a native module
- Changing `app.json` plugins
- Changing app icon or splash configuration
- Changing Android package or iOS bundle identity
- Changing native permissions
- Changing native configuration or config plugins
- Updating a dependency that changes native code

Use `npx expo run:android`, `npx expo run:ios`, or an EAS development build as appropriate.

## 14. Rules for future developers and coding agents

Before editing:

1. Read `AGENTS.md`.
2. Read this file.
3. Read the relevant feature documentation, especially the auth documents for auth work.
4. Inspect the current implementation instead of assuming the documentation and code are identical.
5. Check the installed Expo major version before using an Expo or React Native API.
6. Consult the matching Expo documentation and the Expo documentation index before adding or changing Expo APIs.

While editing:

1. Preserve the feature-first structure.
2. Keep route files thin.
3. Keep API calls out of screens and UI components.
4. Do not put secrets in the app bundle.
5. Never log passwords, OTP codes, access tokens, refresh tokens, or reset tokens.
6. Preserve backend error messages and correlation IDs for diagnostics without exposing sensitive response data to patients.
7. Do not silently change the API contract. Document backend mismatches and confirm them.
8. Do not add a dependency when an existing Expo or project dependency solves the problem.
9. Use `npx expo install` for Expo-compatible native packages.
10. Do not edit generated `ios/` or `android/` files manually.
11. Do not remove existing user work or unrelated changes.

After editing:

```bash
npx tsc --noEmit
npx expo lint
```

For changes involving dependencies, app configuration, routing, or native behavior, also run:

```bash
npx expo-doctor
```

## 15. Recommended feature structure for future work

Use this structure when adding a new patient-facing feature:

```text
src/features/<feature-name>/
├── api/
│   ├── <feature>.api.ts
│   └── <feature>.types.ts
├── components/
├── hooks/
├── schemas/
├── <feature>.context.tsx       # only if feature-wide state is needed
├── <feature>.service.ts        # only if business orchestration is needed
└── <feature>.store.ts          # only for non-secret client state
```

Then create only the required route files under `src/app/`. For example, questionnaire screens should live under the route tree while questionnaire API and state logic remain under `src/features/questionnaire/`.

## 16. Current scope and next feature boundary

The current implementation focuses on:

- Branded app icon and native splash screen
- Login
- Registration UI
- OTP verification UI
- Secure refresh-token storage
- Session restoration
- Access-token refresh
- Logout
- Protected route groups

The questionnaire is intentionally a later feature. It comes after authentication and should be implemented under its own feature folder without mixing its API, schemas, and state into the auth feature.

The authentication source-of-truth documents remain:

- `apps-readme/auth-md/auth.md`
- `apps-readme/auth-md/auth-api.md`

Update those documents when the backend contract changes, then update the implementation to match them.

## 17. Official references

- [Expo documentation](https://docs.expo.dev/)
- [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/)
- [Expo documentation index for agents](https://docs.expo.dev/llms.txt)
- [Expo Router introduction](https://docs.expo.dev/router/introduction.md)
- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction.md)
- [Expo app icon and splash screen](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon.md)
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables.md)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Expo Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Expo SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/)
- [Expo Router protected routes](https://docs.expo.dev/router/advanced/protected/)
- [React Native documentation](https://reactnative.dev/docs/getting-started)
- [Axios documentation](https://axios-http.com/docs/intro)
- [TanStack Query React documentation](https://tanstack.com/query/latest/docs/framework/react/overview)
- [React Hook Form documentation](https://react-hook-form.com/)
- [Zod documentation](https://zod.dev/)

