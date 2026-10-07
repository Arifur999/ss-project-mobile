import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { FormFooter } from '@/components/FormFooter';
import { PaymentRowFields, type PaymentRow } from '@/components/PaymentRowFields';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { Spinner } from '@/components/Spinner';
import { SwitchRow } from '@/components/SwitchRow';
import { TextField } from '@/components/TextField';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Blue, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { CustomerFormSheet } from '@/features/customers/CustomerFormSheet';
import { ProductPickerSheet } from '@/features/products/ProductPickerSheet';
import { SALES_COPY } from '@/features/sales/copy';
import { dueCollections, newInvoiceNo, saleFormErrors, salePlan, saleTotals, withProduct, type SaleForm, type SaleLine } from '@/features/sales/saleForm';
import { SaleLineCard } from '@/features/sales/SaleLineCard';
import { useCan } from '@/hooks/useCan';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { todayISO } from '@/lib/dates';
import { hasErrors } from '@/lib/formErrors';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { isValidBdPhone, phoneDigits } from '@/lib/phone';
import { previousDueFor } from '@/lib/previousDue';
import { buildInvoiceSms, smsBusiness } from '@/lib/smsTexts';
import { useBusinessSettings } from '@/services/business.services';
import { createCustomerPayment, useCustomerData } from '@/services/customers.services';
import { createSale, useSaleWrite } from '@/services/sales.services';
import { sendSms, smsFailureReason } from '@/services/sms.services';

const rowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Making a sale - Hatim's New Sales Entry: the invoice number and date, a saved
 * customer (or a new one, or a walk-in typed in), products priced line by
 * line, the previous due added to what is payable, payment across one or more
 * accounts, and an invoice SMS. The server saves the sale, its stock and FIFO
 * cost in one transaction; money beyond the invoice is collected against the
 * old due, as the website does.
 */
export default function NewSaleScreen() {
  const t = useCopy(SALES_COPY);
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useSaleWrite();
  const business = useBusinessSettings();
  const { data } = useCustomerData();

  const accounts = data?.accounts ?? [];
  const [start] = useState<SaleForm>(() => ({
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
  }));
  const [form, setForm] = useState<SaleForm>(start);
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = (Object.keys(start) as (keyof SaleForm)[]).some((k) => form[k] !== start[k]);
  const guard = useLeaveGuard(dirty);

  const set = (patch: Partial<SaleForm>) => setForm((f) => ({ ...f, ...patch }));
  const setLine = (productId: string, patch: Partial<SaleLine>) =>
    setForm((f) => ({ ...f, lines: f.lines.map((line) => (line.product_id === productId ? { ...line, ...patch } : line)) }));
  const setRow = (key: string, patch: Partial<PaymentRow>) =>
    setForm((f) => ({ ...f, rows: f.rows.map((row) => (row.key === key ? { ...row, ...patch } : row)) }));

  const customer = data?.customers.find((c) => c.id === form.customer_id);
  const owed = previousDueFor(form.customer_id, data);
  // The old due is collected with the sale only by whoever may record a collection.
  const collectable = can('customerPayment.create') ? owed : 0;
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

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setSaving(true);
    setError(null);
    const plan = salePlan(form, customer, totals);
    try {
      const outcome = await write(async () => {
        const sale = await createSale(plan.sale);
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
        return { invoiceNo, dueError };
      });
      const sms = form.sms ? await textInvoice(outcome.invoiceNo, plan.finalPaid, plan.finalDue) : '';
      toast.show([t.saved(outcome.invoiceNo), outcome.dueError ? t.dueFailed(outcome.dueError) : '', sms].filter(Boolean).join(' '));
      guard.finish();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.formTitle} onBack={() => router.back()} backLabel={t.back} />
      {!data ? (
        <View style={styles.state}>
          <Spinner color={Zinc[900]} size={24} />
        </View>
      ) : (
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
                options={data.customers.filter((c) => c.is_active !== false).map((c) => ({ key: c.id, label: [c.name, c.phone].filter(Boolean).join(' - ') }))}
                onChange={(customer_id) => set({ customer_id })}
                error={shown.customer ? t.errCustomer : undefined}
                searchPlaceholder={t.searchCustomers}
                emptyText={t.noCustomerMatch}
              />
              {customer ? (
                <>
                  {customer.phone || customer.address ? <Txt style={styles.hint}>{[customer.phone, customer.address].filter(Boolean).join(' · ')}</Txt> : null}
                  {owed > 0 ? <Txt style={styles.owed}>{collectable > 0 ? t.owesBefore(money(owed)) : t.owesBeforeInfo(money(owed))}</Txt> : null}
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
            {can('sms.send') ? <SwitchRow title={t.smsInvoice} hint={t.smsInvoiceSub} value={form.sms} onChange={(sms) => set({ sms })} /> : null}
            <AlertBanner tone="error">{error}</AlertBanner>
          </ScrollView>
          <FormFooter cancelLabel={t.cancel} onCancel={() => router.back()} saveLabel={saving ? t.saving : t.save} onSave={save} saving={saving} />
        </KeyboardAvoidingView>
      )}

      <ProductPickerSheet
        open={picking}
        title={t.chooseProduct}
        onClose={() => setPicking(false)}
        onPick={(product) => setForm((f) => ({ ...f, lines: withProduct(f.lines, product) }))}
        detail={(product) => money(product.selling_price)}
      />
      <CustomerFormSheet open={adding} onClose={() => setAdding(false)} editing={null} onSaved={(saved) => set({ customer_id: saved.id })} />
      {guard.sheet}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  flex: { flex: 1 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 18 },
  group: { gap: 8 },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  section: { fontSize: 16, fontWeight: '600', color: Zinc[900] },
  hint: { fontSize: 13, color: Zinc[500] },
  owed: { fontSize: 13, fontWeight: '600', color: Red[700] },
  payHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  linkText: { fontSize: 14, fontWeight: '600', color: Blue[700] },
});
