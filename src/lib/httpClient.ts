import axios, { AxiosError, create, isAxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL } from './config';
import { tokenStore, type SessionTokens } from './tokenStore';

// The app's counterpart of Hatim/src/lib/httpClient.ts. Same API, same response
// envelope; the difference is how the session travels. The website rides on an
// httpOnly cookie pair. The app sends `X-Client: mobile`, gets the pair in the
// response body, keeps it in the keystore, and attaches the access token itself.

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: { page: number; limit: number; total: number; totalPage: number };
}

const MOBILE_HEADERS = { 'X-Client': 'mobile' };

export const api = create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', ...MOBILE_HEADERS },
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Told when the session is definitely over (the server rejected the refresh
// token), so the auth state can drop to the sign-in screen.
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

// One refresh at a time: when several requests hit a 401 together they all wait
// on the same call, because the server rotates the refresh token on every use
// and a second, parallel refresh would present one that is already spent.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await tokenStore.getRefreshToken();
      if (!refreshToken) return false;
      try {
        const res = await axios.post<ApiEnvelope<{ tokens?: SessionTokens }>>(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { headers: MOBILE_HEADERS, timeout: 30000 },
        );
        const tokens = res.data?.data?.tokens;
        if (!tokens) return false;
        await tokenStore.save(tokens);
        return true;
      } catch (error) {
        // Only the server saying no ends the session. A dropped connection or a
        // deploy restarting the API must not sign anybody out - the next request
        // simply tries again.
        if (isAxiosError(error) && error.response?.status === 401) {
          await tokenStore.clear();
          onSessionExpired?.();
        }
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// These answer 401 for a wrong password or code, which no refresh can fix.
const NO_REFRESH = ['/auth/login', '/auth/verify-otp', '/auth/refresh-token'];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = original?.url ?? '';
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !NO_REFRESH.some((path) => url.includes(path))
    ) {
      original._retried = true;
      if (await refreshSession()) return api(original);
    }
    return Promise.reject(error);
  },
);

export const isUnauthorized = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 401;

/** A request that never reached the server, as opposed to one it refused. */
export const isNetworkError = (error: unknown) =>
  isAxiosError(error) && !error.response;

/** The server's own message where there is one - it is written for the user. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && message) return message;
    if (!error.response) return 'Could not reach the server. Check your internet connection.';
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Calls the API and unwraps the { success, data, message } envelope. */
export const http = {
  get: async <T>(url: string, config?: AxiosRequestConfig) =>
    (await api.get<ApiEnvelope<T>>(url, config)).data.data,
  post: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    (await api.post<ApiEnvelope<T>>(url, body, config)).data.data,
  put: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    (await api.put<ApiEnvelope<T>>(url, body, config)).data.data,
  patch: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    (await api.patch<ApiEnvelope<T>>(url, body, config)).data.data,
  delete: async <T>(url: string, config?: AxiosRequestConfig) =>
    (await api.delete<ApiEnvelope<T>>(url, config)).data.data,
};
