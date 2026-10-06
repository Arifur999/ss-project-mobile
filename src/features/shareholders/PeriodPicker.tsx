import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChoiceSheet } from '@/components/ChoiceSheet';
import { DateField } from '@/components/DateField';
import { DesignIcon } from '@/components/DesignIcon';
import { Segmented } from '@/components/Segmented';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { SHAREHOLDER_COPY } from '@/features/shareholders/copy';
import { monthName, monthYearLabel, rangeLabel, todayISO } from '@/lib/dates';
import type { ShareholderPeriod } from '@/lib/shareholders';

export type PeriodMode = ShareholderPeriod['mode'];

export type PeriodState = { mode: PeriodMode; year: number; from: string; to: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** The window a period state covers, as the website's Shareholder Dashboard sets it. */
export function periodWindow(p: PeriodState, now = new Date()): ShareholderPeriod {
  if (p.mode === 'year') return { mode: 'year', from: `${p.year}-01-01`, to: `${p.year}-12-31` };
  if (p.mode === 'custom') {
    const [from, to] = p.from <= p.to ? [p.from, p.to] : [p.to, p.from];
    return { mode: 'custom', from, to };
  }
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return { mode: 'month', from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}` };
}

export function initialPeriod(now = new Date()): PeriodState {
  return { mode: 'month', year: now.getFullYear(), from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: todayISO() };
}

/** The short form used inside the card labels: "Oct 2026", "2026", or the range. */
export function usePeriodShort(p: PeriodState) {
  const { lang } = useLang();
  const now = new Date();
  if (p.mode === 'year') return lang === 'bn' ? bnDigits(p.year) : String(p.year);
  if (p.mode === 'custom') {
    const w = periodWindow(p);
    return rangeLabel(w.from, w.to, lang);
  }
  return monthYearLabel(now.getFullYear(), now.getMonth() + 1, lang);
}

/**
 * The Shareholder overview's period control: This month / Year / Custom range,
 * and under it a button naming the window - which picks the year or the range.
 */
export function PeriodPicker({ value, onChange }: { value: PeriodState; onChange: (p: PeriodState) => void }) {
  const t = useCopy(SHAREHOLDER_COPY);
  const { lang } = useLang();
  const [sheet, setSheet] = useState<'year' | 'range' | null>(null);
  const [draft, setDraft] = useState({ from: value.from, to: value.to });
  const now = new Date();

  const pill =
    value.mode === 'year'
      ? lang === 'bn'
        ? bnDigits(value.year)
        : String(value.year)
      : value.mode === 'custom'
        ? value.from && value.to
          ? rangeLabel(periodWindow(value).from, periodWindow(value).to, lang)
          : t.pickRange
        : `${monthName(now.getMonth() + 1, lang)} ${lang === 'bn' ? bnDigits(now.getFullYear()) : now.getFullYear()}`;

  // The website offers 2025 (when Furnify began) to twenty years ahead.
  const years = Array.from({ length: now.getFullYear() + 20 - 2025 + 1 }, (_, i) => 2025 + i);

  return (
    <View style={styles.wrap}>
      <Segmented
        label={t.periodLabel}
        value={value.mode}
        onChange={(mode) => onChange({ ...value, mode })}
        segments={(['month', 'year', 'custom'] as PeriodMode[]).map((key) => ({ key, label: t.periods[key] }))}
      />
      <Pressable
        accessibilityRole="button"
        disabled={value.mode === 'month'}
        onPress={() => {
          if (value.mode === 'year') setSheet('year');
          if (value.mode === 'custom') {
            setDraft({ from: value.from, to: value.to });
            setSheet('range');
          }
        }}
        style={styles.pill}>
        <DesignIcon name="calendar" size={18} color={Zinc[900]} />
        <Txt style={styles.pillText}>{pill}</Txt>
        <DesignIcon name="chevronDown" size={18} color={Zinc[900]} strokeWidth={2} />
      </Pressable>

      <ChoiceSheet
        open={sheet === 'year'}
        onClose={() => setSheet(null)}
        title={t.chooseYear}
        closeLabel={t.close}
        options={years.map((y) => ({ key: String(y), label: lang === 'bn' ? bnDigits(y) : String(y) }))}
        selected={String(value.year)}
        onSelect={(y) => onChange({ ...value, year: Number(y) })}
      />

      <BottomSheet open={sheet === 'range'} onClose={() => setSheet(null)} closeLabel={t.close}>
        <Txt accessibilityRole="header" style={styles.sheetTitle}>
          {t.pickRange}
        </Txt>
        <View style={styles.pair}>
          <View style={styles.half}>
            <DateField label={t.from} value={draft.from} onChange={(from) => setDraft((d) => ({ ...d, from }))} />
          </View>
          <View style={styles.half}>
            <DateField label={t.to} value={draft.to} onChange={(to) => setDraft((d) => ({ ...d, to }))} />
          </View>
        </View>
        <Button
          title={t.save}
          variant="pill"
          onPress={() => {
            onChange({ ...value, from: draft.from, to: draft.to });
            setSheet(null);
          }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  pill: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Zinc[200],
    borderRadius: 14,
    backgroundColor: White,
  },
  pillText: { flex: 1, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  sheetTitle: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  pair: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, minWidth: 0 },
});
