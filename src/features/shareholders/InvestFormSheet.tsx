import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Segmented } from '@/components/Segmented';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SHAREHOLDER_COPY } from '@/features/shareholders/copy';
import type { Account } from '@/lib/balance';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { belongsTo } from '@/lib/shareholders';
import {
  createInvestment,
  updateInvestment,
  useShareholderWrite,
  type Shareholder,
} from '@/services/shareholders.services';

type Row = Record<string, any>;
type Kind = 'invest' | 'withdraw';
type Form = { type: Kind; date: string; shareholder: string; amount: string; account: string; note: string };

const blank = (): Form => ({ type: 'invest', date: todayISO(), shareholder: '', amount: '', account: '', note: '' });

/** New or edit investment / withdrawal. `editing` is an investments row. */
export function InvestFormSheet({
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
      const owner = editing ? shareholders.find((s) => belongsTo(editing, s)) : undefined;
      const withdrawn = Number(editing?.withdraw_amount || 0);
      setForm(
        editing
          ? {
              type: withdrawn > 0 ? 'withdraw' : 'invest',
              date: String(editing.date || '').slice(0, 10) || todayISO(),
              shareholder: owner?.id ?? '',
              amount: String(withdrawn > 0 ? withdrawn : Number(editing.invest_amount || 0)),
              account: editing.account_id ?? '',
              note: editing.notes ?? '',
            }
          : blank(),
      );
      setSubmitted(false);
      setError(null);
    }
  }

  const amount = parseAmount(form.amount);
  const errors: Partial<Record<'shareholder' | 'amount' | 'account', string>> = {};
  if (!form.shareholder) errors.shareholder = t.errShareholder;
  if (!(amount > 0)) errors.amount = t.errAmount;
  if (!form.account) errors.account = t.errAccount;
  const shown = submitted ? errors : {};
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const holder = shareholders.find((s) => s.id === form.shareholder);
    const account = accounts.find((a) => a.id === form.account);
    const input = {
      date: form.date,
      shareholder_id: form.shareholder,
      shareholder_name: holder?.name ?? '',
      invest_amount: form.type === 'invest' ? amount : 0,
      withdraw_amount: form.type === 'withdraw' ? amount : 0,
      account_id: form.account,
      account_name: account?.name ?? '',
      notes: form.note.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updateInvestment(String(editing.id), input) : createInvestment(input)));
      toast.show(editing ? t.entryUpdated : form.type === 'invest' ? t.investmentSaved : t.withdrawalSaved);
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
        {editing ? t.editEntry : t.newInvestment}
      </Txt>
      <Segmented
        label={t.entryType}
        height={44}
        fontSize={14}
        value={form.type}
        onChange={(type) => set({ type })}
        segments={[
          { key: 'invest', label: t.investment, icon: 'arrowUp', activeInk: Green[700] },
          { key: 'withdraw', label: t.withdrawal, icon: 'arrowDown', activeInk: Red[700] },
        ]}
      />
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
        label={t.shareholder}
        placeholder={t.select}
        value={form.shareholder}
        options={shareholders.map((s) => ({ key: s.id, label: s.name }))}
        onChange={(shareholder) => set({ shareholder })}
        error={shown.shareholder}
        closeLabel={t.close}
      />
      <View style={styles.accountBlock}>
        <SelectField
          label={t.account}
          placeholder={t.select}
          value={form.account}
          options={accounts.filter((a) => a.is_active || a.id === form.account).map((a) => ({ key: a.id, label: a.name }))}
          onChange={(account) => set({ account })}
          error={shown.account}
          closeLabel={t.close}
        />
        <Txt style={styles.hint}>{form.type === 'invest' ? t.intoAccount : t.fromAccount}</Txt>
      </View>
      <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.note} onChangeText={(note) => set({ note })} minHeight={72} />
      <AlertBanner tone="error">{error}</AlertBanner>
      <View style={styles.actions}>
        <Button title={saving ? t.saving : t.save} variant="pill" onPress={save} busy={saving} style={styles.grow} />
        <Button title={t.cancel} variant="pillOutline" onPress={onClose} disabled={saving} style={styles.grow} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  half: { flex: 1, minWidth: 0 },
  amount: { fontWeight: '600' },
  accountBlock: { gap: 6 },
  hint: { fontSize: 13, color: Zinc[500] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1 },
});
