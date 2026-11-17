# Build brief: Sortshot

You are building **Sortshot**, a mobile app that reads every screenshot on the phone, sorts them into
smart folders, pulls out useful details (bank account numbers, amounts, dates, addresses, links, codes),
offers one-tap actions on them, and helps delete the junk. **Everything happens on the phone. Nothing is
uploaded.** Read this whole brief before writing code. Follow it exactly. Where a library's current API
differs from what's written here, follow the library's current docs and note the difference in
`NOTES.md`.

Work in this folder (`Desktop/Sortshot`). Build in the phases in section 12 and stop at the end of each
phase with a short report: what works, what doesn't, how to try it.

---

## 1. Product in one paragraph

People screenshot everything: account details someone sent, transfer receipts, addresses, flyers,
recipes, chats, OTP codes. Then the gallery fills up and nothing can be found. Phone galleries can
search text, but they don't understand it. Sortshot does: it shows an account number as a card with a
Copy button, totals transfer receipts, adds a flyer's date to the calendar, opens an address in Maps,
hides sensitive screenshots behind a fingerprint or Face ID, and deletes old junk in bulk.
First market: Nigeria (Android first), but all copy is plain English that works anywhere.

Tagline: **"Your screenshots, sorted and useful. Nothing leaves your phone."**

## 2. Stack (use exactly these unless one is unavailable)

| Need | Use |
|---|---|
| App framework | **Expo**, latest stable SDK (`npx create-expo-app@latest sortshot --template default`), TypeScript strict |
| Navigation | `expo-router` (file-based) |
| Builds | **Development builds via EAS** (`eas build --profile development`). The app will NOT run in Expo Go because of native modules. Add `eas.json` with `development`, `preview` (APK) and `production` (AAB) profiles. |
| Reading screenshots | `expo-media-library` |
| Text recognition (OCR) | `@react-native-ml-kit/text-recognition` (Google ML Kit, on-device, Latin script). If it fails to build with the current SDK, write a small Expo native module wrapping ML Kit Text Recognition v2 (Android) and Apple Vision `VNRecognizeTextRequest` (iOS). |
| Database | `expo-sqlite` (async API). Use an **FTS5** virtual table for search; on first run check FTS5 is available (`SELECT sqlite_compileoption_used('ENABLE_FTS5')` or try creating the table) and fall back to `LIKE` search if not. |
| Image display | `expo-image` |
| Lists | `@shopify/flash-list` |
| State | `zustand` |
| Clipboard | `expo-clipboard` |
| Calendar | `expo-calendar` |
| Biometric lock | `expo-local-authentication` |
| Files (vault, export) | `expo-file-system`, `expo-sharing`, `expo-print` (PDF) |
| Haptics | `expo-haptics` |
| Ads | `react-native-google-mobile-ads` (AdMob, with its Expo config plugin and the UMP consent flow) |
| Purchases | `react-native-purchases` (RevenueCat), one entitlement `pro` |
| Tests | `jest` + `jest-expo` for the classifier and extractors |
| Lint/format | ESLint (expo config) + Prettier |

No backend. No user accounts. No analytics SDK in v1. The only network traffic is ads and purchases.

## 3. Folder structure

```
sortshot/
  app/
    _layout.tsx                 root stack, theme, DB init, consent + RevenueCat init
    onboarding/welcome.tsx
    onboarding/permission.tsx
    (tabs)/_layout.tsx          tabs: Home, Clean, Settings
    (tabs)/index.tsx            Home
    (tabs)/clean.tsx            Cleanup
    (tabs)/settings.tsx
    folder/[category].tsx       one smart folder
    shot/[id].tsx               one screenshot: image, actions, text
    search.tsx
    vault.tsx                   hidden screenshots (biometric)
    pro.tsx                     paywall
    receipts-summary.tsx        totals of receipts (Pro export)
  src/
    db/schema.ts  db/index.ts  db/queries.ts
    scan/scanner.ts             finds new screenshots, queues OCR, saves results
    scan/ocr.ts                 wraps ML Kit
    classify/rules.ts           all regexes and keyword lists (section 6)
    classify/extract.ts         pulls entities out of text
    classify/classify.ts        scores categories, picks primary
    classify/banks.ts           Nigerian bank and fintech names + aliases
    clean/suggestions.ts        duplicate / old / junk / expired-code logic
    vault/vault.ts
    ads/ads.ts  ads/AdBanner.tsx
    pro/pro.ts                  RevenueCat wrapper, usePro() hook
    ui/ (Button, Card, Chip, EmptyState, ProgressBar, ActionCard, Thumb, Sheet)
    theme.ts  strings.ts
  __tests__/classify.test.ts  __tests__/extract.test.ts  __tests__/fixtures.ts
  NOTES.md  README.md  PRIVACY.md
```

## 4. Permissions and platform rules

**Android**
- Android 13+: `READ_MEDIA_IMAGES`. Android 12 and below: `READ_EXTERNAL_STORAGE`.
- Android 14+: handle **partial access** (`READ_MEDIA_VISUAL_USER_SELECTED`). If access is partial, show a
  banner on Home: "Sortshot can only see some of your photos. Allow all photos so every screenshot is
  sorted." with a button that opens the permission prompt again.
- Finding screenshots: use `MediaLibrary.getAlbumAsync('Screenshots')` and also any album whose title
  contains "screenshot" (case-insensitive, different phone makers use different names). Also include
  assets whose filename starts with `Screenshot` or `screenshot` from the camera roll. De-duplicate by
  asset id.
- Deleting: `MediaLibrary.deleteAssetsAsync` (Android 11+ shows the system confirm dialog; that's
  expected).
- Google Play's photo-permission policy: the app's core purpose is organising photos (screenshots), so
  broad access is allowed, but it must be declared in Play Console. Write the declaration text in
  `NOTES.md`.

**iOS**
- `NSPhotoLibraryUsageDescription`: "Sortshot reads your screenshots on this phone to sort them and find
  the text in them. Nothing is uploaded."
- Find screenshots with `getAssetsAsync({ mediaType: 'photo', mediaSubtypes: ['screenshot'] })`.
- Handle "Limited" access the same way as Android partial access.
- No background scanning in v1: scan when the app opens and on pull-to-refresh.
- `NSFaceIDUsageDescription`: "Sortshot uses Face ID to open your hidden screenshots."
- `NSCalendarsFullAccessUsageDescription` / write-only as required by the SDK: "Sortshot adds events from
  your screenshots to your calendar when you ask."

## 5. Database (expo-sqlite)

```sql
CREATE TABLE IF NOT EXISTS shots (
  id TEXT PRIMARY KEY,            -- MediaLibrary asset id
  uri TEXT NOT NULL,
  filename TEXT,
  created_at INTEGER NOT NULL,    -- ms epoch (asset creationTime)
  modified_at INTEGER,
  width INTEGER, height INTEGER,
  ocr_status TEXT NOT NULL DEFAULT 'pending',  -- pending | done | failed
  ocr_text TEXT,                  -- full recognised text, lines joined with \n
  text_len INTEGER DEFAULT 0,
  text_sig TEXT,                  -- normalised text signature for duplicate detection (section 8)
  primary_cat TEXT,               -- one of the category ids in section 6
  cats TEXT,                      -- JSON array of all matching category ids, best first
  sensitive INTEGER DEFAULT 0,    -- 1 if bank_details, code or id_document matched
  vaulted INTEGER DEFAULT 0,      -- 1 = moved into the vault (original deleted from gallery)
  vault_path TEXT,
  gone INTEGER DEFAULT 0,         -- 1 = no longer in the gallery
  processed_at INTEGER
);
CREATE INDEX IF NOT EXISTS shots_cat ON shots(primary_cat, created_at DESC);
CREATE INDEX IF NOT EXISTS shots_status ON shots(ocr_status);

CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  type TEXT NOT NULL,             -- account | amount | date | address | url | code | phone | email
  value TEXT NOT NULL,            -- normalised value (e.g. '0123456789', '25000.00', ISO date)
  label TEXT,                     -- what to show (e.g. 'GTBank · 0123456789 · ADA OBI')
  extra TEXT                      -- JSON (bank, accountName, currency, direction, etc.)
);
CREATE INDEX IF NOT EXISTS entities_shot ON entities(shot_id);
CREATE INDEX IF NOT EXISTS entities_type ON entities(type);

CREATE VIRTUAL TABLE IF NOT EXISTS shots_fts USING fts5(ocr_text, content='shots', content_rowid='rowid');
-- keep shots_fts in sync with triggers on insert/update/delete of shots.ocr_text

CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
```

Run schema creation in `db/index.ts` on startup with a `user_version` pragma for migrations.

## 6. Classifier (the heart of the app)

Input: OCR text. Output: `{ primary: CategoryId, cats: CategoryId[], sensitive: boolean, entities: Entity[] }`.
Pure TypeScript, no network, no ML beyond OCR. Lower-case and collapse whitespace before matching
keywords; keep the original text for extraction. Each category gets a **score**; a category matches when
its score ≥ its threshold. `primary` = highest score; ties broken by the order in the table. If nothing
matches: `little_text` when `text_len < 25`, else `other`.

| id | Folder name | Signals (each adds points) | Threshold |
|---|---|---|---|
| `bank_details` | Bank details | account number found (+3); a bank name from `banks.ts` (+2); "account name", "acct", "acc no", "account number", "bank" (+1 each, max +2) | 4 |
| `receipt` | Receipts & transfers | an amount (+2); "transfer successful", "transaction successful", "payment successful", "debit", "credit", "receipt", "reference", "ref", "session id", "beneficiary", "narration", "transaction id", "sent", "received", "paid" (+1 each, max +4); a date (+1) | 4 |
| `chat` | Chats | 3+ chat timestamps like `10:42` or `10:42 PM` (+3); "online", "typing", "last seen", "type a message", "message", "reply", "forwarded", "you deleted this message" (+1 each, max +3) | 4 |
| `event` | Events | a future-or-recent date (+2); a time (+1); "venue", "rsvp", "date:", "time:", "join us", "tickets", "starts", "register", "location", "dress code" (+1 each, max +3) | 4 |
| `address` | Addresses | an address line (section 7) (+4); a Nigerian city/area name (+1) | 4 |
| `link` | Links | a URL (+3) | 3 |
| `code` | Codes & OTPs | a 4–8 digit code within 30 characters of "otp", "code", "verification", "verify", "pin", "password", "token" (+4) | 4 |
| `id_document` | IDs | "nin", "bvn", "national identity", "passport", "driver's licence", "voter", "date of birth" (+2 each, max +4) | 4 |
| `shopping` | Shopping | an amount (+1); "add to cart", "buy now", "in stock", "order", "delivery", "checkout", "price", "size", "colour" (+1 each, max +4) | 4 |

`sensitive = cats includes bank_details | code | id_document`.

Keep every keyword list and regex in `classify/rules.ts` as exported constants so they can be tuned
without touching logic.

## 7. Extractors (`classify/extract.ts`)

All regexes global and unicode. Return entities with normalised `value` and a human `label`.

- **Account number (Nigeria NUBAN):** `(?<!\d)\d{10}(?!\d)` after removing spaces/dashes inside digit
  runs ("012 345 6789" → "0123456789"). Reject when it's part of an 11-digit phone number
  (`0[789][01]\d{8}`) or `+234` number, or when it looks like a date/time or an amount. **Bank:** find the
  nearest bank name from `banks.ts` within 3 lines. **Account name:** the text after "account name" /
  "acct name" / "name:" on the same or next line; otherwise the nearest line that is 2–4 words of
  mostly letters in capitals within 2 lines. Label: `GTBank · 0123456789 · ADA OBI`.
- **Banks list (`banks.ts`)** with aliases, at least: Access (Access Bank, Diamond), GTBank (GTB,
  Guaranty Trust, GTCO), Zenith, First Bank (FBN, Firstbank), UBA, Fidelity, FCMB, Union Bank, Sterling,
  Stanbic IBTC, Wema (ALAT), Ecobank, Polaris, Keystone, Unity, Providus, Jaiz, Globus, Titan Trust,
  Premium Trust, Parallex, Optimus, SunTrust, Lotus, Taj, Kuda, OPay, PalmPay, Moniepoint, Carbon,
  VFD, FairMoney, Paga, Raven, Sparkle. Match case-insensitively on word boundaries.
- **Amount:** `(₦|NGN|N)\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?` and also `$`, `£`, `€` with the same
  number pattern. Normalise to a number string with 2 decimals plus `extra.currency`. Ignore a bare
  `N` when not followed by digits. Direction in `extra.direction`: `out` near "debit|sent|transfer to|
  paid", `in` near "credit|received|from".
- **Date:** `dd/mm/yyyy`, `dd-mm-yyyy`, `yyyy-mm-dd`, `12 Mar 2026`, `Mar 12, 2026`, `12th March`,
  `Saturday, 14 March`. **Assume day-first** for numeric dates (Nigeria). Normalise to ISO. Year missing
  → the next occurrence from the screenshot's `created_at`.
- **Time:** `\b([01]?\d|2[0-3]):[0-5]\d\s?(am|pm)?\b` and `\b\d{1,2}\s?(am|pm)\b`.
- **Address:** a line containing a house number + one of: Street, St, Road, Rd, Avenue, Ave, Close,
  Crescent, Cres, Way, Drive, Lane, Estate, Layout, Junction, Plaza, Quarters; or "Plot \d+"; or a line
  ending in a known area/city (Lagos, Lekki, Ikeja, Yaba, Surulere, Ajah, VI, Victoria Island, Ikoyi,
  Abuja, Wuse, Garki, Maitama, Gwarinpa, Port Harcourt, PH, Ibadan, Enugu, Kano, Benin, Owerri, Uyo,
  Abeokuta, Warri, Kaduna, Jos, Ilorin). Join with the following line if it continues the address.
- **URL:** `https?://\S+` and bare domains `\b[a-z0-9-]+\.(com|ng|com\.ng|org|net|io|app|co|me|ly)\b(/\S*)?`.
- **Code/OTP:** see `code` above; value is the digits, `extra.keyword` is the trigger word.
- **Phone:** `(\+234|0)[789][01]\d{8}` → normalise to `+234…`.
- **Email:** standard email regex.

Write `__tests__/fixtures.ts` with **at least 40 realistic OCR text samples** (bank details from GTBank,
OPay, Moniepoint; transfer receipts; WhatsApp chats; a wedding flyer; an address in Lekki; an OTP SMS;
a Jumia product page; a meme with 6 words; an NIN slip; mixed cases) and tests asserting `primary`,
`cats`, `sensitive` and the extracted entities for each. All tests must pass.

## 8. Cleanup suggestions (`clean/suggestions.ts`)

Group into cards on the Clean tab, each with a count, total size if available, a preview row of 6
thumbnails and **Review** (opens a grid with all pre-selected, user can untick) → **Delete N**:

1. **Duplicates:** same `text_sig` and `text_len ≥ 25`, or same width/height and created within 10
   seconds of each other with identical `text_sig`. Keep the newest, suggest the rest.
   `text_sig` = lower-cased text, digits kept, all whitespace and punctuation removed, then the first
   400 characters.
2. **Near duplicates:** Jaccard similarity ≥ 0.9 on word sets for shots in the same primary category
   taken within 1 hour of each other.
3. **Old codes & OTPs:** category `code`, older than 7 days.
4. **Little or no text:** `little_text`, older than 30 days (memes, random captures).
5. **Old chats:** category `chat`, older than 90 days.
6. **Everything older than…** a picker (6 months / 1 year / 2 years), excluding `bank_details`,
   `receipt` and `id_document` unless the user ticks "include".

Never pre-select anything in `bank_details`, `receipt`, `id_document` except in "Duplicates".
After deleting, mark rows `gone = 1` and refresh counts. If the OS dialog is cancelled, change nothing.

## 9. Screens and behaviour

Visual style: clean, light, rounded. Theme tokens in `theme.ts`:
`brand #6D28D9`, `brandSoft #EDE9FE`, `ink #18181B`, `muted #71717A`, `line #E4E4E7`, `bg #FAFAFA`,
`card #FFFFFF`, `danger #DC2626`, `success #059669`; radius 14; spacing scale 4/8/12/16/24/32; system font.
Dark mode with matching dark tokens. Minimum touch target 44px. All strings in `strings.ts`.

- **Onboarding/welcome:** 3 short slides (Sort / Act / Clean), "Get started".
- **Onboarding/permission:** explains why ("to read your screenshots on this phone; nothing is
  uploaded"), "Allow access" button. Denied → explain and offer "Open settings".
- **First scan (inside Home):** full-width progress card "Sorting your screenshots… 312 of 1,840", with
  live counts per folder filling in. Processing continues while the user browses. Resumable if the app
  closes (pending rows stay `pending`).
- **Home tab:** search bar (opens `search.tsx`); grid of folder tiles (icon, name, count) in this order:
  Bank details, Receipts & transfers, Chats, Events, Addresses, Links, Codes & OTPs, IDs, Shopping,
  Other, Little or no text; a "Recently added" strip (last 20); partial-access banner if needed; banner ad
  at the bottom (free users only). Pull to refresh = incremental scan.
- **Folder screen:** grid of thumbnails (3 columns), newest first, with a small chip of the main
  entity under each (e.g. "₦25,000" or "GTBank · …6789"). Long-press to multi-select → Delete / Move to
  vault / Share. Sensitive folders show no ads.
- **Bank details folder** shows **cards, not thumbnails**: bank, account number (large), account name,
  "Copy number" (copies digits only, haptic + toast "Copied"), "Copy all" (bank, number, name on 3 lines),
  "View screenshot".
- **Receipts folder** has a header: "This month: ₦X out · ₦Y in" (sum of amounts with direction, this
  calendar month, NGN only; other currencies listed separately). Tap → `receipts-summary.tsx` (by month;
  Export CSV/PDF is Pro).
- **Shot screen:** zoomable image; row of **action cards** depending on entities: Copy account,
  Copy amount, Add to calendar (pre-filled title = first line of text, date/time from entities; asks
  calendar permission only now), Open in Maps (`geo:0,0?q=` on Android, `http://maps.apple.com/?q=` on
  iOS), Open link, Call / WhatsApp (`https://wa.me/234…`) for phone numbers, Copy code; then the full
  recognised text (selectable), folder chips (tap to change the folder manually; manual choice wins
  forever), and Delete / Move to vault / Share buttons.
- **Search:** FTS5 query over `ocr_text` with prefix matching (`term*`), results as thumbnails with the
  matching snippet highlighted; filter chips by folder; recent searches (last 8, stored in settings).
  Also searches entity labels so "gtb" finds GTBank cards.
- **Clean tab:** the suggestion cards from section 8, a total "You can free about X MB" when sizes are
  known, and the free-tier limit note.
- **Vault (Pro):** opening requires `LocalAuthentication.authenticateAsync`. "Move to vault" copies the
  image into the app's private documents folder, saves `vault_path`, then deletes the original from the
  gallery (OS confirm). "Restore" saves it back to the gallery with `MediaLibrary.saveToLibraryAsync`
  and removes it from the vault. Warn clearly: "Vaulted screenshots live only inside Sortshot. If you
  delete the app, they're deleted too."
- **Settings:** Sortshot Pro (status / upgrade), Rescan all, Lock app with biometrics (optional, Pro),
  Auto-suggest deleting codes after 7 days (toggle), Ad consent (re-open UMP form), Privacy policy,
  Restore purchases, Send feedback (mailto), version.
- **Paywall (`pro.tsx`):** lists Pro benefits (section 10), price from RevenueCat offerings, Buy,
  Restore, close. Never block the core flow with it.

## 10. Free vs Pro and ads

Free: scanning, all folders, search, action cards, cleanup **up to 100 deletions per day**, ads.
Pro (entitlement `pro`): unlimited cleanup, Vault, app lock, receipts export (CSV and PDF), custom
folders (create a folder and add rules: "text contains X"), no ads.
Products to configure in RevenueCat: `sortshot_pro_lifetime` (one-off) and `sortshot_pro_yearly`.
Prices are set in the stores, not in code.

Ads (`react-native-google-mobile-ads`):
- Use Google's **test ad unit ids** in development; read real ids from `app.config.ts` `extra` for
  production builds.
- Show the UMP consent form on first launch where required, before loading any ad.
- One adaptive banner at the bottom of Home and of non-sensitive folder screens. **Never** show ads on
  Bank details, Codes & OTPs, IDs, Vault, Shot screen, Search, or during onboarding.
- Rewarded ad on the Clean tab when the daily limit is reached: "Watch a short ad to clean 100 more
  today".
- Pro users never load the ads SDK requests.

## 11. Scanning pipeline (`scan/scanner.ts`)

1. List screenshot assets (section 4), newest first, in pages of 100.
2. Insert unseen ids as `pending`. Mark ids that disappeared from the gallery as `gone = 1` (skip
   vaulted rows).
3. Process `pending` rows newest first with **2 concurrent OCR jobs** (configurable). For each: get a
   local file uri (`getAssetInfoAsync` → `localUri`), run OCR, join block lines with `\n`, classify,
   save shot + entities in **one transaction**, set `ocr_status = 'done'`. On error set `failed` and
   continue; retry failed rows once on the next scan.
4. Emit progress through the zustand store (done, total, per-folder counts) at most every 250 ms.
5. Pause processing when the app goes to the background; resume when active.
6. Incremental scan on app open and pull-to-refresh only processes new assets (by id) and assets whose
   `modificationTime` changed.

Log timings in development (screenshots per second) and write real measurements for a mid-range Android
phone into `NOTES.md`.

## 12. Phases (stop and report after each)

1. **Skeleton:** Expo project, router, theme, tabs, DB schema, EAS config, dev build instructions in
   README. Classifier + extractors + 40 fixtures + tests passing (no UI needed yet).
2. **Scan & browse:** permissions, scanner, OCR, Home with folders and counts, folder grid, shot screen
   with text and action cards, search.
3. **Clean:** suggestions, review grid, deletion, daily limit.
4. **Pro & ads:** RevenueCat, paywall, vault, app lock, receipts summary + export, AdMob + consent.
5. **Polish & release:** dark mode, empty states, error states, accessibility labels, app icon and
   splash (placeholder purple "S" mark), `PRIVACY.md` (no data collected by Sortshot; ads and purchases
   handled by Google AdMob and RevenueCat), Play Console data-safety answers and the photo-permission
   declaration in `NOTES.md`, a `production` AAB build.

## 13. Rules

- TypeScript strict, no `any` in `src/` except at library boundaries.
- No network calls except AdMob and RevenueCat. No crash reporting or analytics in v1.
- Never log OCR text or entity values outside development.
- Every destructive action shows what will happen and how many items, and is undoable where the OS
  allows (vault restore).
- Keep classifier rules data-driven so tuning never touches screen code.
- Plain, friendly copy: "Copied", "Moved to vault", "Deleted 24 screenshots". No jargon.
- When something in this brief turns out wrong or impossible, don't silently change course: write it in
  `NOTES.md` with what you did instead.
