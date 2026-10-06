import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy, useLang, westernDigits } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SHAREHOLDER_COPY } from '@/features/shareholders/copy';
import type { Account } from '@/lib/balance';
import { monthName, todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { belongsTo } from '@/lib/shareholders';
import {
  createProfitWithdrawal,
  updateProfitWithdrawal,
  useShareholderWrite,
  type Shareholder,
} from '@/services/shareholders.services';

type Row = Record<string, any>;
type Form = {
  date: string;
  owner: string;
  amount: string;
  fromMonth: string;
  fromYear: string;
  toMonth: string;
  toYear: string;
  account: string;
  note: string;
};

function blank(): Form {
  const now = new Date();
  const m = String(now.getMonth() + 1);
  const y = String(now.getFullYear());
  return { date: todayISO(), owner: '', amount: '', fromMonth: m, fromYear: y, toMonth: m, toYear: y, account: '', note: '' };
}

/** New or edit profit withdrawal: who, how much, for which months, from which account. */
export function ProfitFormSheet({
  open,
  onClose,
  editing,
  shareholders,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  editing: Row | null;
  shareholders: Shareholder[];
  accounts: Account[];
}) {
  const t = useCopy(SHAREHOLDER_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const write = useShareholderWrite();
  const [form, setForm] = useState<Form>(blank);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? String(editing?.id ?? 'new') : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      if (editing) {
        const date = String(editing.date || '').slice(0, 10) || todayISO();
        const fm = String(editing.profit_month || Number(date.slice(5, 7)));
        const fy = String(editing.profit_year || date.slice(0, 4));
        setForm({
          date,
          owner: shareholders.find((s) => belongsTo(editing, s))?.id ?? '',
          amount: String(Number(editing.amount || 0)),
          fromMonth: fm,
          fromYear: fy,
          toMonth: String(editing.to_month || fm),
          toYear: String(editing.to_year || fy),
          account: editing.account_id ?? '',
          note: editing.notes ?? '',
        });
      } else {
        setForm(blank());
      }
      setSubmitted(false);
      setError(null);
    }
  }

  const amount = parseAmount(form.amount);
  const fromYear = westernDigits(form.fromYear);
  const toYear = westernDigits(form.toYear);
  const fyOk = /^\d{4}$/.test(fromYear);
  const tyOk = /^\d{4}$/.test(toYear);
  const errors: Partial<Record<'owner' | 'amount' | 'account' | 'fromYear' | 'toYear' | 'year' | 'range', string>> = {};
  if (!form.owner) errors.owner = t.errOwner;
  if (!(amount > 0)) errors.amount = t.errAmount;
  if (!form.account) errors.account = t.errAccount;
  if (!fyOk) errors.fromYear = ' ';
  if (!tyOk) errors.toYear = ' ';
  if (!fyOk || !tyOk) errors.year = t.errYear;
  else if (Number(toYear) * 12 + Number(form.toMonth) < Number(fromYear) * 12 + Number(form.fromMonth)) errors.range = t.errRange;
  const shown = submitted ? errors : {};
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const months = Array.from({ length: 12 }, (_, i) => ({ key: String(i + 1), label: monthName(i + 1, lang) }));

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const holder = shareholders.find((s) => s.id === form.owner);
    const account = accounts.find((a) => a.id === form.account);
    const input = {
      date: form.date,
      shareholder_id: form.owner,
      shareholder_name: holder?.name ?? '',
      amount,
      account_id: form.account,
      account_name: account?.name ?? '',
      profit_month: Number(form.fromMonth),
      profit_year: Number(fromYear),
      to_month: Number(form.toMonth),
      to_year: Number(toYear),
      notes: form.note.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updateProfitWithdrawal(String(editing.id), input) : createProfitWithdrawal(input)));
      toast.show(editing ? t.profitUpdated : t.profitSaved);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={() => !saving && onClose()} closeLabel={t.close}>
      <Txt accessibilityRole="header" style={styles.title}>
        {editing ? t.editProfit : t.newProfit}
      </Txt>
      <View style={styles.pair}>
        <View style={styles.half}>
          <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />
        </View>
        <View style={styles.half}>
          <TextField
            tone="zinc"
            label={t.amount}
            placeholder="0"
            value={form.amount}
            onChangeText={(a) => set({ amount: a })}
            error={shown.amount}
            plainError
            keyboardType="decimal-pad"
            inputStyle={styles.amount}
          />
        </View>
      </View>
      <SelectField
        label={t.owner}
        placeholder={t.select}
        value={form.owner}
        options={shareholders.map((s) => ({ key: s.id, label: s.name }))}
        onChange={(owner) => set({ owner })}
        error={shown.owner}
        closeLabel={t.close}
      />
      <View style={styles.months}>
        <Txt style={styles.legend}>{t.whichMonths}</Txt>
        <MonthRow
          label={t.from}
          month={form.fromMonth}
          year={form.fromYear}
          months={months}
          onMonth={(fromMonth) => set({ fromMonth })}
          onYear={(fromYear) => set({ fromYear })}
          monthLabel={t.fromMonth}
          yearLabel={t.fromYear}
          yearError={!!shown.fromYear}
          close={t.close}
        />
        <MonthRow
          label={t.to}
          month={form.toMonth}
          year={form.toYear}
          months={months}
          onMonth={(toMonth) => set({ toMonth })}
          onYear={(toYear) => set({ toYear })}
          monthLabel={t.toMonth}
          yearLabel={t.toYear}
          yearError={!!shown.toYear}
          monthError={!!shown.range}
          close={t.close}
        />
        <FieldError plain>{shown.year ?? shown.range}</FieldError>
      </View>
      <SelectField
        label={t.account}
        placeholder={t.select}
        value={form.account}
        options={accounts.filter((a) => a.is_active || a.id === form.account).map((a) => ({ key: a.id, label: a.name }))}
        onChange={(account) => set({ account })}
        error={shown.account}
        closeLabel={t.close}
      />
      <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.note} onChangeText={(note) => set({ note })} minHeight={72} />
      <AlertBanner tone="error">{error}</AlertBanner>
      <View style={styles.actions}>
        <Button title={saving ? t.saving : t.save} variant="pill" onPress={save} busy={saving} style={styles.grow} />
        <Button title={t.cancel} variant="pillOutline" onPress={onClose} disabled={saving} style={styles.grow} />
      </View>
    </BottomSheet>
  );
}

/** "From [month ⌄] [year]" - a 44 / flexible / 96 grid, as drawn. */
function MonthRow({
  label,
  month,
  year,
  months,
  onMonth,
  onYear,
  monthLabel,
  yearLabel,
  yearError,
  monthError,
  close,
}: {
  label: string;
  month: string;
  year: string;
  months: { key: string; label: string }[];
  onMonth: (m: string) => void;
  onYear: (y: string) => void;
  monthLabel: string;
  yearLabel: string;
  yearError: boolean;
  monthError?: boolean;
  close: string;
}) {
  return (
    <View style={styles.row}>
      <Txt style={styles.rowLabel}>{label}</Txt>
      <View style={styles.rowMonth}>
        <SelectField placeholder={monthLabel} sheetTitle={monthLabel} value={month} options={months} onChange={onMonth} error={monthError ? ' ' : null} closeLabel={close} />
      </View>
      <View style={styles.rowYear}>
        <TextField tone="zinc" label="" accessibilityLabel={yearLabel} value={year} onChangeText={onYear} keyboardType="number-pad" maxLength={4} error={yearError ? ' ' : null} plainError />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  half: { flex: 1, minWidth: 0 },
  amount: { fontWeight: '600' },
  months: { gap: 8 },
  legend: { marginBottom: -2, fontSize: 14, fontWeight: '600', color: Zinc[900] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { width: 44, fontSize: 13, color: Zinc[600] },
  rowMonth: { flex: 1, minWidth: 0 },
  rowYear: { width: 96 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1 },
});
