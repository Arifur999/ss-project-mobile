import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { REPORT_COPY } from '@/features/reports/copy';
import { monthShort } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber, parseAmount } from '@/lib/money';
import { monthsInRange, perMonthAmount } from '@/lib/purchaseTargets';
import { supplierLabel } from '@/services/supplier.services';
import { createPurchaseTarget, updatePurchaseTarget, useTargets, useTargetWrite } from '@/services/reports.services';

type Row = Record<string, any>;
type Form = { supplier_id: string; from: string; to: string; total: string };

const keyOf = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;
const partsOf = (key: string) => key.split('-').map(Number) as [number, number];

/**
 * A supplier's buying target - the website's Purchase Target form: who, the
 * months it runs from and to, and how much to buy in all, with the per-month
 * figure that follows. The months offered run from last year to two years on.
 */
export function PurchaseTargetSheet({ open, editing, onClose }: { open: boolean; editing: Row | null; onClose: () => void }) {
  const t = useCopy(REPORT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useTargetWrite();
  const { data } = useTargets();
  const now = new Date();
  const thisMonth = keyOf(now.getFullYear(), now.getMonth() + 1);
  const [form, setForm] = useState<Form>({ supplier_id: '', from: thisMonth, to: thisMonth, total: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? String(editing?.id ?? 'new') : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setForm({
        supplier_id: String(editing?.supplier_id ?? ''),
        from: editing ? keyOf(Number(editing.start_year), Number(editing.start_month)) : thisMonth,
        to: editing ? keyOf(Number(editing.end_year), Number(editing.end_month)) : thisMonth,
        total: editing ? String(Number(editing.total_amount || 0)) : '',
      });
      setSubmitted(false);
      setError(null);
    }
  }

  const label = (key: string) => {
    const [y, m] = partsOf(key);
    return `${monthShort(m, lang)} ${lang === 'bn' ? bnDigits(String(y)) : y}`;
  };
  // Last year to two years on, and whatever an older target being edited already spans.
  const keys = new Set<string>([form.from, form.to]);
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y += 1) for (let m = 1; m <= 12; m += 1) keys.add(keyOf(y, m));
  const monthOptions = [...keys].sort().map((key) => ({ key, label: label(key) }));

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const [sy, sm] = partsOf(form.from);
  const [ey, em] = partsOf(form.to);
  const range = { start_year: sy, start_month: sm, end_year: ey, end_month: em };
  const months = monthsInRange(range);
  const total = form.total.trim() === '' ? NaN : parseAmount(form.total);
  const errors = {
    supplier: !form.supplier_id ? t.errSupplier : undefined,
    range: form.to < form.from ? t.errRange : undefined,
    total: !(total >= 0) ? t.errTotal : undefined,
  };
  const shown: Partial<typeof errors> = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const input = { supplier_id: form.supplier_id, ...range, total_amount: total };
    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updatePurchaseTarget(String(editing.id), input) : createPurchaseTarget(input)));
      toast.show(t.targetSaved);
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
        {t.purchaseTargetTitle}
      </Txt>
      <SelectField
        label={t.supplierField}
        placeholder={t.chooseSupplier}
        closeLabel={t.close}
        value={form.supplier_id}
        options={(data?.suppliers ?? []).map((s) => ({ key: String(s.id), label: supplierLabel(s) }))}
        onChange={(supplier_id) => set({ supplier_id })}
        error={shown.supplier}
        searchPlaceholder={t.searchSuppliers}
        emptyText={t.noSuppliers}
      />
      <View style={styles.pair}>
        <View style={styles.grow}>
          <SelectField label={t.fromMonth} placeholder={t.fromMonth} closeLabel={t.close} value={form.from} options={monthOptions} onChange={(from) => set({ from })} />
        </View>
        <View style={styles.grow}>
          <SelectField label={t.toMonth} placeholder={t.toMonth} closeLabel={t.close} value={form.to} options={monthOptions} onChange={(to) => set({ to })} />
        </View>
      </View>
      {shown.range ? <FieldError plain>{shown.range}</FieldError> : null}
      <TextField
        tone="zinc"
        label={t.totalField}
        placeholder="0"
        value={form.total}
        onChangeText={(v) => set({ total: v })}
        error={shown.total}
        plainError
        hint={months > 0 && total > 0 ? t.perMonth(money(perMonthAmount(total, months)), formatNumber(months, lang)) : undefined}
        keyboardType="decimal-pad"
        inputStyle={styles.figure}
      />
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
