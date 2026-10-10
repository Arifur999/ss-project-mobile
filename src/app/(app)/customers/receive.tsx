import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { FormFooter } from '@/components/FormFooter';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { LoadingState } from '@/components/LoadingState';
import { PaymentRowFields, type PaymentRow } from '@/components/PaymentRowFields';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { SuggestionChips } from '@/components/SuggestionChips';
import { SwitchRow } from '@/components/SwitchRow';
import { TextField } from '@/components/TextField';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import {
  discountExpense,
  discountOf,
  paymentInputs,
  receiptFormErrors,
  receivingNow,
  type ReceiptForm,
  type ReceiptFormErrors,
} from '@/features/customers/receiptForm';
import { useCan } from '@/hooks/useCan';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { todayISO } from '@/lib/dates';
import { hasErrors } from '@/lib/formErrors';
import { errorMessage } from '@/lib/httpClient';
import { previousDueFor } from '@/lib/previousDue';
import { formatNumber } from '@/lib/money';
import { isValidBdPhone, phoneDigits } from '@/lib/phone';
import { buildDuePaymentSms, smsBusiness } from '@/lib/smsTexts';
import { useBusinessSettings } from '@/services/business.services';
import { createCustomerPayment, useCustomerData, useCustomerWrite } from '@/services/customers.services';
import { createExpense } from '@/services/expenses.services';
import { sendSms, smsFailureReason } from '@/services/sms.services';

const rowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Collecting a customer's due - Hatim's Due Received form: the customer and
 * what they owe, the account or accounts the money went into, an optional
 * discount booked as an expense, who took it, and a receipt SMS. Never more
 * than is owed.
 */
export default function ReceiveDueScreen() {
  const t = useCopy(CUSTOMER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useCustomerWrite();
  const business = useBusinessSettings();
  const { data } = useCustomerData();
  const params = useLocalSearchParams<{ customer?: string }>();

  const accounts = data?.accounts ?? [];
  const [start] = useState<ReceiptForm>(() => ({
    date: todayISO(),
    customer_id: typeof params.customer === 'string' ? params.customer : '',
    // A shop with one account need not pick it every time.
    rows: [{ key: rowKey(), account_id: accounts.length === 1 ? accounts[0].id : '', amount: '' }],
    discount: '',
    category_id: '',
    receiver: '',
    notes: '',
    sms: false,
  }));
  const [form, setForm] = useState<ReceiptForm>(start);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = (Object.keys(start) as (keyof ReceiptForm)[]).some((k) => form[k] !== start[k]);
  const guard = useLeaveGuard(dirty);

  const set = (patch: Partial<ReceiptForm>) => setForm((f) => ({ ...f, ...patch }));
  const setRow = (key: string, patch: Partial<PaymentRow>) =>
    setForm((f) => ({ ...f, rows: f.rows.map((row) => (row.key === key ? { ...row, ...patch } : row)) }));

  const customer = data?.customers.find((c) => c.id === form.customer_id);
  const category = data?.categories.find((c) => c.id === form.category_id);
  const previous = previousDueFor(form.customer_id, data);
  const paidNow = receivingNow(form);
  const discount = Number.isFinite(discountOf(form)) ? discountOf(form) : 0;
  const remaining = Math.max(0, previous - (paidNow + discount));
  const errors = receiptFormErrors(form, previous);
  const shown: ReceiptFormErrors = submitted ? errors : { lines: {} };
  // A discount is booked as an expense, so it is offered only to whoever may write one.
  const mayDiscount = can('expense.create') && (data?.categories.length ?? 0) > 0;
  const rowLabels = { account: t.account, chooseAccount: t.chooseAccount, amount: t.amount, remove: t.removeRow, close: t.close, errAccount: t.errAccount, errAmount: t.errAmount };

  const textReceipt = async () => {
    const phone = String(customer?.phone || '');
    if (!isValidBdPhone(phone)) return t.smsSkipped;
    try {
      await sendSms([phoneDigits(phone)], buildDuePaymentSms({ ...smsBusiness(business.data), paid: paidNow, remainingDue: remaining }));
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
    const name = String(customer?.name || '');
    try {
      const outcome = await write(async () => {
        const inputs = paymentInputs(form, name, accounts, category);
        let saved = 0;
        try {
          for (const input of inputs) {
            await createCustomerPayment(input);
            saved += 1;
          }
        } catch (e) {
          // Nothing saved: the form stays and can be tried again. Some saved:
          // say so and leave, since saving again would collect them twice.
          if (saved === 0) throw e;
          return { message: t.partSaved(formatNumber(saved, lang), formatNumber(inputs.length, lang), errorMessage(e)), complete: false };
        }
        if (discount > 0 && category) {
          try {
            await createExpense(discountExpense(form, category, name));
          } catch (e) {
            return { message: t.discountFailed(errorMessage(e)), complete: true };
          }
        }
        return { message: t.saved, complete: true };
      });
      // Only a collection saved whole is texted - a partial one would quote the wrong figures.
      const sms = outcome.complete && form.sms ? await textReceipt() : '';
      toast.show([outcome.message, sms].filter(Boolean).join(' '));
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
        <LoadingState fill />
      ) : (
        <KeyboardScreen style={styles.flex}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />

            <View style={styles.group}>
              <SelectField
                label={t.customerField}
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
                <Txt style={[styles.balance, previous > 0 ? styles.owed : styles.clear]}>{previous > 0 ? t.owes(money(previous)) : t.owesNothing}</Txt>
              ) : null}
            </View>

            <View style={styles.group}>
              <Txt accessibilityRole="header" style={styles.section}>
                {t.paidInto}
              </Txt>
              {form.rows.map((row) => (
                <PaymentRowFields
                  key={row.key}
                  row={row}
                  accounts={accounts}
                  onChange={(patch) => setRow(row.key, patch)}
                  onRemove={form.rows.length > 1 ? () => set({ rows: form.rows.filter((r) => r.key !== row.key) }) : undefined}
                  errors={shown.lines[row.key]}
                  labels={rowLabels}
                />
              ))}
              {form.rows.length < accounts.length && !(discount > 0) ? (
                <Button
                  title={t.addAccount}
                  icon="plus"
                  variant="pillOutline"
                  // A split collection takes no discount, so whatever was typed there goes.
                  onPress={() => set({ rows: [...form.rows, { key: rowKey(), account_id: '', amount: '' }], discount: '', category_id: '' })}
                  disabled={saving}
                />
              ) : null}
            </View>

            {mayDiscount ? (
              form.rows.length === 1 ? (
                <View style={styles.group}>
                  <TextField
                    tone="zinc"
                    label={t.discountField}
                    placeholder="0"
                    value={form.discount}
                    onChangeText={(d) => set({ discount: d })}
                    error={shown.discount ? t.errDiscount : undefined}
                    plainError
                    hint={t.discountHint}
                    keyboardType="decimal-pad"
                  />
                  {discount > 0 ? (
                    <SelectField
                      label={t.category}
                      placeholder={t.chooseCategory}
                      closeLabel={t.close}
                      value={form.category_id}
                      options={data.categories.map((c) => ({ key: c.id, label: c.name }))}
                      onChange={(category_id) => set({ category_id })}
                      error={shown.category ? t.errCategory : undefined}
                    />
                  ) : null}
                </View>
              ) : (
                <Txt style={styles.hint}>{t.oneAccountWithDiscount}</Txt>
              )
            ) : null}
            {shown.split ? <FieldError plain>{t.oneAccountWithDiscount}</FieldError> : null}

            <View style={styles.group}>
              <TextField
                tone="zinc"
                label={t.receiverField}
                placeholder={t.receiverPlaceholder}
                value={form.receiver}
                onChangeText={(receiver) => set({ receiver })}
                error={shown.receiver ? t.errReceiver : undefined}
                plainError
              />
              <SuggestionChips suggestions={data.receivers} value={form.receiver} onPick={(receiver) => set({ receiver })} />
            </View>

            <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.notes} onChangeText={(notes) => set({ notes })} minHeight={64} />

            <View style={styles.group}>
              <TotalsList
                rows={[
                  { label: t.previousDue, value: money(previous) },
                  { label: t.receivingNow, value: money(paidNow) },
                  ...(discount > 0 ? [{ label: t.discount, value: money(discount) }] : []),
                ]}
                grand={{ label: t.dueAfter, value: money(remaining) }}
              />
              {shown.tooMuch ? (
                <FieldError plain>{t.errTooMuch(money(previous), money(paidNow + discount), money(paidNow + discount - previous))}</FieldError>
              ) : null}
            </View>

            {can('sms.send') ? <SwitchRow title={t.smsReceipt} hint={t.smsReceiptSub} value={form.sms} onChange={(sms) => set({ sms })} /> : null}
            <AlertBanner tone="error">{error}</AlertBanner>
          </ScrollView>
          <FormFooter cancelLabel={t.cancel} onCancel={() => router.back()} saveLabel={saving ? t.saving : t.save} onSave={save} saving={saving} />
        </KeyboardScreen>
      )}
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
  section: { fontSize: 16, fontWeight: '600', color: Zinc[900] },
  balance: { fontSize: 13, fontWeight: '600' },
  owed: { color: Red[700] },
  clear: { color: Green[700] },
  hint: { fontSize: 13, color: Zinc[500] },
});
