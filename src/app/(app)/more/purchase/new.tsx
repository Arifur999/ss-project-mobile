import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { ChoiceCard, PICKED_IN } from '@/components/ChoiceCard';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { FormFooter } from '@/components/FormFooter';
import { ConfirmSheet } from '@/components/ItemSheets';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { Spinner } from '@/components/Spinner';
import { TextField } from '@/components/TextField';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Amber, Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { DRAFT_COPY } from '@/features/drafts/copy';
import { useOpenedDraft, useParking } from '@/features/drafts/useDraftForm';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { OrderLineCard } from '@/features/purchase/OrderLineCard';
import {
  orderFormErrors,
  orderInput,
  pricedLines,
  withProduct,
  type DraftLine,
  type OrderForm,
  type OrderFormErrors,
  type OrderStatus,
} from '@/features/purchase/orderForm';
import { draftFromOrder, orderFromDraft, type OpenedOrderDraft } from '@/features/purchase/purchaseDraft';
import { ProductPickerSheet } from '@/features/products/ProductPickerSheet';
import { useCan } from '@/hooks/useCan';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { todayISO } from '@/lib/dates';
import { hasErrors } from '@/lib/formErrors';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { generateSINo, orderTotals } from '@/lib/purchaseOrder';
import { supplierBalanceOf } from '@/lib/supplierSummary';
import { createPurchase, receiveWholePurchase, usePurchaseWrite } from '@/services/purchase.services';
import { supplierLabel, useSupplierData, type SupplierData } from '@/services/supplier.services';

const STATUSES: OrderStatus[] = ['pending', 'received'];

/**
 * A new purchase order - Hatim's Purchase Orders form: the supplier and what
 * is already owed them, the SI no and date, Pending or Received, the products
 * priced line by line, one SP percentage for the order, and its totals.
 * Saving as Received asks first, then takes the whole order into stock
 * through receive-all, exactly as the website does.
 *
 * It can be parked as a draft and parked again over it; given ?draft=<id> it
 * opens one, as the website's openDraft does, and placing the order clears it.
 */
export default function NewPurchaseScreen() {
  const t = useCopy(PURCHASE_COPY);
  const { draft: draftId } = useLocalSearchParams<{ draft?: string }>();
  const { data } = useSupplierData();
  const draft = useOpenedDraft(
    draftId || undefined,
    data
      ? (raw) => {
          const known = new Set(data.suppliers.map((s) => s.id));
          return orderFromDraft(raw, { today: todayISO(), isSupplier: (id) => known.has(id) });
        }
      : null,
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.formTitle} onBack={() => router.back()} backLabel={t.back} />
      {!data || draft.waiting ? (
        <View style={styles.state}>
          <Spinner color={Zinc[900]} size={24} />
        </View>
      ) : draft.notice ? (
        <View style={styles.state}>
          <Txt style={styles.notice}>{draft.notice}</Txt>
        </View>
      ) : (
        <NewPurchaseBody data={data} draft={draftId && draft.opened ? { id: draftId, opened: draft.opened } : null} />
      )}
    </SafeAreaView>
  );
}

function NewPurchaseBody({ data, draft }: { data: SupplierData; draft: { id: string; opened: OpenedOrderDraft } | null }) {
  const t = useCopy(PURCHASE_COPY);
  const d = useCopy(DRAFT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = usePurchaseWrite();
  const parked = useParking('purchase_order', draft?.id ?? null);

  // Receiving needs its own permission; without it an order can only wait for whoever has it.
  const mayReceive = can('purchase.receive');
  const [start] = useState<OrderForm>(() =>
    draft
      ? { ...draft.opened.form, shipping_status: mayReceive ? draft.opened.form.shipping_status : 'pending' }
      : { si_no: generateSINo(), supplier_id: '', date: todayISO(), shipping_status: 'pending', sp: '', notes: '', lines: [] },
  );
  const [form, setForm] = useState<OrderForm>(start);
  // What leaving would lose is measured from here: the form as it opened, or as last parked.
  const [baseline, setBaseline] = useState<OrderForm>(start);
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = (Object.keys(baseline) as (keyof OrderForm)[]).some((k) => form[k] !== baseline[k]);
  const guard = useLeaveGuard(dirty);

  const set = (patch: Partial<OrderForm>) => setForm((f) => ({ ...f, ...patch }));
  const setLine = (productId: string, patch: Partial<DraftLine>) =>
    setForm((f) => ({ ...f, lines: f.lines.map((line) => (line.product_id === productId ? { ...line, ...patch } : line)) }));

  const priced = pricedLines(form);
  const totals = orderTotals(priced);
  const errors = orderFormErrors(form);
  const shown: OrderFormErrors = submitted ? errors : { lines: {} };
  const pieces = priced.reduce((sum, line) => sum + line.qty, 0);

  const supplier = data.suppliers.find((s) => s.id === form.supplier_id);
  const supplierName = String(supplier?.name || supplier?.company_name || '');
  // Signed as the Supplier dashboard signs it: positive, they hold an advance of ours.
  const previous = supplier ? supplierBalanceOf(supplier, data.purchases, data.payments) : 0;
  const after = previous - totals.totalDeposit;

  /**
   * Parks the order as it stands - unchecked but for the supplier, as the
   * website's saveAsDraft asks: the drafts list is kept by whom it is for.
   */
  const park = async () => {
    if (parked.parking || saving) return;
    if (!form.supplier_id) {
      setError(d.needSupplier);
      return;
    }
    setError(null);
    try {
      await parked.park(draftFromOrder(form, supplierName));
      setBaseline(form);
      toast.show(d.saved);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const outcome = await write(async () => {
        const created = await createPurchase(orderInput(form, supplierName));
        // The order stands whatever happens to the draft it came from.
        const draftLeft = !(await parked.clear());
        if (form.shipping_status !== 'received') return { message: t.saved, draftLeft };
        // The order exists from here on, so a failed receive is reported rather
        // than left on the form - saving again would place the order twice.
        try {
          await receiveWholePurchase(created.id, { receive_date: form.date, receiver_name: '', notes: 'Received on order creation' });
          return { message: t.savedReceived, draftLeft };
        } catch (e) {
          return { message: t.savedNotReceived(errorMessage(e)), draftLeft };
        }
      });
      toast.show([outcome.message, outcome.draftLeft ? d.notCleared : ''].filter(Boolean).join(' '));
      guard.finish();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  const submit = () => {
    if (saving || parked.parking) return;
    setSubmitted(true);
    if (hasErrors(errors)) return;
    // Received moves stock, so it is confirmed first, as on the website.
    if (form.shipping_status === 'received') setConfirming(true);
    else save();
  };

  return (
    <>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.group}>
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
            {draft?.opened.supplierGone && !form.supplier_id ? <Txt style={styles.warn}>{d.supplierGone}</Txt> : null}
            {previous < 0 ? <Txt style={[styles.balance, styles.owed]}>{t.previousDue(money(-previous))}</Txt> : null}
            {previous > 0 ? <Txt style={[styles.balance, styles.advance]}>{t.previousAdvance(money(previous))}</Txt> : null}
          </View>

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

          {mayReceive ? (
            <View style={styles.group}>
              <Txt style={styles.label}>{t.status}</Txt>
              <View accessibilityRole="radiogroup" accessibilityLabel={t.status} style={styles.row}>
                {STATUSES.map((status) => (
                  <ChoiceCard
                    key={status}
                    title={t.statuses[status]}
                    sub={status === 'pending' ? t.statusPendingSub : t.statusReceivedSub}
                    selected={form.shipping_status === status}
                    picked={status === 'received' ? PICKED_IN : undefined}
                    onPress={() => set({ shipping_status: status })}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.group}>
            <Txt accessibilityRole="header" style={styles.section}>
              {t.products}
            </Txt>
            {draft && draft.opened.dropped > 0 ? <Txt style={styles.warn}>{d.dropped(formatNumber(draft.opened.dropped, lang))}</Txt> : null}
            {form.lines.map((line, i) => (
              <OrderLineCard
                key={line.product_id}
                line={line}
                priced={priced[i]}
                onChange={(patch) => setLine(line.product_id, patch)}
                onRemove={() => set({ lines: form.lines.filter((l) => l.product_id !== line.product_id) })}
                errors={shown.lines[line.product_id]}
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
            hint={t.spHint}
            keyboardType="decimal-pad"
          />

          <View style={styles.group}>
            <TotalsList
              rows={[
                { label: t.gross, value: money(totals.grossSubtotal) },
                { label: t.discount, value: `−${money(totals.discountAmount)}` },
                { label: t.totalBill, value: money(totals.totalAmount) },
                { label: t.spTotal, value: `−${money(totals.totalSp)}` },
              ]}
              // The website's grand total: the deposit, or the bill when the incentive takes it all.
              grand={{ label: t.deposit, value: money(totals.totalDeposit || totals.totalAmount) }}
            />
            {supplier && form.lines.length ? (
              <Txt style={[styles.balance, after < 0 ? styles.owed : styles.advance]}>
                {after < 0 ? t.owedAfter(money(-after)) : t.advanceAfter(money(after))}
              </Txt>
            ) : null}
          </View>

          <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.notes} onChangeText={(notes) => set({ notes })} minHeight={64} />
          {form.shipping_status === 'pending' ? (
            <View style={styles.stockNote}>
              <Txt style={styles.stockNoteText}>{t.pendingNote}</Txt>
            </View>
          ) : null}
          {can('purchaseDraft.write') ? (
            <Button title={parked.draftId ? d.update : d.save} icon="fileText" variant="pillOutline" onPress={park} busy={parked.parking} disabled={saving} />
          ) : null}
          <AlertBanner tone="error">{error}</AlertBanner>
        </ScrollView>
        <FormFooter cancelLabel={t.cancel} onCancel={() => router.back()} saveLabel={saving ? t.saving : t.save} onSave={submit} saving={saving} />
      </KeyboardAvoidingView>

      <ProductPickerSheet
        open={picking}
        title={t.chooseProduct}
        onClose={() => setPicking(false)}
        onPick={(product) => setForm((f) => ({ ...f, lines: withProduct(f.lines, product) }))}
      />
      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t.receiveNowTitle}
        text={t.receiveNowText(formatNumber(pieces, lang))}
        cancelLabel={t.cancel}
        confirmLabel={t.receiveNowConfirm}
        closeLabel={t.close}
        busy={saving}
        icon="download"
        tone="primary"
        onConfirm={save}
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
  row: { flexDirection: 'row', gap: 8 },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  section: { fontSize: 16, fontWeight: '600', color: Zinc[900] },
  balance: { fontSize: 13, fontWeight: '600' },
  owed: { color: Red[700] },
  advance: { color: Green[700] },
  warn: { fontSize: 13, color: Amber[800] },
  stockNote: { padding: 12, borderRadius: 14, backgroundColor: Amber[50], borderWidth: 1, borderColor: Amber[200] },
  stockNoteText: { fontSize: 13, color: Amber[900] },
});
