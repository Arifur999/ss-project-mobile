import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import bn from '@/locales/bn.json';
import en from '@/locales/en.json';
import { mobileBn, mobileEn } from '@/locales/mobile';

// Port of Hatim/src/context/LanguageContext.tsx: same keys, same Bangla digits,
// same money and date formats, so a figure reads identically in both. Bangla is
// the default, as on the website.

export type Lang = 'en' | 'bn';

const locales: Record<Lang, Record<string, string>> = {
  en: { ...en, ...mobileEn },
  bn: { ...bn, ...mobileBn },
};

const STORAGE_KEY = 'app_lang';

const BN_DIGITS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};
const toBnDigits = (str: string) => str.replace(/[0-9]/g, (d) => BN_DIGITS[d]);

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const BN_WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Money, to the whole taka - same rule as Hatim/src/lib/utils.ts roundTaka. */
export function roundTaka(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return (numeric < 0 ? -Math.round(-numeric) : Math.round(numeric)) || 0;
}

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** `vars` fills {name} placeholders. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatNum: (n: number) => string;
  formatCurr: (n: number) => string;
  formatDateShort: (date: string | Date) => string;
  formatDateLong: (date: string | Date) => string;
  monthName: (m: number) => string;
}

const LangContext = createContext<LangContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('bn');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'bn') setLangState(saved);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let text = locales[lang][key] ?? locales.en[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          const shown = lang === 'bn' ? toBnDigits(String(value)) : String(value);
          text = text.replace(`{${name}}`, shown);
        }
      }
      return text;
    },
    [lang],
  );

  const formatNum = useCallback(
    (n: number) => {
      const safe = Number(n);
      const str = (Number.isFinite(safe) ? safe : 0).toLocaleString('en-US');
      return lang === 'bn' ? toBnDigits(str) : str;
    },
    [lang],
  );

  // "৳" only in Bangla; English uses "Tk" with a non-breaking space so an
  // amount never wraps across two lines.
  const formatCurr = useCallback(
    (n: number) => {
      const amount = roundTaka(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
      return lang === 'bn' ? '৳' + toBnDigits(amount) : 'Tk ' + amount;
    },
    [lang],
  );

  const formatDateShort = useCallback(
    (date: string | Date) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!d || isNaN(d.getTime())) return '';
      const str = format(d, 'dd-MMM-yyyy');
      return lang === 'bn' ? toBnDigits(str) : str;
    },
    [lang],
  );

  const formatDateLong = useCallback(
    (date: string | Date) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!d || isNaN(d.getTime())) return '';
      const dayName = lang === 'bn' ? BN_WEEKDAYS[d.getDay()] : EN_WEEKDAYS[d.getDay()];
      return `${dayName}, ${formatDateShort(d)}`;
    },
    [lang, formatDateShort],
  );

  const monthName = useCallback((m: number) => t(`month_${MONTH_KEYS[m - 1]}`), [t]);

  const value = useMemo(
    () => ({ lang, setLang, t, formatNum, formatCurr, formatDateShort, formatDateLong, monthName }),
    [lang, setLang, t, formatNum, formatCurr, formatDateShort, formatDateLong, monthName],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}

/** A screen's own strings, both languages side by side, as the Figma files keep them. */
export type Copy<T> = { en: T; bn: T };

/**
 * The current language's half of a screen's copy. Typed, so a key present in
 * English and missing in Bangla is a compile error rather than a blank label.
 */
export function useCopy<T>(copy: Copy<T>): T {
  return copy[useLang().lang];
}

const BN_DIGIT_CHARS = '০১২৩৪৫৬৭৮৯';

/** Western digits to Bangla ones; everything else passes through. */
export const bnDigits = (value: string | number) =>
  String(value).replace(/[0-9]/g, (d) => BN_DIGIT_CHARS[Number(d)]);

/** Bangla digits a user typed back to Western ones, so they can be parsed. */
export const westernDigits = (value: string) =>
  value.replace(/[০-৯]/g, (d) => String(BN_DIGIT_CHARS.indexOf(d)));
