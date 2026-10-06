# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Furnify's mobile app (Android first, iOS later): Expo SDK 57, Expo Router, TypeScript. It talks to the same Express API as the website. It lives beside the other two repos and copies code from the website, so keep the three as sibling folders:

```
hatim_project/
  Hatim/          website (React + Vite)        - source of locales and business logic
  hatim_Backend/  API (Express + Prisma)        - shared by website and app
  hatim_mobile/   this app
```

## Commands

```bash
npx expo start           # dev server; scan the QR code with Expo Go on the phone
npm run typecheck        # tsc --noEmit
npx expo lint
npx expo install <pkg>   # never plain npm install for a package - picks the SDK-compatible version
npx expo export --platform android --output-dir <tmp>   # full bundle check without a phone
```

The API defaults to the live server (`src/lib/config.ts`). Override with `EXPO_PUBLIC_API_BASE_URL` in `.env.local` (see `.env.example`); a local backend must be addressed by the computer's LAN IP, not `localhost`.

## How auth works (different from the website)

The website uses an httpOnly cookie pair. The app cannot rely on cookies, so:

- Every request sends `X-Client: mobile` (`src/lib/httpClient.ts`). For such requests `/auth/login`, `/auth/verify-otp` and `/auth/refresh-token` return `data.tokens = { accessToken, refreshToken, expiresInMs }` instead of setting cookies (`hatim_Backend/src/app/shared/mobileClient.ts`).
- Tokens live in `expo-secure-store` (`src/lib/tokenStore.ts`), never AsyncStorage.
- The access token goes out as `Authorization: Bearer`. On a 401 the client refreshes once (single-flight, because the server rotates the refresh token) and retries. Only a 401 from the refresh itself signs the user out; a network failure never does.
- Sign-out is local: forget the tokens. `/auth/logout` only clears website cookies.
- If login succeeds but `tokens` is missing, the backend predates the mobile change (`ServerTooOldError`).

Routing is guarded in `src/app/_layout.tsx` with `Stack.Protected` - there are no navigate calls on sign-in or sign-out. Signed out reaches `login`, `verify-otp`, `register*` and `forgot-password`; a fresh sign-in reaches `welcome` (the AuthContext `welcome` flag, never set on a cold start); after that `(app)` plus `business-info` and `soon`, or `locked` for an owner whose subscription is inactive. Registration verifies the emailed code but deliberately does not sign in. The locked screen must not link to buying a plan - store billing rules forbid steering users to outside payment.

Typed routes are off on purpose (`app.json`) and `.expo/types` is excluded from `tsconfig.json`: on Windows the dev server's watcher writes non-route files into `router.d.ts`, so tsc results depended on whether `expo start` happened to be running.

## Code shared with the website

- `src/locales/en.json` and `bn.json` are verbatim copies of `Hatim/src/locales/`, read through `t(key)`; re-copy them when the website changes. The app's own screens do not use them - see Strings below.
- `src/lib/balanceTabs.ts`, `accountLedger.ts` and `profit.ts` are verbatim copies (only import paths differ); `src/lib/balance.ts` and `src/lib/dashboard.ts` are line-for-line lifts of `Hatim/src/pages/Balance.tsx` and `Dashboard.tsx`. Figures must equal the website's - re-copy rather than edit.
- `src/context/LanguageContext.tsx` and `src/lib/account.ts` are ports of the website's LanguageContext and AuthContext rules. Keep them agreeing with the originals.
- When porting more business logic, copy the tested pure modules from `Hatim/src/lib/` rather than rewriting them; `Hatim/src/lib/permissions.ts` must also stay in step with `hatim_Backend/src/app/shared/permissions.ts`.

## Screens and the design

The screens are built pixel-for-pixel from the Figma file "Furnify Mobile App" (a claude.ai Design artifact, 390pt frames). Only these are designed: sign-in, verification and welcome; registration with its verification and success; forgot password; the Dashboard with its period and account sheets; Business Info; the More menu; and Balance (Overview, Transfers, Ledger, Wallet). Everything else routes to `/soon` (`ComingSoon`) until it is designed - replace that route with the real screen rather than inventing a design.

Layout: `src/app/` holds routes only; screen parts live in `src/features/<area>/`; shared primitives in `src/components/`; pure logic in `src/lib/`; API calls and React Query hooks in `src/services/`.

## Styling

- Colours: `src/constants/theme.ts` - the `Slate` ramp for the sign-in and registration screens, `Zinc` for everything after sign-in, exactly as the design splits them. No other hex values in screens.
- Text: always `Txt`, never `Text`. It maps `fontWeight` to the right Inter or Hind Siliguri family for the current language, because React Native has no font fallback and no synthetic bold. Inputs set `fontFamily(lang, weight)` themselves.
- Icons: `DesignIcon` holds the design's own 24px paths; prefer it over lucide, whose current release redraws several of the shapes.
- Money: `formatMoney` or `useAmountShield().money` - `Tk 1,234` in English, `৳ ১,২৩৪` (lakh grouping) in Bangla, `****` while the eye button hides amounts.
- Reuse the primitives (Button, TextField, SelectField, DateField, BottomSheet, ChoiceSheet, ItemSheets, Toggle, StatTile, FilterChips, ScreenHeader, the toast) rather than restyling per screen. Light mode only.

## Strings

Each screen keeps its English and Bangla side by side in a `COPY` object (or `src/features/<area>/copy.ts`) read with `useCopy` - typed, so a missing translation fails to compile. Use the design's own Bangla wherever one of its `*Bn` frames shows it.
