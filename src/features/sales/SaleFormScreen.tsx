import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { FormFooter } from '@/components/FormFooter';
import { LoadingState } from '@/components/LoadingState';
import { PaymentRowFields, type PaymentRow } from '@/components/PaymentRowFields';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { SwitchRow } from '@/components/SwitchRow';
import { TextField } from '@/components/TextField';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Amber, Blue, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { CustomerFormSheet } from '@/features/customers/CustomerFormSheet';
import { ProductPickerSheet } from '@/features/products/ProductPickerSheet';
import { DRAFT_COPY } from '@/features/drafts/copy';
import { useOpenedDraft, useParking } from '@/features/drafts/useDraftForm';
import { SALES_COPY } from '@/features/sales/copy';
import { draftFromForm, formFromDraft, type OpenedDraft } from '@/features/sales/saleDraft';
import {
  dueCollections,
  formFromSale,
  newInvoiceNo,
  saleEditable,
  saleFormErrors,
  salePlan,
  saleTotals,
  withProduct,
  type SaleForm,
  type SaleLine,
} from '@/features/sales/saleForm';
import { SaleLineCard } from '@/features/sales/SaleLineCard';
import { useCan } from '@/hooks/useCan';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { todayISO } from '@/lib/dates';
import { hasErrors } from '@/lib/formErrors';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber, parseAmount } from '@/lib/money';
import { isValidBdPhone, phoneDigits } from '@/lib/phone';
import { previousDueFor } from '@/lib/previousDue';
import { buildInvoiceSms, smsBusiness } from '@/lib/smsTexts';
import { useBusinessSettings } from '@/services/business.services';
import { createCustomerPayment, useCustomerData, type CustomerData } from '@/services/customers.services';
import { createSale, updateSale, useSaleWrite } from '@/services/sales.services';
import { sendSms, smsFailureReason } from '@/services/sms.services';

type Row = Record<string, any>;

const rowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Making a sale - Hatim's New Sales Entry: the invoice number and date, a saved
 * customer (or a new one, or a walk-in typed in), products priced line by
 * line, the previous due added to what is payable, payment across one or more
 * accounts, and an invoice SMS. The server saves the sale, its stock and FIFO
 * cost in one transaction; money beyond the invoice is collected against the
 * old due, as the website does. The form starts once the customers and
 * accounts are in, so what it starts from is never missing them.
 *
 * Given a sale's id it edits that sale instead, as the website's editSale
 * does: the server puts the old lines' stock back and writes the new ones,
 * the old due is not collected again, and no invoice SMS goes out.
 *
 * A new sale can be parked as a draft and parked again over it; given a
 * draft's id the form opens it, as the website's openDraft does, and saving
 * the sale clears it. The draft is read once: publishing deletes it, so the
 * form keeps the copy it opened rather than following the server.
 */
export function SaleFormScreen({ saleId, draftId }: { saleId?: string; draftId?: string }) {
  const t = useCopy(SALES_COPY);
  const { data } = useCustomerData();
  const draft = useOpenedDraft(
    draftId,
    data
      ? (raw) => {
          const known = new Set(data.customers.map((c) => c.id));
          return formFromDraft(raw, { rowKey, today: todayISO(), isCustomer: (id) => known.has(id) });
        }
      : null,
  );

  const editing = saleId ? (data?.sales.find((sale) => sale.id === saleId) ?? null) : null;
  const notice = !data ? null : saleId && !editing ? t.notFound : editing && !saleEditable(editing) ? t.editBlocked : draft.notice;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={saleId ? t.editTitle : t.formTitle} onBack={() => router.back()} backLabel={t.back} />
      {!data || draft.waiting ? (
        <LoadingState fill />
      ) : notice ? (
        <View style={styles.state}>
          <Txt style={styles.notice}>{notice}</Txt>
        </View>
      ) : (
        <SaleFormBody data={data} editing={editing} draft={draftId && draft.opened ? { id: draftId, opened: draft.opened } : null} />
      )}
    </SafeAreaView>
  );
}

function SaleFormBody({ data, editing, draft }: { data: CustomerData; editing: Row | null; draft: { id: string; opened: OpenedDraft } | null }) {
  const t = useCopy(SALES_COPY);
  const d = useCopy(DRAFT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useSaleWrite();
  const parked = useParking('sale', draft?.id ?? null);
  const business = useBusinessSettings();

  const accounts = data.accounts;
  const [start] = useState<SaleForm>(() =>
    editing
      ? formFromSale(editing, rowKey)
      : draft
        ? draft.opened.form
        : {
          invoice_no: newInvoiceNo(),
          date: todayISO(),
          customer_id: '',
          customer_name: '',
          customer_phone: '',
          customer_address: '',
          lines: [],
          // A shop with one account need not pick it every time.
          rows: [{ key: rowKey(), account_id: accounts.length === 1 ? accounts[0].id : '', amount: '' }],
          notes: '',
          sms: false,
        },
  );
  const [form, setForm] = useState<SaleForm>(start);
  // What leaving would lose is measured from here: the form as it opened, or as last parked.
  const [baseline, setBaseline] = useState<SaleForm>(start);
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = (Object.keys(baseline) as (keyof SaleForm)[]).some((k) => form[k] !== baseline[k]);
  const guard = useLeaveGuard(dirty);

  const set = (patch: Partial<SaleForm>) => setForm((f) => ({ ...f, ...patch }));
  const setLine = (productId: string, patch: Partial<SaleLine>) =>
    setForm((f) => ({ ...f, lines: f.lines.map((line) => (line.product_id === productId ? { ...line, ...patch } : line)) }));
  const setRow = (key: string, patch: Partial<PaymentRow>) =>
    setForm((f) => ({ ...f, rows: f.rows.map((row) => (row.key === key ? { ...row, ...patch } : row)) }));

  const customer = data.customers.find((c) => c.id === form.customer_id);
  // An edited invoice is left out of what is owed besides it.
  const owed = previousDueFor(form.customer_id, data, { saleId: editing?.id });
  // The old due is collected with the sale only by whoever may record a collection.
  // Never while editing: the old due collected with this sale is already its own record.
  const collectable = !editing && can('customerPayment.create') ? owed : 0;
  const totals = saleTotals(form, collectable);
  const errors = saleFormErrors(form, totals);
  const shown = submitted ? errors : { lines: {}, rows: {} };
  const rowLabels = {
    account: t.account,
    chooseAccount: t.chooseAccount,
    amount: t.amount,
    remove: t.removeLine,
    close: t.close,
    errAccount: t.errAccount,
    errAmount: t.errAmount,
  };

  // Whatever the other accounts do not cover goes on the first.
  const payInFull = () =>
    setForm((f) => {
      const others = f.rows.slice(1).reduce((sum, row) => sum + Math.max(0, parseAmount(row.amount) || 0), 0);
      const first = { ...f.rows[0], amount: String(Math.max(0, totals.grandTotal - others)) };
      return { ...f, rows: [first, ...f.rows.slice(1)] };
    });

  const textInvoice = async (invoiceNo: string, paid: number, due: number) => {
    const phone = customer ? String(customer.phone || '') : form.customer_phone;
    if (!isValidBdPhone(phone)) return t.smsSkipped;
    try {
      await sendSms([phoneDigits(phone)], buildInvoiceSms({ ...smsBusiness(business.data), invoiceNo, grandTotal: totals.grandTotal, paid, due }));
      return t.smsSent;
    } catch (e) {
      return t.smsNotSent(smsFailureReason(e));
    }
  };

  /** Parks the form as it stands - unchecked, as half an invoice is what a draft is for - over the draft it came from. */
  const park = async () => {
    if (parked.parking || saving) return;
    setError(null);
    try {
      await parked.park(draftFromForm(form, customer, accounts, totals));
      setBaseline(form);
      toast.show(d.saved);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const save = async () => {
    if (saving || parked.parking) return;
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setSaving(true);
    setError(null);
    const plan = salePlan(form, customer, totals);
    try {
      const outcome = await write(async () => {
        const sale = editing ? await updateSale(String(editing.id), plan.sale) : await createSale(plan.sale);
        // The number the server saved, which may have moved past one already taken.
        const invoiceNo = String(sale?.invoice_no || plan.sale.invoice_no);
        let dueError: string | null = null;
        if (customer && plan.dueRows.length > 0) {
          // The sale is saved either way; a failed collection is reported, not retried.
          try {
            for (const input of dueCollections(plan, form, customer, accounts, invoiceNo)) await createCustomerPayment(input);
          } catch (e) {
            dueError = errorMessage(e);
          }
        }
        // The sale stands whatever happens to the draft it came from.
        const draftLeft = !(await parked.clear());
        return { invoiceNo, dueError, draftLeft };
      });
      const sms = form.sms ? await textInvoice(outcome.invoiceNo, plan.finalPaid, plan.finalDue) : '';
      toast.show(
        [editing ? t.updated(outcome.invoiceNo) : t.saved(outcome.invoiceNo), outcome.dueError ? t.dueFailed(outcome.dueError) : '', outcome.draftLeft ? d.notCleared : '', sms]
          .filter(Boolean)
          .join(' '),
      );
      guard.finish();
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
          <View style={styles.pair}>
            <View style={styles.grow}>
              <TextField
                tone="zinc"
                label={t.invoiceNo}
                value={form.invoice_no}
                onChangeText={(invoice_no) => set({ invoice_no })}
                error={shown.invoice ? t.errInvoice : undefined}
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
              {t.customer}
            </Txt>
            <SelectField
              placeholder={t.chooseCustomer}
              closeLabel={t.close}
              value={form.customer_id}
              options={data.customers.filter((c) => c.is_active !== false || c.id === form.customer_id).map((c) => ({ key: c.id, label: [c.name, c.phone].filter(Boolean).join(' - ') }))}
              onChange={(customer_id) => set({ customer_id })}
              error={shown.customer ? t.errCustomer : undefined}
              searchPlaceholder={t.searchCustomers}
              emptyText={t.noCustomerMatch}
            />
            {customer ? (
              <>
                {customer.phone || customer.address ? <Txt style={styles.hint}>{[customer.phone, customer.address].filter(Boolean).join(' · ')}</Txt> : null}
                {owed > 0 ? (
                  <Txt style={styles.owed}>{editing ? t.owesOnEdit(money(owed)) : collectable > 0 ? t.owesBefore(money(owed)) : t.owesBeforeInfo(money(owed))}</Txt>
                ) : null}
                <Pressable accessibilityRole="button" onPress={() => set({ customer_id: '' })} style={styles.link}>
                  <Txt style={styles.linkText}>{t.walkIn}</Txt>
                </Pressable>
              </>
            ) : (
              <>
                {can('customers.write') ? <Button title={t.newCustomer} icon="plus" variant="pillOutline" onPress={() => setAdding(true)} disabled={saving} /> : null}
                <Txt style={styles.hint}>{t.walkInHint}</Txt>
                <TextField tone="zinc" label={t.customerName} placeholder={t.optional} value={form.customer_name} onChangeText={(customer_name) => set({ customer_name })} />
                <TextField
                  tone="zinc"
                  label={t.customerPhone}
                  placeholder="01XXXXXXXXX"
                  value={form.customer_phone}
                  onChangeText={(customer_phone) => set({ customer_phone })}
                  error={shown.phone ? t.errPhone : undefined}
                  plainError
                  keyboardType="phone-pad"
                />
                <TextField
                  tone="zinc"
                  label={t.customerAddress}
                  placeholder={t.optional}
                  value={form.customer_address}
                  onChangeText={(customer_address) => set({ customer_address })}
                />
              </>
            )}
          </View>

          <View style={styles.group}>
            <Txt accessibilityRole="header" style={styles.section}>
              {t.products}
            </Txt>
            {draft && draft.opened.dropped > 0 ? <Txt style={styles.dropped}>{d.dropped(formatNumber(draft.opened.dropped, lang))}</Txt> : null}
            {form.lines.map((line) => (
              <SaleLineCard
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

          <TotalsList
            rows={[
              { label: t.subtotal, value: money(totals.subtotal) },
              { label: t.discount, value: `−${money(totals.totalDiscount)}` },
              { label: t.invoiceTotal, value: money(totals.invoiceTotal) },
              ...(totals.previousDue > 0 ? [{ label: t.previousDue, value: money(totals.previousDue) }] : []),
            ]}
            grand={{ label: t.payable, value: money(totals.grandTotal) }}
          />

          <View style={styles.group}>
            <View style={styles.payHead}>
              <Txt accessibilityRole="header" style={[styles.section, styles.grow]}>
                {t.payment}
              </Txt>
              <Pressable accessibilityRole="button" onPress={payInFull} style={styles.link}>
                <Txt style={styles.linkText}>{t.payInFull}</Txt>
              </Pressable>
            </View>
            {form.rows.map((row) => (
              <PaymentRowFields
                key={row.key}
                row={row}
                accounts={accounts}
                onChange={(patch) => setRow(row.key, patch)}
                onRemove={form.rows.length > 1 ? () => set({ rows: form.rows.filter((r) => r.key !== row.key) }) : undefined}
                errors={shown.rows[row.key]}
                labels={rowLabels}
              />
            ))}
            {form.rows.length < accounts.length ? (
              <Button
                title={t.addAccount}
                icon="plus"
                variant="pillOutline"
                onPress={() => set({ rows: [...form.rows, { key: rowKey(), account_id: '', amount: '' }] })}
                disabled={saving}
              />
            ) : null}
          </View>

          <View style={styles.group}>
            <TotalsList rows={[{ label: t.paid, value: money(totals.totalPaid) }]} grand={{ label: t.dueAfter, value: money(totals.due) }} />
            {shown.overpaid ? <FieldError plain>{t.errOverpaid}</FieldError> : null}
          </View>

          <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.notes} onChangeText={(notes) => set({ notes })} minHeight={64} />
          {!editing && can('draft.write') ? (
            <Button title={parked.draftId ? d.update : d.save} icon="fileText" variant="pillOutline" onPress={park} busy={parked.parking} disabled={saving} />
          ) : null}
          {!editing && can('sms.send') ? <SwitchRow title={t.smsInvoice} hint={t.smsInvoiceSub} value={form.sms} onChange={(sms) => set({ sms })} /> : null}
          <AlertBanner tone="error">{error}</AlertBanner>
        </ScrollView>
        <FormFooter cancelLabel={t.cancel} onCancel={() => router.back()} saveLabel={saving ? t.saving : t.save} onSave={save} saving={saving} />
      </KeyboardAvoidingView>

      <ProductPickerSheet
        open={picking}
        title={t.chooseProduct}
        onClose={() => setPicking(false)}
        onPick={(product) => setForm((f) => ({ ...f, lines: withProduct(f.lines, product) }))}
        detail={(product) => money(product.selling_price)}
      />
      <CustomerFormSheet open={adding} onClose={() => setAdding(false)} editing={null} onSaved={(saved) => set({ customer_id: saved.id })} />
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
  hint: { fontSize: 13, color: Zinc[500] },
  owed: { fontSize: 13, fontWeight: '600', color: Red[700] },
  dropped: { fontSize: 13, color: Amber[800] },
  payHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  linkText: { fontSize: 14, fontWeight: '600', color: Blue[700] },
});
