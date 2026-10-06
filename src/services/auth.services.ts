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

export interface RegisterOwnerInput {
  fullName: string;
  businessName: string;
  phone: string;
  email: string;
  password: string;
  address?: string;
}

/** Creates the owner and emails a code; nobody is signed in until it is verified. */
export const registerOwnerRequest = (input: RegisterOwnerInput) =>
  http.post<NeedsEmailConfirmation>('/auth/register', input);

/** Emails a 6-digit reset code. Answers the same whether or not the email exists. */
export const forgotPasswordRequest = (email: string) =>
  http.post<{ message: string }>('/auth/forgot-password', { email });

export const resetPasswordRequest = (email: string, otp: string, password: string) =>
  http.post<{ message: string }>('/auth/reset-password', { email, otp, password });
