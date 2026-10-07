import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { supplierAccounts } from '@/lib/supplierSummary';
import {
  createPayment,
  supplierLabel,
  updatePayment,
  useSupplierData,
  useSupplierWrite,
  type SupplierPayment,
} from '@/services/supplier.services';

type Form = { supplier_id: string; date: string; amount: string; account_id: string; notes: string };

/**
 * Paying a supplier - Hatim's Supplier Transactions form: supplier, date,
 * amount, the account it left and a note. Opened from a supplier's sheet it
 * starts on that supplier; it shows what is owed to whoever is chosen, so the
 * amount can be weighed against it.
 */
export function PaymentSheet({
  open,
  onClose,
  editing,
  presetSupplierId,
}: {
  open: boolean;
  onClose: () => void;
  editing?: SupplierPayment | null;
  presetSupplierId?: string | null;
}) {
  const t = useCopy(SUPPLIER_COPY);
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useSupplierWrite();
  const { data } = useSupplierData();
  const [form, setForm] = useState<Form>({ supplier_id: '', date: todayISO(), amount: '', account_id: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? editing?.id ?? `new:${presetSupplierId ?? ''}` : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setForm({
        supplier_id: editing?.supplier_id ?? presetSupplierId ?? '',
        date: String(editing?.date || '').slice(0, 10) || todayISO(),
        amount: editing ? String(Number(editing.amount || 0)) : '',
        account_id: editing?.account_id ?? '',
        notes: editing?.notes ?? '',
      });
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const suppliers = (data?.suppliers ?? []).filter((s) => s.is_active !== false || s.id === form.supplier_id);
  const accounts = data?.accounts ?? [];
  const amount = parseAmount(form.amount);
  const errors = {
    supplier: !form.supplier_id ? t.errSupplier : undefined,
    amount: !(amount > 0) ? t.errAmount : undefined,
    account: !form.account_id ? t.errAccount : undefined,
  };
  const shown: Partial<typeof errors> = submitted ? errors : {};

  const chosen = suppliers.find((s) => s.id === form.supplier_id);
  const account = chosen ? supplierAccounts([chosen], data?.purchases ?? [], data?.payments ?? [])[0] : null;
  const owed = account && account.availableBalance < 0 ? Math.abs(account.availableBalance) : 0;

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (errors.supplier || errors.amount || errors.account || !chosen) return;
    const input = {
      date: form.date,
      supplier_id: chosen.id,
      // The website stores the supplier's name field here.
      supplier_name: chosen.name || supplierLabel(chosen),
      amount,
      account_id: form.account_id,
      account_name: accounts.find((a) => a.id === form.account_id)?.name || '',
      notes: form.notes.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updatePayment(editing.id, input) : createPayment(input)));
      toast.show(editing ? t.paymentUpdated : t.paymentSaved);
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
        {editing ? t.editPayment : t.newPayment}
      </Txt>
      <View style={styles.field}>
        <SelectField
          label={t.supplierField}
          placeholder={t.chooseSupplier}
          closeLabel={t.close}
          value={form.supplier_id}
          options={suppliers.map((s) => ({ key: s.id, label: supplierLabel(s) }))}
          onChange={(supplier_id) => set({ supplier_id })}
          error={shown.supplier}
          searchPlaceholder={t.searchSuppliers}
          emptyText={t.noMatch}
        />
        {owed > 0 ? <Txt style={styles.owed}>{t.owedNow(money(owed))}</Txt> : null}
      </View>
      <View style={styles.pair}>
        <View style={styles.grow}>
          <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />
        </View>
        <View style={styles.grow}>
          <TextField
            tone="zinc"
            label={t.amount}
            placeholder="0"
            value={form.amount}
            onChangeText={(a) => set({ amount: a })}
            error={shown.amount}
            plainError
            keyboardType="decimal-pad"
            inputStyle={styles.figure}
          />
        </View>
      </View>
      <View style={styles.field}>
        <SelectField
          label={t.account}
          placeholder={t.chooseAccount}
          closeLabel={t.close}
          value={form.account_id}
          options={accounts.map((a) => ({ key: a.id, label: a.name }))}
          onChange={(account_id) => set({ account_id })}
          error={shown.account}
        />
        <Txt style={styles.hint}>{t.paidFrom}</Txt>
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
  owed: { fontSize: 13, fontWeight: '600', color: Red[700] },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  figure: { fontWeight: '600' },
  hint: { fontSize: 13, color: Zinc[500] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
