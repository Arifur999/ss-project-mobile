// The live API by default, so a fresh checkout runs against real data with no
// setup. To use a backend on your own machine, put its LAN address in .env.local -
// not localhost, which on a phone is the phone itself:
//   EXPO_PUBLIC_API_BASE_URL=http://192.168.0.105:5000/api/v1
// Restart `npx expo start` after changing it; EXPO_PUBLIC_ values are inlined
// at bundle time.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'https://furnify.softech.agency/api/v1';
