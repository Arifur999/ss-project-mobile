# Furnify Mobile

The mobile app for Furnify - furniture business management. Built with Expo (React Native + TypeScript) on the same API as the website.

## Run it on your phone

1. Install **Expo Go** from the Play Store on an Android phone.
2. Put the phone and this computer on the same WiFi.
3. In this folder:

   ```bash
   npm install
   npx expo start
   ```

4. Scan the QR code in the terminal with Expo Go. Saving a file reloads the app on the phone.

The app uses the live API by default. To point it at a backend running on this computer, copy `.env.example` to `.env.local` and set your computer's LAN IP.

## Checks

```bash
npx tsc --noEmit
npx expo lint
```

## Backend requirement

Sign-in needs the backend change that returns tokens to `X-Client: mobile` requests (`hatim_Backend/src/app/shared/mobileClient.ts`). Until that is deployed, sign-in shows "The server does not support the mobile app yet".
