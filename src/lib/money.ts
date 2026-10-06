import { bnDigits, westernDigits, type Lang } from '@/context/LanguageContext';

// Money as the Figma screens print it:
//   English  "Tk 49,452"    - thousands grouped in threes
//   Bangla   "৳ ৪৯,৪৫২"     - lakh grouping (১,৯৫,৬২২), Bangla digits
//   hidden   "****"         - the eye button on Dashboard and Balance
//
// Whole taka only, rounded the way the website rounds (Hatim/src/lib/utils.ts
// roundTaka), so a figure here matches the same figure on the site. The space is
// non-breaking: an amount never wraps between its symbol and its number.

export const HIDDEN_AMOUNT = '****';

/** Same rule as the website: half away from zero, NaN and null become 0. */
export function roundTaka(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return (numeric < 0 ? -Math.round(-numeric) : Math.round(numeric)) || 0;
}

/** 1234567 -> "12,34,567". Done by hand: Hermes' Intl may not carry en-IN. */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/** 1234567 -> "1,234,567". */
export function groupWestern(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** The number part alone, grouped and in the language's digits. */
export function formatNumber(value: unknown, lang: Lang): string {
  const n = roundTaka(value);
  const digits = String(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  return lang === 'bn' ? sign + bnDigits(groupIndian(digits)) : sign + groupWestern(digits);
}

export function formatMoney(value: unknown, lang: Lang, hidden = false): string {
  if (hidden) return HIDDEN_AMOUNT;
  return (lang === 'bn' ? '৳ ' : 'Tk ') + formatNumber(value, lang);
}

/**
 * An amount the user typed: Bangla digits, commas and spaces allowed. NaN when
 * it is not a number at all, so a form can tell "0" from "nonsense".
 */
export function parseAmount(input: string, { allowNegative = false } = {}): number {
  const clean = westernDigits(String(input ?? '')).replace(/[,\s]/g, '');
  const pattern = allowNegative ? /^-?\d+(\.\d+)?$/ : /^\d+(\.\d+)?$/;
  return pattern.test(clean) ? Number(clean) : NaN;
}

/** Axis labels: 0, 8k, 400k, 1.2M - no currency, as the design draws them. */
export function tickLabel(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (Math.abs(value) >= 1_000) return `${trim(value / 1_000)}k`;
  return String(value);
}

const trim = (n: number) => String(Math.round(n * 10) / 10);
