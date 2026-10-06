import { westernDigits } from '@/context/LanguageContext';

// The checks the Figma prototypes run before submitting, lifted as written so
// the app rejects exactly what the design says it rejects.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value: string) => EMAIL.test(String(value || '').trim());

/**
 * A Bangladeshi mobile number as the user may type it - Bangla digits, spaces,
 * dashes, +880 or 880 - reduced to the 01XXXXXXXXX form.
 */
export function normalizePhone(value: string): string {
  let v = westernDigits(String(value || '')).replace(/[\s-]/g, '');
  if (v.startsWith('+880')) v = '0' + v.slice(4);
  else if (v.startsWith('880')) v = '0' + v.slice(3);
  return v;
}

/** 11 digits, 01 then an operator digit 3-9. */
export const isBdPhone = (value: string) => /^01[3-9][0-9]{8}$/.test(normalizePhone(value));

/** The server's minimum, so the form fails before the request does. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Which errors a form should show right now: every one after a submit attempt,
 * otherwise only for fields the user has left with something typed in them -
 * an empty field is not shouted at just for being tabbed through.
 */
export function visibleErrors<K extends string>(
  all: Partial<Record<K, string>>,
  values: Record<K, string>,
  touched: Partial<Record<K, boolean>>,
  submitted: boolean,
): Partial<Record<K, string>> {
  const shown: Partial<Record<K, string>> = {};
  for (const key of Object.keys(all) as K[]) {
    if (submitted || (touched[key] && values[key])) shown[key] = all[key];
  }
  return shown;
}
