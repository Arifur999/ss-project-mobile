import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Account } from '@/lib/account';
import { isUnauthorized, setSessionExpiredHandler } from '@/lib/httpClient';
import { tokenStore } from '@/lib/tokenStore';
import {
  getMeRequest,
  loginRequest,
  resendOtpRequest,
  verifyOtpRequest,
  type SignedIn,
} from '@/services/auth.services';

/**
 * - loading:   reading the keystore / asking /auth/me on launch
 * - signedOut: no session; show the sign-in screens
 * - signedIn:  `account` is set
 * - offline:   a session exists but the server could not be reached on launch
 *              and there is no saved account to show meanwhile
 */
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'offline';

type SignInResult = { kind: 'signedIn' } | { kind: 'needsOtp'; email: string };

interface AuthContextType {
  status: AuthStatus;
  account: Account | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-read the account from the server (also the "Try again" when offline). */
  refreshAccount: () => Promise<void>;
}

/**
 * The last account the server confirmed. Not a credential - the tokens in the
 * keystore are what authorise requests. It lets the app open straight onto the
 * user's screens when the network is slow instead of a spinner, as the
 * website's session hint does.
 */
const ACCOUNT_HINT_KEY = 'auth_account_hint';

const saveHint = (account: Account) =>
  AsyncStorage.setItem(ACCOUNT_HINT_KEY, JSON.stringify(account)).catch(() => {});

async function readHint(): Promise<Account | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_HINT_KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

export class ServerTooOldError extends Error {
  constructor() {
    super('The server did not return mobile tokens.');
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [account, setAccount] = useState<Account | null>(null);

  const dropSession = useCallback(async () => {
    await tokenStore.clear();
    await AsyncStorage.removeItem(ACCOUNT_HINT_KEY).catch(() => {});
    queryClient.clear();
    setAccount(null);
    setStatus('signedOut');
  }, [queryClient]);

  const loadAccount = useCallback(async () => {
    if (!(await tokenStore.hasSession())) {
      await dropSession();
      return;
    }
    try {
      const me = await getMeRequest();
      setAccount(me);
      setStatus('signedIn');
      saveHint(me);
    } catch (error) {
      if (isUnauthorized(error)) {
        await dropSession();
        return;
      }
      // Unreachable, not refused: keep the session and show what we last knew.
      const hint = await readHint();
      if (hint) {
        setAccount(hint);
        setStatus('signedIn');
      } else {
        setStatus('offline');
      }
    }
  }, [dropSession]);

  useEffect(() => {
    // Every state change in loadAccount follows an await, so nothing here
    // re-renders synchronously - which is what this rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      dropSession();
    });
    return () => setSessionExpiredHandler(null);
  }, [dropSession]);

  const acceptSession = useCallback(async (result: SignedIn) => {
    // The server only puts tokens in the body for X-Client: mobile. Without
    // them the backend predates the mobile change and nothing can be stored.
    if (!result.tokens) throw new ServerTooOldError();
    const { tokens, ...me } = result;
    await tokenStore.save(tokens);
    setAccount(me);
    setStatus('signedIn');
    saveHint(me);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      const result = await loginRequest(email.trim(), password);
      if ('needsEmailConfirmation' in result) return { kind: 'needsOtp', email: result.email };
      await acceptSession(result);
      return { kind: 'signedIn' };
    },
    [acceptSession],
  );

  const verifyOtp = useCallback(
    async (email: string, otp: string) => {
      await acceptSession(await verifyOtpRequest(email, otp.trim()));
    },
    [acceptSession],
  );

  const resendOtp = useCallback(async (email: string) => {
    await resendOtpRequest(email);
  }, []);

  // Tokens are stateless JWTs and /auth/logout only clears website cookies, so
  // signing out of the app is forgetting the pair on this device.
  const signOut = useCallback(() => dropSession(), [dropSession]);

  const value = useMemo(
    () => ({ status, account, signIn, verifyOtp, resendOtp, signOut, refreshAccount: loadAccount }),
    [status, account, signIn, verifyOtp, resendOtp, signOut, loadAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
