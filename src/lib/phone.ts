import { Linking } from 'react-native';

import { westernDigits } from '@/context/LanguageContext';

// A customer's number by Hatim/src/lib/phone.ts and customerPhone.ts: 11
// digits starting 01, spaces and dashes ignored, and two numbers the same when
// their digits are. Bangla digits read as their Western twins - the website
// never sees them, a phone's Bangla keyboard types them.

/** 01 and nine more digits - the website's isValidBdPhone. */
export const isValidBdPhone = (phone: string) => /^01[0-9]{9}$/.test(westernDigits(String(phone || '')).replace(/[\s-]/g, ''));

/** The digits alone, so "01712-345678" and "01712345678" are one number. */
export const phoneDigits = (phone: string) => westernDigits(String(phone || '')).replace(/\D/g, '');

/**
 * A `tel:` link holding the number alone - a leading + and its digits - so
 * nothing else typed into a phone field (a `;`, `*`, `#` or a second number)
 * reaches the dialer. Null when there are no digits to call.
 */
export function telUrl(phone: string): string | null {
  const text = westernDigits(String(phone || '')).trim();
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;
  return `tel:${text.startsWith('+') ? '+' : ''}${digits}`;
}

/** Opens the dialer on a number, ready to call; does nothing without digits. */
export function callPhone(phone: string) {
  const url = telUrl(phone);
  if (url) Linking.openURL(url).catch(() => {});
}

/** Whether some other customer already has this number; `excludeId` may keep their own. */
export function phoneBelongsToAnotherCustomer(phone: string, customers: { id: string; phone?: string | null }[], excludeId?: string): boolean {
  const digits = phoneDigits(phone);
  if (!digits) return false;
  return customers.some((customer) => customer.id !== excludeId && phoneDigits(customer.phone || '') === digits);
}
