# Sortshot 📸✨

> **"Your screenshots, sorted and useful. Nothing leaves your phone."**

Sortshot is an offline-first mobile app built with Expo, React Native, and Google ML Kit on-device OCR. It scans every screenshot on your phone, categorizes them into smart folders (Bank details, Receipts & transfers, Chats, Events, Addresses, Links, Codes & OTPs, IDs, Shopping), pulls out actionable entities (account numbers, amounts, dates, addresses, links), and helps delete unwanted junk in bulk.

---

## 🏗️ Architecture & Stack

- **Framework:** Expo SDK 58 (React Native 0.88, React 19)
- **Routing:** Expo Router (File-based navigation)
- **Database:** `expo-sqlite` (Async API with SQLite FTS5 full-text search)
- **OCR:** `@react-native-ml-kit/text-recognition` (Local, on-device OCR)
- **State Management:** `zustand`
- **List Performance:** `@shopify/flash-list`
- **In-App Purchases:** `react-native-purchases` (RevenueCat)
- **Monetization:** `react-native-google-mobile-ads` (Google AdMob with UMP consent)
- **Tests:** `jest` + `jest-expo` with strict TypeScript validation

---

## 🚀 Development Build Instructions (EAS)

Because Sortshot uses native device capabilities (Google ML Kit text recognition, local authentication, media library access, SQLite, AdMob), **it will NOT run in standard Expo Go**. You must run a **Development Build** via EAS.

### 1. Prerequisites
Install EAS CLI globally:
```bash
npm install -g eas-cli
```
Log in to your Expo account:
```bash
eas login
```

### 2. Configure EAS Project (First time only)
```bash
eas init
```

### 3. Generate a Development Build (Android APK)
To build a debuggable Android APK with all native modules linked:
```bash
eas build --profile development --platform android
```
Once the build completes, download and install the `.apk` on your Android device or drag it onto an Android emulator.

### 4. Start the Local Metro Bundler
Start the development server:
```bash
npx expo start --dev-client
```
Open the installed **Sortshot** development client app on your device, and connect to your local Metro server.

---

## 🧪 Running Tests

Run the comprehensive unit test suite covering classifier rules, entity extractors, and 42 realistic test fixtures:
```bash
npm test
```

---

## 📁 Project Structure

```
sortshot/
  app/
    _layout.tsx                 Root stack layout, SQLite initialization, theme
    onboarding/welcome.tsx      3-slide onboarding walkthrough
    onboarding/permission.tsx   Permission explanation and prompt
    (tabs)/_layout.tsx          Tab bar navigation (Home, Clean, Settings)
    (tabs)/index.tsx            Home screen with smart folder tiles
    (tabs)/clean.tsx            Cleanup suggestions and deletion review
    (tabs)/settings.tsx         Settings, Pro upgrade, biometric lock
    folder/[category].tsx       Smart folder thumbnail grid / bank cards
    shot/[id].tsx               Screenshot detail, zoom, and action cards
    search.tsx                  FTS5 full-text search with folder filtering
    vault.tsx                   Biometric-protected private vault
    pro.tsx                     Pro paywall modal
    receipts-summary.tsx        Receipt breakdown & export
  src/
    db/                         SQLite schema, FTS5 triggers, queries
    classify/                   Rules, extractors, classifier, Nigerian bank aliases
    clean/                      Duplicate & cleanup suggestion algorithms
    theme.ts                    Design tokens, colors, typography, spacing
    strings.ts                  Centralized plain-English user strings
  __tests__/                    Classifier and extractor test suites & fixtures
  eas.json                      EAS build configurations (development, preview, production)
  NOTES.md                      Engineering notes & Google Play declaration
  README.md                     Project documentation
```
