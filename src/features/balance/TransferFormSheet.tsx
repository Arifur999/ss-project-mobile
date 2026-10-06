import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { DesignIcon } from '@/components/DesignIcon';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { BALANCE_COPY } from '@/features/balance/copy';
import type { Account } from '@/lib/balance';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { createTransfer, updateTransfer, useBalanceWrite } from '@/services/balance.services';

export type Transfer = {
  id: string;
  date: string;
  from_account_id: string;
  from_account_name: string;
  to_account_id: string;
  to_account_name: string;
  amount: number;
  notes?: string | null;
};

type Form = { from: string; to: string; amount: string; date: string; note: string };

const blank = (): Form => ({ from: '', to: '', amount: '', date: todayISO(), note: '' });

const fromTransfer = (t: Transfer): Form => ({
  from: t.from_account_id,
  to: t.to_account_id,
  amount: String(t.amount),
  date: String(t.date || '').slice(0, 10) || todayISO(),
  note: t.notes || '',
});

/** New or edit transfer, in a sheet. `editing` null means a new one. */
export function TransferFormSheet({
  open,
  onClose,
  editing,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  editing: Transfer | null;
  accounts: Account[];
}) {
  const t = useCopy(BALANCE_COPY);
  const toast = useToast();
  const write = useBalanceWrite();
  const [form, setForm] = useState<Form>(blank);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  // Reset the form each time the sheet opens, from the transfer being edited.
  const seedKey = open ? editing?.id ?? 'new' : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setForm(editing ? fromTransfer(editing) : blank());
      setSubmitted(false);
      setError(null);
    }
  }

  // Active accounts, plus whatever an edited transfer already uses.
  const options = accounts
    .filter((a) => a.is_active || a.id === form.from || a.id === form.to)
    .map((a) => ({ key: a.id, label: a.name }));

  const amount = parseAmount(form.amount);
  const errors: Partial<Record<'from' | 'to' | 'amount', string>> = {};
  if (!form.from) errors.from = t.errFrom;
  if (!form.to) errors.to = t.errTo;
  else if (form.from && form.from === form.to) errors.to = t.errSame;
  if (!(amount > 0)) errors.amount = t.errAmount;
  const shown = submitted ? errors : {};

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? '';
    const input = {
      date: form.date,
      from_account_id: form.from,
      from_account_name: nameOf(form.from),
      to_account_id: form.to,
      to_account_name: nameOf(form.to),
      amount,
      notes: form.note.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updateTransfer(editing.id, input) : createTransfer(input)));
      toast.show(editing ? t.transferUpdated : t.transferSaved);
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
        {editing ? t.editTransfer : t.newTransfer}
      </Txt>
      <SelectField
        label={t.fromAccount}
        placeholder={t.chooseAccount}
        value={form.from}
        options={options}
        onChange={(from) => set({ from })}
        error={shown.from}
        closeLabel={t.close}
      />
      <View style={styles.swapRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.swap}
          onPress={() => set({ from: form.to, to: form.from })}
          style={styles.swap}>
          <DesignIcon name="swap" size={18} color={Zinc[900]} strokeWidth={2} />
        </Pressable>
      </View>
      <SelectField
        label={t.toAccount}
        placeholder={t.chooseAccount}
        value={form.to}
        options={options}
        onChange={(to) => set({ to })}
        error={shown.to}
        closeLabel={t.close}
      />
      <View style={styles.pair}>
        <View style={styles.half}>
          <TextField
            tone="zinc"
            label={t.amount}
            placeholder="0"
            value={form.amount}
            onChangeText={(amountText) => set({ amount: amountText })}
            error={shown.amount}
            plainError
            keyboardType="decimal-pad"
            inputStyle={styles.amountInput}
          />
        </View>
        <View style={styles.half}>
          <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />
        </View>
      </View>
      <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.note} onChangeText={(note) => set({ note })} />
      <AlertBanner tone="error">{error}</AlertBanner>
      <View style={styles.actions}>
        <Button title={t.cancel} variant="pillOutline" onPress={onClose} disabled={saving} />
        <Button
          title={saving ? t.saving : editing ? t.saveChanges : t.saveTransfer}
          variant="pill"
          onPress={save}
          busy={saving}
          style={styles.grow}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  swapRow: { alignItems: 'center', marginVertical: -6 },
  swap: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White, alignItems: 'center', justifyContent: 'center' },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  half: { flex: 1, minWidth: 0 },
  amountInput: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1 },
});
