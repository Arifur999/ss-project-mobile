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
npx tsc --noEmit         # typecheck (also: npm run typecheck)
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

Routing is guarded in `src/app/_layout.tsx` with `Stack.Protected`: `(tabs)` when signed in, `locked` for an owner whose subscription is inactive, `login`/`verify-otp` otherwise. The locked screen must not link to buying a plan - store billing rules forbid steering users to outside payment.

## Code shared with the website

- `src/locales/en.json` and `bn.json` are verbatim copies of `Hatim/src/locales/`; re-copy them when the website changes, and put app-only strings in `src/locales/mobile.ts`.
- `src/context/LanguageContext.tsx` and `src/lib/account.ts` are ports of the website's LanguageContext and AuthContext rules (Bangla digits, `৳`/`Tk` money format, `dd-MMM-yyyy` dates, subscription lock). Keep them agreeing with the originals.
- When porting more business logic, copy the tested pure modules from `Hatim/src/lib/` (profit, rolling targets, permissions...) rather than rewriting them; `Hatim/src/lib/permissions.ts` must also stay in step with `hatim_Backend/src/app/shared/permissions.ts`.

## Styling

Plain `StyleSheet` with tokens in `src/constants/theme.ts` (the website's palette) and primitives in `src/components/ui.tsx`. This is a placeholder until the Figma design is ready; screens should use only those so a restyle stays in two files. Light mode only.
