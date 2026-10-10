import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { ChoiceCard } from '@/components/ChoiceCard';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { FormFooter } from '@/components/FormFooter';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Amber, White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { damageFormErrors, damageInput, type DamageForm, type DamageLine } from '@/features/damage/damageForm';
import { DamageLineCard } from '@/features/damage/DamageLineCard';
import { ProductPickerSheet } from '@/features/products/ProductPickerSheet';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { needsSupplier, type DamageAction, type DamageSource } from '@/lib/damageRules';
import { todayISO } from '@/lib/dates';
import { hasErrors } from '@/lib/formErrors';
import { errorMessage } from '@/lib/httpClient';
import { createDamageEntry, useDamageWrite } from '@/services/damage.services';
import { supplierName, useSuppliers, type Product } from '@/services/products.services';

const SOURCES: DamageSource[] = ['own_stock', 'supplier'];
const ACTIONS: DamageAction[] = ['repair', 'return', 'exchange'];

/**
 * Recording damage - Hatim's "Record damage": what broke, where it came from,
 * what happens next, and which products and how many. Saving takes them off
 * sellable stock at once, at their FIFO cost.
 */
export default function NewDamageScreen() {
  const t = useCopy(DAMAGE_COPY);
  const toast = useToast();
  const write = useDamageWrite();
  const suppliers = useSuppliers();

  const [start] = useState<DamageForm>(() => ({ date: todayISO(), source: 'own_stock', action: 'repair', supplier_id: '', notes: '', lines: [] }));
  const [form, setForm] = useState<DamageForm>(start);
  const [picking, setPicking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = (Object.keys(start) as (keyof DamageForm)[]).some((k) => form[k] !== start[k]);
  const guard = useLeaveGuard(dirty);

  const set = (patch: Partial<DamageForm>) => setForm((f) => ({ ...f, ...patch }));
  const setLine = (productId: string, patch: Partial<DamageLine>) =>
    setForm((f) => ({ ...f, lines: f.lines.map((line) => (line.product_id === productId ? { ...line, ...patch } : line)) }));
  const addProduct = (product: Product) =>
    setForm((f) =>
      // A product already on the entry is not added twice; its quantity is the place to say more.
      f.lines.some((line) => line.product_id === product.id)
        ? f
        : {
            ...f,
            lines: [...f.lines, { product_id: product.id, product_code: product.product_code, product_name: product.name, qty: '1', unit_cost: '' }],
          },
    );

  const supplierNeeded = needsSupplier(form.source, form.action);
  const errors = damageFormErrors(form);
  const shown = submitted ? errors : { lines: {} };
  // The name the website stores beside the id: the person's, else the company's.
  const nameOf = (id: string) => {
    const s = suppliers.data?.find((row) => row.id === id);
    return String(s?.name || s?.company_name || '');
  };

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setSaving(true);
    setError(null);
    try {
      await write(() => createDamageEntry(damageInput(form, nameOf)));
      toast.show(t.recorded);
      guard.finish();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.recordDamage} onBack={() => router.back()} backLabel={t.back} />
      <KeyboardScreen style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />

          <View style={styles.group}>
            <Txt style={styles.label}>{t.whereFrom}</Txt>
            <View accessibilityRole="radiogroup" accessibilityLabel={t.whereFrom} style={styles.row}>
              {SOURCES.map((source) => (
                <ChoiceCard
                  key={source}
                  title={t.sources[source].label}
                  sub={t.sources[source].sub}
                  selected={form.source === source}
                  onPress={() => set({ source })}
                />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <Txt style={styles.label}>{t.whatNext}</Txt>
            <View accessibilityRole="radiogroup" accessibilityLabel={t.whatNext} style={styles.row}>
              {ACTIONS.map((action) => (
                <ChoiceCard
                  key={action}
                  title={t.actions[action].label}
                  sub={t.actions[action].sub}
                  selected={form.action === action}
                  onPress={() => set({ action })}
                />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <SelectField
              label={supplierNeeded ? t.supplierRequired : t.supplierOptional}
              placeholder={t.chooseSupplier}
              closeLabel={t.close}
              value={form.supplier_id}
              options={(suppliers.data ?? []).map((s) => ({ key: s.id, label: supplierName(s) }))}
              onChange={(supplier_id) => set({ supplier_id })}
              error={shown.supplier ? t.errSupplier : undefined}
              searchPlaceholder={t.searchSuppliers}
              emptyText={t.noSuppliers}
            />
            {!supplierNeeded ? <Txt style={styles.hint}>{t.supplierNotNeeded}</Txt> : null}
          </View>

          <View style={styles.group}>
            <Txt accessibilityRole="header" style={styles.section}>
              {t.items}
            </Txt>
            {form.lines.map((line) => (
              <DamageLineCard
                key={line.product_id}
                line={line}
                onChange={(patch) => setLine(line.product_id, patch)}
                onRemove={() => set({ lines: form.lines.filter((l) => l.product_id !== line.product_id) })}
                errors={shown.lines[line.product_id]}
              />
            ))}
            <Button title={t.addProduct} icon="plus" variant="pillOutline" onPress={() => setPicking(true)} disabled={saving} />
            {shown.items ? <FieldError plain>{t.errItems}</FieldError> : null}
          </View>

          <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.notes} onChangeText={(notes) => set({ notes })} minHeight={64} />
          <View style={styles.stockNote}>
            <Txt style={styles.stockNoteText}>{t.stockNote}</Txt>
          </View>
          <AlertBanner tone="error">{error}</AlertBanner>
        </ScrollView>
        <FormFooter cancelLabel={t.cancel} onCancel={() => router.back()} saveLabel={saving ? t.saving : t.save} onSave={save} saving={saving} />
      </KeyboardScreen>

      <ProductPickerSheet open={picking} title={t.chooseProduct} onClose={() => setPicking(false)} onPick={addProduct} />
      {guard.sheet}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  flex: { flex: 1 },
  body: { padding: 20, gap: 18 },
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  section: { fontSize: 16, fontWeight: '600', color: Zinc[900] },
  hint: { fontSize: 13, color: Zinc[500] },
  stockNote: { padding: 12, borderRadius: 14, backgroundColor: Amber[50], borderWidth: 1, borderColor: Amber[200] },
  stockNoteText: { fontSize: 13, color: Amber[900] },
});
