# Final Tech Stack: React Native Client App

*Mobile app (Android + iOS) that consumes an existing backend API. Backend, database, and payments already exist; this document covers only the client side.*

## 1. Project Overview

- **Goal:** Build a cross-platform mobile app that calls the client's existing API.
- **Platforms:** Android and iOS from a single codebase.
- **Scope of our work:** UI, navigation, API integration, authentication, form validation, payment flow integration, and store release.
- **Not in scope:** Backend and database development (already built).

## 2. Stack at a Glance

| # | Technology | Purpose |
|---|---|---|
| 1 | React Native + Expo | Build the app for Android and iOS from one codebase |
| 2 | TypeScript | Type safety and fewer bugs |
| 3 | Expo Router | File-based navigation between screens |
| 4 | axios | Sends HTTP requests to the existing API |
| 5 | TanStack Query | Manages server data (loading, errors, caching, refetching) |
| 6 | Zustand | Manages client-only state (auth, cart, UI preferences) |
| 7 | Zod | Defines validation rules for signup and login |
| 8 | React Hook Form | Handles form inputs, errors, and submission |
| 9 | expo-secure-store | Securely stores the auth token on the device |
| 10 | Payment SDK or WebView | Connects to the existing payment flow |

## 3. Details and Purpose of Each Tool

### 3.1 React Native with Expo
- **Purpose:** The core framework. Lets us write one JavaScript/TypeScript codebase that runs natively on both Android and iOS.
- **Why Expo:** Removes the difficult native setup (Xcode, Android Studio, Gradle). It is the officially recommended way to start React Native projects.
- **Includes:** Expo Go for quick testing, development builds for custom native libraries, and EAS for building and publishing.

### 3.2 TypeScript
- **Purpose:** Adds types to JavaScript so mistakes are caught while coding, not after release.
- **Used for:** API response shapes, component props, form data, and navigation params.

### 3.3 Expo Router
- **Purpose:** File-based routing. Files inside the `app/` folder automatically become screens.
- **Used for:** Stack and tab navigation, dynamic screens (for example `product/[id].tsx`), and route groups such as `(auth)` and `(app)` to separate logged-out and logged-in areas.

### 3.4 axios
- **Purpose:** The HTTP client that actually sends requests to the backend.
- **Used for:** One shared axios instance with the base URL and an interceptor that attaches the auth token to every request and handles expired tokens (401 responses).
- **Note:** TanStack Query does not send requests itself, so axios is still required.

### 3.5 TanStack Query
- **Purpose:** Manages **server state**, meaning data that lives on the backend (products, orders, profile, and so on).
- **What it gives us:**
  - Loading and error states without repeated `useEffect` code
  - Caching, so going back to a screen is instant
  - Background refetching and pull-to-refresh
  - Automatic retry on poor mobile networks
  - Easy refresh of data after actions such as add to cart or place order (`invalidateQueries`)
- **Used for:** Every GET request (`useQuery`) and every create/update/delete request (`useMutation`).

### 3.6 Zustand
- **Purpose:** Manages **client state**, meaning data that only exists inside the app.
- **Used for:** Logged-in user and token status, local cart before checkout, theme, and language.
- **Why not store API data here:** TanStack Query already owns that.
- **Alternative:** React Context is acceptable if the client state stays very small.

### 3.7 Zod
- **Purpose:** Defines validation rules as schemas, for example valid email format and a password of at least 8 characters.
- **Used for:** Login and signup forms, and optionally for validating API responses.
- **Bonus:** Types can be generated from schemas (`z.infer`), so rules and TypeScript types never drift apart.

### 3.8 React Hook Form (with @hookform/resolvers)
- **Purpose:** Handles the form itself: input values, error messages, touched fields, and submit handling.
- **How it fits with Zod:** Zod defines the rules, React Hook Form applies them, and `@hookform/resolvers` connects the two.

### 3.9 expo-secure-store
- **Purpose:** Stores sensitive data (the auth token) in the device's encrypted storage (iOS Keychain and Android Keystore).
- **Rule:** Never store tokens in plain AsyncStorage.

### 3.10 Payment Integration (to be confirmed)
- **Purpose:** Connect the app to the payment flow that already exists on the backend.
- **Option A:** The provider's official React Native SDK (for example Stripe or Razorpay). This requires a development build, not Expo Go.
- **Option B:** Open the backend's web checkout in a WebView or in-app browser. This is simpler.
- **Decision depends on:** The payment provider used and what is being sold (see Risks below).

## 4. State Management Rule

| Type of data | Example | Tool |
|---|---|---|
| Comes from the API (server state) | Products, orders, profile | TanStack Query |
| Lives only in the app (client state) | Token, cart, theme, language | Zustand |
| Form inputs | Login email and password | React Hook Form |

**Simple rule:** if it came from the API, use TanStack Query. If it only lives in the app, use Zustand.

## 5. Suggested Folder Structure

```
app/
  _layout.tsx          (providers: QueryClientProvider)
  (auth)/
    login.tsx
    signup.tsx
  (app)/
    (tabs)/
      index.tsx
      profile.tsx
    product/[id].tsx
src/
  api/                 (axios instance, API functions)
  hooks/               (useQuery / useMutation hooks)
  store/               (Zustand stores)
  schemas/             (Zod schemas)
  types/               (shared TypeScript types)
  components/          (reusable UI)
```

## 6. Build, Test, and Release Tools

| Tool | Purpose |
|---|---|
| Expo Go | Fast testing on a real phone during early development |
| Development build | Testing when custom native libraries (such as a payment SDK) are used |
| EAS Build | Cloud builds for Android and iOS (no Mac required for iOS builds) |
| EAS Submit | Uploading builds to the App Store and Google Play |
| EAS Update | Over-the-air fixes for JavaScript changes without a full store review |
| Sentry (recommended) | Crash and error tracking |
| Git | Version control from day one |

## 7. Information Needed from the Client

- [ ] API documentation (Swagger or Postman collection)
- [ ] Authentication method (JWT, session, OAuth) and token refresh behavior
- [ ] Staging or test environment URL
- [ ] API error response format
- [ ] Payment provider and checkout flow details
- [ ] Design files (Figma)
- [ ] Required features: push notifications, maps, camera, offline mode, and so on
- [ ] Apple Developer account ($99/year) and Google Play account ($25 one-time), owned by the client with our team added
- [ ] Privacy policy, app icon, screenshots, and store descriptions

## 8. Risks and Things to Watch

- **Apple In-App Purchase rules:** If the app sells digital goods (subscriptions, premium content, credits), Apple may require In-App Purchase instead of the existing gateway. Physical goods and real-world services can use normal gateways. Confirm early to avoid rejection.
- **HTTPS required:** iOS blocks plain HTTP by default. The API must use HTTPS.
- **Store review time:** Allow buffer for App Store review and possible rejections.
- **Payment SDK and Expo Go:** Native payment SDKs do not run in Expo Go and need a development build.
- **Android device variety:** Test on several real Android devices, not just simulators.
- **Secrets:** Keep API keys in environment variables, never hardcoded.

## 9. Suggested Next Steps

1. Create the project: `npx create-expo-app@latest`
2. Install and configure TypeScript, Expo Router, axios, TanStack Query, Zustand, Zod, React Hook Form, and expo-secure-store
3. Set up the axios instance with the token interceptor
4. Wrap the app in `QueryClientProvider` in the root layout
5. Build the auth flow end to end (signup, login, token storage, redirect)
6. Build one feature screen fully, then expand
7. Integrate payments after the provider is confirmed
8. Share regular test builds with the client using EAS

## 10. Final Decision Summary

**Expo + TypeScript + Expo Router + axios + TanStack Query + Zustand + Zod + React Hook Form + expo-secure-store + payment SDK or WebView (to be confirmed).**
