import type { Account } from '@/lib/account';
import { http } from '@/lib/httpClient';
import type { SessionTokens } from '@/lib/tokenStore';

// Login normally ends in an emailed code: the password alone never starts a
// session. When the server's OTP gate is off it signs straight in instead.
export interface NeedsEmailConfirmation {
  needsEmailConfirmation: true;
  email: string;
}

/** A signed-in answer. `tokens` is present because the app sends X-Client: mobile. */
export type SignedIn = Account & { tokens?: SessionTokens };

export const loginRequest = (email: string, password: string) =>
  http.post<SignedIn | NeedsEmailConfirmation>('/auth/login', { email, password });

export const verifyOtpRequest = (email: string, otp: string) =>
  http.post<SignedIn>('/auth/verify-otp', { email, otp });

/** The server enforces a 60-second cooldown between sends. */
export const resendOtpRequest = (email: string) =>
  http.post<{ sent: boolean; email: string }>('/auth/resend-otp', { email });

export const getMeRequest = () => http.get<Account>('/auth/me');
