import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { FormFooter } from '@/components/FormFooter';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { Spinner } from '@/components/Spinner';
import { TextField } from '@/components/TextField';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import {
  editFormErrors,
  editFormFromPurchase,
  editPlan,
  editPricedLines,
  paidOnPurchase,
  withEditProduct,
  type EditLine,
  type PurchaseEditErrors,
  type PurchaseEditForm,
} from '@/features/purchase/editForm';
import { OrderLineCard } from '@/features/purchase/OrderLineCard';
import type { DraftLine } from '@/features/purchase/orderForm';
import { ProductPickerSheet } from '@/features/products/ProductPickerSheet';
import { useCan } from '@/hooks/useCan';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { hasErrors } from '@/lib/formErrors';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber, parseAmount } from '@/lib/money';
import { orderTotals } from '@/lib/purchaseOrder';
import { PartlySavedError, saveEditedPurchase, usePurchaseWrite } from '@/services/purchase.services';
import { supplierLabel, useSupplierData, type SupplierData } from '@/services/supplier.services';

type Row = Record<string, any>;

const lineKey = () => `new-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * A saved purchase invoice, edited - the website's Edit Purchase Invoice: its
 * supplier, SI no and date, each line's quantity (never below what has
 * arrived), DP and discount, products added and lines nothing has arrived on
 * taken off, with the invoice's totals as they will stand.
 */
export default function EditPurchaseScreen() {
  const t = useCopy(PURCHASE_COPY);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useSupplierData();
  const purchase = data?.purchases.find((p) => p.id === id) ?? null;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.editTitle} onBack={() => router.back()} backLabel={t.back} />
      {!data ? (
        <View style={styles.state}>
          <Spinner color={Zinc[900]} size={24} />
        </View>
      ) : !purchase ? (
        <View style={styles.state}>
          <Txt style={styles.notice}>{t.notFound}</Txt>
        </View>
      ) : (
        <EditPurchaseBody data={data} purchase={purchase} />
      )}
    </SafeAreaView>
  );
}

function EditPurchaseBody({ data, purchase }: { data: SupplierData; purchase: Row }) {
  const t = useCopy(PURCHASE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = usePurchaseWrite();

  const [start] = useState<PurchaseEditForm>(() => editFormFromPurchase(purchase));
  const [form, setForm] = useState<PurchaseEditForm>(start);
  const [picking, setPicking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = (Object.keys(start) as (keyof PurchaseEditForm)[]).some((k) => form[k] !== start[k]);
  const guard = useLeaveGuard(dirty);

  const num = (n: unknown) => formatNumber(n, lang);
  const set = (patch: Partial<PurchaseEditForm>) => setForm((f) => ({ ...f, ...patch }));
  const setLine = (key: string, patch: Partial<DraftLine>) =>
    setForm((f) => ({ ...f, lines: f.lines.map((line) => (line.key === key ? { ...line, ...patch, changed: true } : line)) }));
  const removeLine = (line: EditLine) =>
    setForm((f) => ({ ...f, lines: f.lines.filter((l) => l.key !== line.key), removed: line.id ? [...f.removed, line.id] : f.removed }));

  const priced = editPricedLines(form);
  const totals = orderTotals(priced);
  const errors = editFormErrors(form);
  const shown: PurchaseEditErrors = submitted ? errors : { lines: {} };
  const paid = paidOnPurchase(purchase, data.payments);
  const supplier = data.suppliers.find((s) => s.id === form.supplier_id);

  // Nothing that has arrived can come off; a saved line comes off only for whoever may delete purchase lines.
  const remover = (line: EditLine) => (line.received > 0 || (line.id && !can('purchase.delete')) ? undefined : () => removeLine(line));
  const lineNotes = (line: EditLine, qty: number) => {
    if (line.received <= 0) return [];
    const repriced = line.changed && line.saved && (parseAmount(line.dp) !== line.saved.dp_price || parseAmount(line.discount || '0') !== line.saved.discount_pct);
    return [t.receivedOf(num(line.received), num(qty)), ...(repriced ? [t.receivedCost] : [])];
  };

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setSaving(true);
    setError(null);
    const plan = editPlan(form, String(supplier?.name || supplier?.company_name || ''), paid);
    try {
      // Refetched whatever happens: an edit saved in part has changed the invoice as well.
      const failure = await write(async () => {
        try {
          await saveEditedPurchase(String(purchase.id), plan);
          return null;
        } catch (e) {
          return e;
        }
      });
      if (!failure) {
        toast.show(t.updated(plan.header.si_no));
        guard.finish();
      } else if (failure instanceof PartlySavedError) {
        // The form no longer matches the invoice; it is opened afresh rather than saved over.
        toast.show(t.partlySaved(failure.message));
        guard.finish();
      } else {
        setError(errorMessage(failure));
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <SelectField
            label={t.supplierField}
            placeholder={t.chooseSupplier}
            closeLabel={t.close}
            value={form.supplier_id}
            options={data.suppliers.map((s) => ({ key: s.id, label: supplierLabel(s) }))}
            onChange={(supplier_id) => set({ supplier_id })}
            error={shown.supplier ? t.errSupplier : undefined}
            searchPlaceholder={t.searchSuppliers}
            emptyText={t.noSuppliers}
          />

          <View style={styles.pair}>
            <View style={styles.grow}>
              <TextField
                tone="zinc"
                label={t.siNo}
                value={form.si_no}
                onChangeText={(si_no) => set({ si_no })}
                error={shown.siNo ? t.errSiNo : undefined}
                plainError
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            <View style={styles.grow}>
              <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />
            </View>
          </View>

          <View style={styles.group}>
            <Txt accessibilityRole="header" style={styles.section}>
              {t.products}
            </Txt>
            {form.lines.map((line, i) => (
              <OrderLineCard
                key={line.key}
                line={line}
                priced={priced[i]}
                onChange={(patch) => setLine(line.key, patch)}
                onRemove={remover(line)}
                errors={shown.lines[line.key]}
                errorText={shown.lines[line.key]?.belowReceived ? t.errBelowReceived(num(line.received)) : undefined}
                notes={lineNotes(line, priced[i].qty)}
              />
            ))}
            <Button title={t.addProduct} icon="plus" variant="pillOutline" onPress={() => setPicking(true)} disabled={saving} />
            {shown.items ? <FieldError plain>{t.errItems}</FieldError> : null}
          </View>

          <TextField
            tone="zinc"
            label={t.spPercent}
            placeholder="0"
            value={form.sp}
            onChangeText={(sp) => set({ sp })}
            error={shown.percent ? t.errPercent : undefined}
            plainError
            hint={t.spEditHint}
            keyboardType="decimal-pad"
          />

          <TotalsList
            rows={[
              { label: t.gross, value: money(totals.grossSubtotal) },
              { label: t.discount, value: `−${money(totals.discountAmount)}` },
              { label: t.totalBill, value: money(totals.totalAmount) },
              { label: t.spTotal, value: `−${money(totals.totalSp)}` },
              { label: t.paidSoFar, value: money(paid) },
            ]}
            // The website's grand total: the deposit, or the bill when the incentive takes it all.
            grand={{ label: t.deposit, value: money(totals.totalDeposit || totals.totalAmount) }}
          />

          <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.notes} onChangeText={(notes) => set({ notes })} minHeight={64} />
          <AlertBanner tone="error">{error}</AlertBanner>
        </ScrollView>
        <FormFooter cancelLabel={t.cancel} onCancel={() => router.back()} saveLabel={saving ? t.saving : t.save} onSave={save} saving={saving} />
      </KeyboardAvoidingView>

      <ProductPickerSheet
        open={picking}
        title={t.chooseProduct}
        onClose={() => setPicking(false)}
        onPick={(product) => setForm((f) => ({ ...f, lines: withEditProduct(f.lines, product, lineKey()) }))}
      />
      {guard.sheet}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  flex: { flex: 1 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notice: { textAlign: 'center', fontSize: 15, color: Zinc[600] },
  body: { padding: 20, gap: 18 },
  group: { gap: 8 },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  section: { fontSize: 16, fontWeight: '600', color: Zinc[900] },
});
