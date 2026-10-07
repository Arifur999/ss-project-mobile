import { bnDigits, type Lang } from '@/context/LanguageContext';

// Dates the way the design writes them - "18 May 2026", "Thu, 24 Sep 2026",
// "01 – 30 Sep 2026" - in both languages. Data is exchanged as YYYY-MM-DD
// strings and always read at local noon, so a timezone offset can never push a
// day into its neighbour.

const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const BN_MONTHS_SHORT = ['জান', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্ট', 'অক্ট', 'নভে', 'ডিসে'];
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BN_DAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];

/** 1-based month to its name. */
export const monthName = (month: number, lang: Lang) => (lang === 'bn' ? BN_MONTHS : EN_MONTHS)[month - 1] ?? '';
export const monthShort = (month: number, lang: Lang) => (lang === 'bn' ? BN_MONTHS_SHORT : EN_MONTHS_SHORT)[month - 1] ?? '';

const digits = (value: string | number, lang: Lang) => (lang === 'bn' ? bnDigits(value) : String(value));
const pad2 = (n: number) => String(n).padStart(2, '0');

/** A Date to the YYYY-MM-DD the API speaks, in local time. */
export const toISODate = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const todayISO = () => toISODate(new Date());

/** YYYY-MM-DD (or a longer ISO timestamp) to a Date at local noon. */
export function fromISODate(iso: string): Date | null {
  const day = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** "18 May 2026" / "১৮ মে ২০২৬". */
export function dateLabel(iso: string, lang: Lang): string {
  const d = fromISODate(iso);
  if (!d) return '';
  return `${digits(d.getDate(), lang)} ${lang === 'bn' ? monthName(d.getMonth() + 1, lang) : monthShort(d.getMonth() + 1, lang)} ${digits(d.getFullYear(), lang)}`;
}

/** "24 Sep" / "২৪ সেপ্ট" - the cashflow axis. */
export function dayMonthLabel(iso: string, lang: Lang): string {
  const d = fromISODate(iso);
  if (!d) return '';
  return `${digits(d.getDate(), lang)} ${monthShort(d.getMonth() + 1, lang)}`;
}

/** "Thu, 24 Sep 2026" - the cashflow caption once a day is tapped. */
export function weekdayDateLabel(iso: string, lang: Lang): string {
  const d = fromISODate(iso);
  if (!d) return '';
  return `${(lang === 'bn' ? BN_DAYS : EN_DAYS)[d.getDay()]}, ${digits(d.getDate(), lang)} ${monthShort(d.getMonth() + 1, lang)} ${digits(d.getFullYear(), lang)}`;
}

/** "Sep 2026" / "সেপ্ট ২০২৬" - a month picker label. */
export const monthYearLabel = (year: number, month: number, lang: Lang) =>
  `${monthShort(month, lang)} ${digits(year, lang)}`;

/**
 * A span, collapsed the way the design writes it:
 *   same day      "30 Sep 2026"
 *   same month    "01 – 30 Sep 2026"
 *   same year     "01 Jan – 31 Dec 2026"
 *   otherwise     "26 Dec 2025 – 01 Jan 2026"
 */
export function rangeLabel(startISO: string, endISO: string, lang: Lang): string {
  const a = fromISODate(startISO);
  const b = fromISODate(endISO);
  if (!a || !b) return '';
  const day = (d: Date, padded: boolean) => digits(padded ? pad2(d.getDate()) : d.getDate(), lang);
  const mon = (d: Date) => monthShort(d.getMonth() + 1, lang);
  const yr = (d: Date) => digits(d.getFullYear(), lang);
  if (startISO.slice(0, 10) === endISO.slice(0, 10)) return `${day(b, false)} ${mon(b)} ${yr(b)}`;
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${day(a, true)} – ${day(b, true)} ${mon(b)} ${yr(b)}`;
  }
  if (a.getFullYear() === b.getFullYear()) return `${day(a, a.getDate() < 10)} ${mon(a)} – ${day(b, false)} ${mon(b)} ${yr(b)}`;
  return `${day(a, true)} ${mon(a)} ${yr(a)} – ${day(b, true)} ${mon(b)} ${yr(b)}`;
}

/** "9:30 AM" / "৯:৩০ AM" from a stored "09:30"; '' when there is none. */
export function timeLabel(hhmm: string, lang: Lang): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''));
  if (!match) return '';
  const hour = Number(match[1]);
  const text = `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
  return lang === 'bn' ? bnDigits(text) : text;
}
