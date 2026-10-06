import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { CategoryPalette, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { ColorSwatches } from '@/features/expenses/ColorSwatches';
import { EXPENSE_COPY } from '@/features/expenses/copy';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { createCategory, updateCategory, useExpenseData, useExpenseWrite, type Category } from '@/services/expenses.services';

type Form = { name: string; color: string; budget: string };

/** New or edited expense category: name (unique), colour and an optional monthly budget. */
export function CategoryFormSheet({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Category | null;
  onSaved?: (category: Category) => void;
}) {
  const t = useCopy(EXPENSE_COPY);
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useExpenseWrite();
  const { data } = useExpenseData();
  const [form, setForm] = useState<Form>({ name: '', color: CategoryPalette[0], budget: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? editing?.id ?? 'new' : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      const budget = Number(editing?.monthly_budget || 0);
      setForm({ name: editing?.name ?? '', color: editing?.color || CategoryPalette[0], budget: budget > 0 ? String(budget) : '' });
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const name = form.name.trim();
  const budget = form.budget.trim() === '' ? 0 : parseAmount(form.budget);
  // Two categories of one name split one kind of spending across two lines.
  const clash = (data?.categories ?? []).find((c) => c.id !== editing?.id && c.name.trim().toLowerCase() === name.toLowerCase());

  const errors: Partial<Record<'name' | 'budget', string>> = {};
  if (!name) errors.name = t.errName;
  else if (clash) errors.name = t.errNameTaken(clash.name);
  if (Number.isNaN(budget)) errors.budget = t.errBudget;
  const shown = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const input = { name, color: form.color, monthly_budget: budget };
      const saved = await write(() => (editing ? updateCategory(editing.id, input) : createCategory(input)));
      toast.show(editing ? t.categoryUpdated(name) : t.categoryAdded(name));
      onClose();
      onSaved?.({ ...(editing ?? {}), ...saved, ...input } as Category);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={() => !saving && onClose()} closeLabel={t.close}>
      <Txt accessibilityRole="header" style={styles.title}>
        {editing ? t.editCategory : t.newCategory}
      </Txt>
      <TextField
        tone="zinc"
        label={t.categoryName}
        placeholder={t.namePlaceholder}
        value={form.name}
        onChangeText={(n) => set({ name: n })}
        error={shown.name}
        plainError
      />
      <ColorSwatches value={form.color} onChange={(color) => set({ color })} />
      <TextField
        tone="zinc"
        label={t.monthlyBudgetField}
        placeholder={t.optional}
        value={form.budget}
        onChangeText={(b) => set({ budget: b })}
        error={shown.budget}
        plainError
        hint={budget > 0 ? t.yearlyHelp(money(budget * 12)) : t.noBudgetHelp}
        keyboardType="decimal-pad"
        inputStyle={styles.amountInput}
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
  amountInput: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1 },
});
