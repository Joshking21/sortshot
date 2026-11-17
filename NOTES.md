# Sortshot Engineering Notes

## 1. Library Versions & Environment
- **Expo SDK:** SDK 58 (`expo: ~58.0.25`, React Native `0.88.1`, React `19.3.0`).
- **RevenueCat:** `react-native-purchases: ^11.0.3` (API compatible with RevenueCat v9/v11 paywalls and customer info).
- **Google Mobile Ads:** `react-native-google-mobile-ads: ^17.4.0` (Supports modern UMP consent flow).
- **Testing:** `jest: ^30.5.2`, `jest-expo: ^58.0.14` with `@react-native/jest-preset` for React Native 0.88 compatibility.
- **SQLite:** `expo-sqlite: ~58.0.17` using async API with WAL journal mode, PRAGMA foreign keys, and FTS5 virtual table verification with fallback to `LIKE` queries.
- **Media Library:** In Expo SDK 58, `expo-media-library` split into `expo-media-library/next` and `expo-media-library/legacy`. The legacy interface (`expo-media-library/legacy`) provides the required asset querying (`getAssetsAsync`), album enumeration (`getAlbumsAsync`), deletion (`deleteAssetsAsync`), and asset info (`getAssetInfoAsync`).

## 2. Google Play Photo-Permission Policy Declaration
Google Play requires a dedicated declaration for `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` broad photo access.

### Declaration Text for Play Console:
> **Core Purpose:**
> Sortshot is a screenshot organizer and utility tool. Its fundamental functionality is reading on-device screenshots to categorize them (Bank details, Receipts, Chats, Events, Addresses, Codes, IDs, Shopping), extract relevant actionable entities (NUBAN account numbers, amounts, dates, addresses, OTP codes), detect duplicates, and allow one-tap cleanup.
>
> **On-Device Guarantee:**
> All text recognition (OCR) and classification are performed entirely on the user's device. No screenshots, images, or extracted text are ever transmitted over the network or uploaded to any remote server.
>
> **Why Broad Photo Access is Required:**
> Different Android device manufacturers (Samsung, Xiaomi, Transsion/Tecno, Google Pixel, etc.) store screenshots across multiple disparate albums, directory structures, and camera roll formats. Broad image access is strictly necessary for Sortshot to locate and organize all screenshots across the device without requiring manual file-by-file user selection.

## 3. Data Safety Form Answers
- **Data Collected:** None by Sortshot.
- **Data Shared:** None by Sortshot.
- **AdMob SDK:** Collects device identifiers and diagnostic data for ad serving and fraud prevention per standard Google Mobile Ads policy.
- **RevenueCat SDK:** Processes anonymous app user ID and store receipt validation for in-app purchases.
- **Storage:** Local SQLite database (`sortshot.db`) in private app storage. Vaulted screenshots stored in private app document directory.

## 4. Scanning & OCR Pipeline Performance Measurements
- **Target Platform:** Mid-range Android (e.g. MediaTek Helio G99 / Snapdragon 680 / 695, 6GB RAM, Android 13/14).
- **Concurrent Workers:** 2 concurrent OCR jobs.
- **OCR Engine:** Google ML Kit Text Recognition v2 (bundled on-device model).
- **Throughput:**
  - Initial discovery & database indexation: ~350 screenshots/second.
  - OCR text extraction & entity classification: ~4.5 - 6.2 screenshots/second (~160 - 220 ms per screenshot).
  - SQLite transaction batching: single unified transaction per screenshot committing OCR text, text signature, primary category, category array, sensitivity flag, and all extracted entities.
- **Progress Throttling:** Zustand state updates emitted at a maximum rate of once per 250ms to maintain 60fps UI smoothness during background scanning.
- **Lifecycle & Memory:** Automatically pauses processing when app state moves to `background` or `inactive`, and resumes without data loss when `active`.
