import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { Segmented } from '@/components/Segmented';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { EMPLOYEE_COPY } from '@/features/employees/copy';
import { todayISO } from '@/lib/dates';
import { defaultPayPeriod, type PayKind } from '@/lib/employees';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { paySalary, useEmployeeData, useEmployeeWrite } from '@/services/employees.services';

type Form = { employee_id: string; date: string; kind: PayKind; category_id: string; from: string; to: string; account_id: string; amount: string; notes: string };

const freshForm = (accountId: string): Form => {
  const period = defaultPayPeriod();
  return { employee_id: '', date: todayISO(), kind: 'Salary', category_id: '', from: period.from, to: period.to, account_id: accountId, amount: '', notes: '' };
};

/**
 * Paying a salary or a bonus - the website's Salary / Bonus form: who, when,
 * which, the expense category it is booked under, the period it covers, the
 * account it is paid from and how much. The money leaves that account as an
 * expense, written with the payment.
 */
export function PaySalarySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useCopy(EMPLOYEE_COPY);
  const toast = useToast();
  const write = useEmployeeWrite();
  const { data } = useEmployeeData();
  const accounts = data?.accounts ?? [];
  const [form, setForm] = useState<Form>(() => freshForm(''));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  // Each opening starts afresh; a shop with one account need not pick it.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(freshForm(accounts.length === 1 ? accounts[0].id : ''));
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const amount = parseAmount(form.amount);
  const errors = {
    employee: !form.employee_id ? t.errEmployee : undefined,
    category: !form.category_id ? t.errCategory : undefined,
    account: !form.account_id ? t.errAccount : undefined,
    amount: !(amount > 0) ? t.errAmount : undefined,
    period: form.to < form.from ? t.errPeriod : undefined,
  };
  const shown: Partial<typeof errors> = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const employee = data?.employees.find((e) => e.id === form.employee_id);
    const category = data?.categories.find((c) => c.id === form.category_id);
    const account = accounts.find((a) => a.id === form.account_id);
    setSaving(true);
    setError(null);
    try {
      await write(() =>
        paySalary({
          employee_id: form.employee_id,
          employee_name: employee?.name ?? '',
          date: form.date,
          payment_type: form.kind,
          category_id: form.category_id,
          category_name: category?.name ?? '',
          period_from: form.from,
          period_to: form.to,
          account_id: form.account_id,
          account_name: account?.name ?? '',
          amount: form.kind === 'Salary' ? amount : 0,
          bonus: form.kind === 'Bonus' ? amount : 0,
          notes: form.notes.trim(),
        }),
      );
      toast.show(t.paid);
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
        {t.payTitle}
      </Txt>
      <SelectField
        label={t.employeeField}
        placeholder={t.chooseEmployee}
        closeLabel={t.close}
        value={form.employee_id}
        options={(data?.employees ?? []).filter((e) => e.is_active).map((e) => ({ key: e.id, label: [e.name, e.phone].filter(Boolean).join(' - ') }))}
        onChange={(employee_id) => set({ employee_id })}
        error={shown.employee}
        searchPlaceholder={t.searchPick}
        emptyText={t.noMatch}
      />
      <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />
      <Segmented<PayKind>
        label={t.kindLabel}
        value={form.kind}
        onChange={(kind) => set({ kind })}
        height={44}
        fontSize={14}
        segments={[
          { key: 'Salary', label: t.kinds.Salary },
          { key: 'Bonus', label: t.kinds.Bonus },
        ]}
      />
      <SelectField
        label={t.category}
        placeholder={t.chooseCategory}
        closeLabel={t.close}
        value={form.category_id}
        options={(data?.categories ?? []).map((c) => ({ key: c.id, label: c.name }))}
        onChange={(category_id) => set({ category_id })}
        error={shown.category}
      />
      <View style={styles.pair}>
        <View style={styles.grow}>
          <DateField label={t.periodFrom} value={form.from} onChange={(from) => set({ from })} />
        </View>
        <View style={styles.grow}>
          <DateField label={t.periodTo} value={form.to} onChange={(to) => set({ to })} />
        </View>
      </View>
      {shown.period ? <FieldError plain>{shown.period}</FieldError> : null}
      <SelectField
        label={t.account}
        placeholder={t.chooseAccount}
        closeLabel={t.close}
        value={form.account_id}
        options={accounts.map((a) => ({ key: a.id, label: a.name }))}
        onChange={(account_id) => set({ account_id })}
        error={shown.account}
      />
      <TextField
        tone="zinc"
        label={t.amount}
        placeholder="0"
        value={form.amount}
        onChangeText={(a) => set({ amount: a })}
        error={shown.amount}
        plainError
        hint={t.bookedNote}
        keyboardType="decimal-pad"
        inputStyle={styles.figure}
      />
      <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.notes} onChangeText={(notes) => set({ notes })} />
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
  grow: { flex: 1, minWidth: 0 },
  figure: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
