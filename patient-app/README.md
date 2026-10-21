# CannaQuest Patient Mobile Application

> **Next-generation React Native / Expo application for Medicinal Cannabis Patient Telehealth, Consultations, Prescription Management, Compliance Documentation, and Secure S3 Storage.**

---

## 📋 Table of Contents
1. [Overview & Features](#-overview--features)
2. [Prerequisites & System Requirements](#-prerequisites--system-requirements)
3. [Dependencies & Packages](#-dependencies--packages)
4. [Step-by-Step Installation Guide](#-step-by-step-installation-guide)
5. [Environment Configuration (`.env`)](#-environment-configuration-env)
6. [AWS S3 Integration Architecture](#-aws-s3-integration-architecture)
7. [Running the Application](#-running-the-application)
8. [Building for Production / Dev Client](#-building-for-production--dev-client)
9. [Project Architecture](#-project-architecture)

---

## 🌟 Overview & Features

- **Patient Onboarding & Questionnaire**: Interactive prescreening medical assessment, safety evaluations, and real-time clinical draft saving.
- **Privacy & Compliance Consent (Form Ref: MC-PCF-001)**: Digital patient signing with Australia-wide telehealth compliance clauses.
- **Direct AWS S3 Cloud Integration**:
  - **Signed Compliance Documents**: Saved and retrieved directly from `compliance-forms/signed_documents/{id}` without external redirect links.
  - **Product Catalog Images**: Dynamically presigned with AWS SigV4 for immediate rendering from `products/` and `product-image/`.
  - **Signatures**: Uploaded and securely fetched from `signatures/`.
  - **Prescription Uploads**: Direct upload and backup to `prescriptions/`.
- **E-Commerce & Dispensary**: Cart, product categories (Flower, Oil, Vape, Cartridge, Edible, Device), and checkout.
- **Consultation Booking & Journey**: Telehealth consultation calendar, doctor appointment scheduling, and care timeline.

---

## 💻 Prerequisites & System Requirements

Before setting up the project, make sure you have the following installed on your machine:

| Software | Recommended Version | Download Link |
| :--- | :--- | :--- |
| **Node.js** | `v20.x` or `v22.x` (LTS) | [nodejs.org](https://nodejs.org/) |
| **npm** | `v10.x` or higher | Bundled with Node.js |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |
| **Java JDK** | OpenJDK 17 (for Android builds) | [adoptium.net](https://adoptium.net/) |
| **Android Studio** | Latest with Android SDK Platform 34+ | [developer.android.com](https://developer.android.com/studio) |
| **Expo CLI & EAS** | `eas-cli@latest` | `npm install -g eas-cli` |

---

## 📦 Dependencies & Packages

Here is the complete breakdown of dependencies used by the application and their purpose:

### 1. Core Framework & React
- `react@19.2.3` & `react-dom@19.2.3`: UI library runtime.
- `react-native@0.86.3`: Native mobile framework.
- `expo@~57.0.30`: Expo SDK 57 runtime.
- `expo-router@~57.0.28`: File-based, type-safe navigation and screen routing.

### 2. AWS S3 & Cloud Storage Integration
- `expo-crypto@~57.0.4`: Cryptographic primitives for AWS SigV4 request signing and SHA-256 HMAC digest generation.
- `expo-file-system@~57.0.7`: Reading and streaming files, base64 conversions for S3 document & prescription uploads.

### 3. File Picking & Signature Capture
- `expo-document-picker@~57.0.3`: Document and image file selection for signatures and external prescription uploads.
- `react-native-signature-canvas@^5.1.1`: Digital canvas for drawing signatures.
- `react-native-webview@13.16.1`: WebView engine supporting signature drawing canvas.

### 4. Networking & State Management
- `axios@^1.20.0`: HTTP client for backend REST API endpoints.
- `@tanstack/react-query@^5.104.1`: Asynchronous server-state management, query caching, and mutations.
- `@tanstack/react-query-persist-client@^5.104.3`: Persistent query state.
- `@react-native-async-storage/async-storage@2.2.0`: Local storage persistence.
- `expo-secure-store@~57.0.4`: Encrypted keychain/keystore storage for patient JWT authentication tokens.

### 5. UI, Animations & Styling
- `react-native-reanimated@4.5.1`: Fluid 60fps native animations.
- `react-native-gesture-handler@~2.32.0`: Native touch, swipe, and scroll handlers.
- `react-native-safe-area-context@~5.7.0`: Safe inset calculations for notches and home bars.
- `react-native-screens@~4.26.0`: Native screen view memory optimization.
- `expo-image@~57.0.5`: High-performance hardware-accelerated image viewer.
- `@expo-google-fonts/manrope@^0.4.2`: Manrope typography.
- `react-native-calendars@^1.1314.0`: Interactive consultation date picker.

### 6. Forms & Validation
- `react-hook-form@^7.89.0`: High-performance form state management.
- `zod@^4.6.5` & `@hookform/resolvers@^5.9.1`: Schema-based input validation.

---

## 🚀 Step-by-Step Installation Guide

### Step 1: Clone the Repository
```bash
git clone https://github.com/creadigol/cannaquest-app.git
cd cannaquest-app/patient-app
```

### Step 2: Install All Dependencies
Run npm install using `--legacy-peer-deps` to ensure clean compatibility across React 19 and Expo SDK 57 packages:

```bash
npm install --legacy-peer-deps
```

> **Tip:** If you need to install or update any Expo native module, use the official Expo installer:
> ```bash
> npx expo install <module-name>
> ```
> Example:
> ```bash
> npx expo install expo-crypto expo-document-picker expo-file-system
> ```

---

## 🔑 Environment Configuration (`.env`)

Create or update the `.env` file in the root of `patient-app/`:

```env
NODE_ENV=development

# Database / Backend
DATABASE_URL=postgresql://neondb_owner:npg_LWRqmMuP6cz3@ep-rapid-queen-a7cklk9u-pooler.ap-southeast-2.aws.neon.tech/medicine1?sslmode=require&channel_binding=require

# API & Authentication
JWT_SECRET=your_jwt_secret_here
APP_KEY=base64:your_app_key_here
EXPO_PUBLIC_API_URL=https://patient.cannaquest.com.au

# Google Places
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# AWS S3 Storage Credentials (ap-southeast-2)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_DEFAULT_REGION=ap-southeast-2
AWS_BUCKET=cannaquest-storage

# Telehealth & Bookings
EXPO_PUBLIC_ADVANCE_BOOKING_DAYS=30
CHECKOUT_SESSION_SECONDS=90

# Twilio SMS
TWILIO_ENABLED=true
TWILIO_LOG_ONLY=false
TWILIO_SID=your_twilio_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_FROM_NUMBER=+61485014484

# Till Payments Gateway
TILL_API_BASE_URL=https://gateway.tillpayments.com/api/v3
TILL_API_KEY=your_till_api_key_here
TILL_API_USERNAME=cannaquest-portal
TILL_API_PASSWORD=your_till_password_here
TILL_SHARED_SECRET=your_till_shared_secret_here
TILL_PUBLIC_INTEGRATION_KEY=your_till_public_key_here
TILL_CALLBACK_URL=https://patient.cannaquest.com.au/commerce/v1/checkout/callback
ALLOWED_RETURN_URL_HOSTS=patient.cannaquest.com.au
```

---

## ☁️ AWS S3 Integration Architecture

All interactions with AWS S3 are handled directly inside `src/features/customer/api/s3ComplianceService.ts` using AWS SigV4:

| Resource | S3 Storage Path | Operation | Mechanism |
| :--- | :--- | :--- | :--- |
| **Signed Privacy Documents** | `compliance-forms/signed_documents/{id}` | Upload & Fetch | SigV4 authenticated PUT & GET. Displays in-app without external browser redirect. |
| **Product Images** | `products/...` & `product-image/...` | Render | `getS3PresignedUrl()` generates signed temporary URLs to prevent 403 Access Denied. |
| **Uploaded Signatures** | `signatures/signature_{timestamp}.png` | Upload & Render | SigV4 PUT upload and presigned image display. |
| **Prescription Uploads** | `prescriptions/prescription_{timestamp}_{name}` | Upload | Direct S3 file upload backup + backend ingestion. |

---

## 📱 Running the Application

### 1. Start Metro Development Server
```bash
npm start
# or
npx expo start
```

### 2. Run with Development Client (Recommended)
Because the app utilizes native document picking and crypto modules:
```bash
# For Android:
npm run android

# For iOS (macOS only):
npm run ios

# For Web:
npm run web
```

---

## 🛠️ Building for Production / Dev Client

### Using EAS Build (Expo Application Services)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```
2. **Log into your Expo Account**:
   ```bash
   eas login
   ```
3. **Configure Project**:
   ```bash
   eas build:configure
   ```
4. **Create a Development APK Build**:
   ```bash
   eas build --platform android --profile development
   ```
5. **Create a Production Release Build**:
   ```bash
   eas build --platform android --profile production
   ```

---

## 📂 Project Architecture

```
patient-app/
├── assets/                     # Fonts, category icons, and static images
├── src/
│   ├── app/                    # Expo Router file-based screens & navigation
│   │   ├── (app)/
│   │   │   ├── (tabs)/         # Home, Consults, Dispensary, Profile tabs
│   │   │   └── questionnaire/  # Patient intake & prescreening flow
│   │   └── _layout.tsx         # Root app layout & providers
│   ├── features/
│   │   ├── auth/               # Login, OTP verification, tokens
│   │   ├── cart/               # Cart state, item cards, checkout
│   │   ├── consultations/      # Booking, doctors, appointment slots
│   │   ├── customer/           # User profile, addresses, documents, signatures
│   │   │   ├── api/
│   │   │   │   ├── customer.api.ts
│   │   │   │   └── s3ComplianceService.ts   # AWS S3 direct client & SigV4
│   │   │   └── components/
│   │   │       ├── DocumentsModal.tsx       # In-app formal document viewer
│   │   │       ├── SignatureDisplay.tsx     # Drawn SVG / Typed / S3 images
│   │   │       └── SignatureModal.tsx       # Draw, Type, Upload signature
│   │   ├── prescriptions/      # Active & past scripts, prescriber select, upload modal
│   │   ├── products/           # Catalog grid, detail modals, categories
│   │   └── questionnaire/      # Step-by-step clinical intake & privacy consent
│   └── lib/
│       ├── api/                # Axios instance & interceptors
│       ├── storage/            # Secure token storage
│       └── theme/              # Design tokens (colors, typography, radii, shadows)
├── package.json
└── tsconfig.json
```

---

## 🧪 Type Checking & Verification

To verify that all types and imports are valid without running the full compiler:
```bash
node ./node_modules/typescript/bin/tsc --noEmit
```
Expected output: **0 errors**.