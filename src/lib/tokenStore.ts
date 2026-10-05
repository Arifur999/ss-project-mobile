import * as SecureStore from 'expo-secure-store';

// The session pair, kept in the device keystore (Android Keystore / iOS
// Keychain), never in AsyncStorage, which is plain files on disk.
//
// The backend sends these in the response body only for requests carrying
// `X-Client: mobile` - see hatim_Backend/src/app/shared/mobileClient.ts.
// Held in memory as well, because every API call needs the access token and a
// keystore read per request is slow.

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  /** Time left in the session when the server issued this pair. */
  expiresInMs: number;
}

const ACCESS_KEY = 'furnify.accessToken';
const REFRESH_KEY = 'furnify.refreshToken';
const EXPIRES_AT_KEY = 'furnify.sessionExpiresAt';

let cache: { accessToken: string | null; refreshToken: string | null; expiresAt: number | null } | null = null;

async function load() {
  if (!cache) {
    const [accessToken, refreshToken, expiresAt] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(EXPIRES_AT_KEY),
    ]);
    cache = { accessToken, refreshToken, expiresAt: expiresAt ? Number(expiresAt) : null };
  }
  return cache;
}

export const tokenStore = {
  async getAccessToken() {
    return (await load()).accessToken;
  },

  async getRefreshToken() {
    return (await load()).refreshToken;
  },

  /** True while a refresh token exists and its session has not run out. */
  async hasSession() {
    const { refreshToken, expiresAt } = await load();
    return Boolean(refreshToken) && (expiresAt === null || expiresAt > Date.now());
  },

  async save(tokens: SessionTokens) {
    const expiresAt = Date.now() + tokens.expiresInMs;
    cache = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt };
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
      SecureStore.setItemAsync(EXPIRES_AT_KEY, String(expiresAt)),
    ]);
  },

  async clear() {
    cache = { accessToken: null, refreshToken: null, expiresAt: null };
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
    ]);
  },
};
