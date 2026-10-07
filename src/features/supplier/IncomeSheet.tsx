import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChoiceCard } from '@/components/ChoiceCard';
import { DateField } from '@/components/DateField';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import {
  createOtherIncome,
  supplierLabel,
  updateOtherIncome,
  useSupplierData,
  useSupplierWrite,
  type OtherIncome,
  type OtherIncomeInput,
} from '@/services/supplier.services';

type Kind = OtherIncomeInput['income_type'];
type Form = { kind: Kind; supplier_id: string; source: string; date: string; amount: string; account_id: string; notes: string };

/**
 * Income that is not a sale - Hatim's Others Income form: from a supplier
 * (commission, incentive) or another named source, its date, amount, the
 * account it came into, and a note. Checked as the website checks it.
 */
export function IncomeSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: OtherIncome | null }) {
  const t = useCopy(SUPPLIER_COPY);
  const toast = useToast();
  const write = useSupplierWrite();
  const { data } = useSupplierData();
  const [form, setForm] = useState<Form>({ kind: 'supplier', supplier_id: '', source: '', date: todayISO(), amount: '', account_id: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? editing?.id ?? 'new' : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setForm({
        kind: editing?.income_type ?? 'supplier',
        supplier_id: editing?.supplier_id ?? '',
        source: editing?.source_name ?? '',
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
  const fromSupplier = form.kind === 'supplier';
  const errors = {
    supplier: fromSupplier && !form.supplier_id ? t.errSupplier : undefined,
    source: !fromSupplier && !form.source.trim() ? t.errSource : undefined,
    amount: !(amount > 0) ? t.errAmount : undefined,
    account: !form.account_id ? t.errAccount : undefined,
  };
  const shown: Partial<typeof errors> = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const supplier = suppliers.find((s) => s.id === form.supplier_id);
    const input: OtherIncomeInput = {
      date: form.date,
      income_type: form.kind,
      supplier_id: fromSupplier ? form.supplier_id : null,
      // The website stores the supplier's name field here.
      supplier_name: fromSupplier ? supplier?.name || supplierLabel(supplier) : '',
      source_name: fromSupplier ? '' : form.source.trim(),
      amount,
      account_id: form.account_id,
      account_name: accounts.find((a) => a.id === form.account_id)?.name || '',
      notes: form.notes.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updateOtherIncome(editing.id, input) : createOtherIncome(input)));
      toast.show(editing ? t.incomeUpdated : t.incomeSaved);
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
        {editing ? t.editIncome : t.newIncome}
      </Txt>
      <View accessibilityRole="radiogroup" accessibilityLabel={t.kindLabel} style={styles.row}>
        {(['supplier', 'other'] as const).map((kind) => (
          <ChoiceCard
            key={kind}
            title={t.incomeTypes[kind].label}
            sub={t.incomeTypes[kind].sub}
            selected={form.kind === kind}
            onPress={() => set({ kind })}
          />
        ))}
      </View>
      {fromSupplier ? (
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
      ) : (
        <TextField
          tone="zinc"
          label={t.sourceField}
          placeholder={t.sourcePlaceholder}
          value={form.source}
          onChangeText={(source) => set({ source })}
          error={shown.source}
          plainError
        />
      )}
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
        <Txt style={styles.hint}>{t.intoAccount}</Txt>
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
  row: { flexDirection: 'row', gap: 8 },
  field: { gap: 6 },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  figure: { fontWeight: '600' },
  hint: { fontSize: 13, color: Zinc[500] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
