import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useLang } from '@/context/LanguageContext';
import { formatMoney } from '@/lib/money';

/**
 * The eye button on Dashboard and Balance: one switch for the whole app, kept
 * across launches, so hiding the figures before handing the phone to someone
 * keeps them hidden on every screen. Visible by default, as the design opens.
 */
type AmountShield = {
  hidden: boolean;
  toggle: () => void;
  /** formatMoney in the current language, honouring the switch. */
  money: (value: unknown) => string;
};

const STORAGE_KEY = 'amounts_hidden';

const ShieldContext = createContext<AmountShield | null>(null);

export function AmountShieldProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => setHidden(saved === '1'))
      .catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setHidden((was) => {
      AsyncStorage.setItem(STORAGE_KEY, was ? '0' : '1').catch(() => {});
      return !was;
    });
  }, []);

  const money = useCallback((value: unknown) => formatMoney(value, lang, hidden), [lang, hidden]);

  const value = useMemo(() => ({ hidden, toggle, money }), [hidden, toggle, money]);
  return <ShieldContext.Provider value={value}>{children}</ShieldContext.Provider>;
}

export function useAmountShield() {
  const ctx = useContext(ShieldContext);
  if (!ctx) throw new Error('useAmountShield must be used within AmountShieldProvider');
  return ctx;
}
