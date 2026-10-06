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
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { EXPENSE_COPY } from '@/features/expenses/copy';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { createExpense, updateExpense, useExpenseData, useExpenseWrite } from '@/services/expenses.services';

type Row = Record<string, any>;
type Form = { category_id: string; amount: string; date: string; account_id: string; notes: string };

/** New or edited expense - Hatim's ExpenseTransactions form, to the design. */
export function ExpenseFormSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Row | null }) {
  const t = useCopy(EXPENSE_COPY);
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useExpenseWrite();
  const { data } = useExpenseData();
  const categories = data?.categories ?? [];
  const accounts = data?.accounts ?? [];

  const [form, setForm] = useState<Form>({ category_id: '', amount: '', date: todayISO(), account_id: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? editing?.id ?? 'new' : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setForm({
        category_id: editing?.category_id ?? '',
        amount: editing ? String(Number(editing.amount || 0)) : '',
        date: String(editing?.date || '').slice(0, 10) || todayISO(),
        account_id: editing?.account_id ?? '',
        notes: editing?.notes ?? '',
      });
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const amount = parseAmount(form.amount);
  // A customer due discount is a cost no account paid; editing one keeps it that way.
  const accountOptional = !!editing && !editing.account_id;

  const errors: Partial<Record<'category' | 'amount' | 'account', string>> = {};
  if (!form.category_id) errors.category = t.errCategory;
  if (!(amount > 0)) errors.amount = t.errAmount;
  if (!form.account_id && !accountOptional) errors.account = t.errAccount;
  const shown = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const category = categories.find((c) => c.id === form.category_id);
    const account = accounts.find((a) => a.id === form.account_id);
    const input = {
      date: form.date,
      category_id: form.category_id,
      category_name: category?.name || '',
      amount,
      account_id: form.account_id || null,
      account_name: account?.name || '',
      notes: form.notes.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updateExpense(editing.id, input) : createExpense(input)));
      toast.show(editing ? t.expenseUpdated : t.expenseSaved(money(amount), input.category_name));
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
        {editing ? t.editExpense : t.newExpense}
      </Txt>
      <SelectField
        label={t.category}
        placeholder={t.select}
        closeLabel={t.close}
        value={form.category_id}
        options={categories.map((c) => ({ key: c.id, label: c.name }))}
        onChange={(category_id) => set({ category_id })}
        error={shown.category}
      />
      <View style={styles.pair}>
        <View style={styles.grow}>
          <TextField
            tone="zinc"
            label={t.amount}
            placeholder="0"
            value={form.amount}
            onChangeText={(a) => set({ amount: a })}
            error={shown.amount ? ' ' : undefined}
            plainError
            keyboardType="decimal-pad"
            inputStyle={styles.amountInput}
          />
        </View>
        <View style={styles.grow}>
          <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />
        </View>
      </View>
      {shown.amount ? (
        <View style={styles.amountError}>
          <FieldError plain>{shown.amount}</FieldError>
        </View>
      ) : null}
      <View style={styles.field}>
        <SelectField
          label={t.paymentAccount}
          placeholder={t.select}
          closeLabel={t.close}
          value={form.account_id}
          options={accounts.map((a) => ({ key: a.id, label: a.name }))}
          onChange={(account_id) => set({ account_id })}
          error={shown.account}
        />
        <Txt style={styles.hint}>{t.accountHelp}</Txt>
      </View>
      <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.notes} onChangeText={(notes) => set({ notes })} minHeight={64} />
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
  field: { gap: 6 },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  amountInput: { fontWeight: '600' },
  amountError: { marginTop: -6 },
  hint: { fontSize: 13, color: Zinc[500] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
