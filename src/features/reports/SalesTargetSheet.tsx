import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Amber, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { REPORT_COPY } from '@/features/reports/copy';
import { monthName } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { saveSalesTarget, useTargetWrite } from '@/services/reports.services';

type Row = Record<string, any>;
type Form = { month: string; year: string; sales: string; profit: string };

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));

/**
 * A month's sales and profit target - the website's Monthly Target form. A
 * month holds one target, so saving a month already set replaces it; editing
 * keeps the month fixed, since moving it would leave the old one behind.
 */
export function SalesTargetSheet({ open, editing, onClose }: { open: boolean; editing: Row | null; onClose: () => void }) {
  const t = useCopy(REPORT_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const write = useTargetWrite();
  const now = new Date();
  const [form, setForm] = useState<Form>({ month: String(now.getMonth() + 1), year: String(now.getFullYear()), sales: '', profit: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? String(editing?.id ?? 'new') : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setForm({
        month: String(editing?.month ?? now.getMonth() + 1),
        year: String(editing?.year ?? now.getFullYear()),
        sales: editing && Number(editing.sales_target) ? String(Number(editing.sales_target)) : '',
        profit: editing && Number(editing.profit_target) ? String(Number(editing.profit_target)) : '',
      });
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const year = parseAmount(form.year);
  const sales = form.sales.trim() === '' ? 0 : parseAmount(form.sales);
  const profit = form.profit.trim() === '' ? 0 : parseAmount(form.profit);
  const errors = {
    year: !Number.isInteger(year) || year < 2000 || year > 2100 ? t.errYear : undefined,
    sales: Number.isNaN(sales) ? t.errAmount : undefined,
    profit: Number.isNaN(profit) ? t.errAmount : undefined,
  };
  const shown: Partial<typeof errors> = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    setError(null);
    try {
      await write(() => saveSalesTarget({ year, month: Number(form.month), sales_target: sales, profit_target: profit }));
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
        {t.salesTargetTitle}
      </Txt>
      {editing ? (
        <Txt style={styles.fixed}>{`${monthName(Number(form.month), lang)} ${form.year}`}</Txt>
      ) : (
        <View style={styles.pair}>
          <View style={styles.wide}>
            <SelectField
              label={t.month}
              placeholder={t.month}
              closeLabel={t.close}
              value={form.month}
              options={MONTHS.map((m) => ({ key: m, label: monthName(Number(m), lang) }))}
              onChange={(month) => set({ month })}
            />
          </View>
          <View style={styles.narrow}>
            <TextField tone="zinc" label={t.year} value={form.year} onChangeText={(y) => set({ year: y })} error={shown.year} plainError keyboardType="number-pad" />
          </View>
        </View>
      )}
      <TextField
        tone="zinc"
        label={t.salesTargetField}
        placeholder="0"
        value={form.sales}
        onChangeText={(s) => set({ sales: s })}
        error={shown.sales}
        plainError
        keyboardType="decimal-pad"
        inputStyle={styles.figure}
      />
      <TextField
        tone="zinc"
        label={t.profitTargetField}
        placeholder="0"
        value={form.profit}
        onChangeText={(p) => set({ profit: p })}
        error={shown.profit}
        plainError
        keyboardType="decimal-pad"
        inputStyle={styles.figure}
      />
      {editing ? null : <Txt style={styles.note}>{t.replaceNote}</Txt>}
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
  fixed: { fontSize: 15, fontWeight: '600', color: Zinc[700] },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  wide: { flex: 1.6, minWidth: 0 },
  narrow: { flex: 1, minWidth: 0 },
  grow: { flex: 1, minWidth: 0 },
  figure: { fontWeight: '600' },
  note: { fontSize: 13, color: Amber[800] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
