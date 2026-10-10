import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { FormFooter } from '@/components/FormFooter';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { LoadingState } from '@/components/LoadingState';
import { PaymentRowFields, type PaymentRow } from '@/components/PaymentRowFields';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { SuggestionChips } from '@/components/SuggestionChips';
import { TextField } from '@/components/TextField';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Amber, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import {
  editFormFromReceipt,
  receiptEditable,
  receiptEditErrors,
  receiptUpdate,
  type ReceiptEditErrors,
  type ReceiptEditForm,
} from '@/features/customers/receiptEdit';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { groupReceipts, type Receipt } from '@/lib/customerReceipts';
import { hasErrors } from '@/lib/formErrors';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { previousDueFor } from '@/lib/previousDue';
import { updateCustomerPayment, useCustomerData, useCustomerWrite, type CustomerData } from '@/services/customers.services';

const rowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * A due collection, edited - the website's Edit Due received: when it was
 * taken, from whom, into which account and how much, who took it and why,
 * never more than the customer owes besides it. Its discount stays as it was.
 */
export default function EditReceiptScreen() {
  const t = useCopy(CUSTOMER_COPY);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useCustomerData();
  const receipt = data ? (groupReceipts(data.payments, data.customers, data.sales).find((r) => r.payment_ids.includes(String(id))) ?? null) : null;
  const notice = !data ? null : !receipt ? t.receiptGone : !receiptEditable(receipt) ? t.splitNoEdit : null;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.editTitle} onBack={() => router.back()} backLabel={t.back} />
      {!data ? (
        <LoadingState fill />
      ) : notice || !receipt ? (
        <View style={styles.state}>
          <Txt style={styles.notice}>{notice}</Txt>
        </View>
      ) : (
        <EditReceiptBody data={data} receipt={receipt} />
      )}
    </SafeAreaView>
  );
}

function EditReceiptBody({ data, receipt }: { data: CustomerData; receipt: Receipt }) {
  const t = useCopy(CUSTOMER_COPY);
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useCustomerWrite();

  const [start] = useState<ReceiptEditForm>(() => editFormFromReceipt(receipt, rowKey()));
  const [form, setForm] = useState<ReceiptEditForm>(start);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = (Object.keys(start) as (keyof ReceiptEditForm)[]).some((k) => form[k] !== start[k]);
  const guard = useLeaveGuard(dirty);

  const set = (patch: Partial<ReceiptEditForm>) => setForm((f) => ({ ...f, ...patch }));
  const setRow = (patch: Partial<PaymentRow>) => setForm((f) => ({ ...f, row: { ...f.row, ...patch } }));

  const paymentId = receipt.payment_ids[0];
  const customer = data.customers.find((c) => c.id === form.customer_id);
  // What the customer owes without this collection; its discount still counts against it.
  const owedBesides = previousDueFor(form.customer_id, data, { paymentId });
  const discount = Number(receipt.discount || 0);
  const amount = Number.isFinite(parseAmount(form.row.amount)) ? parseAmount(form.row.amount) : 0;
  const errors = receiptEditErrors(form, owedBesides, discount);
  const shown: ReceiptEditErrors = submitted ? errors : {};
  // One taken against an invoice keeps its customer, so the invoice and the collection never part.
  const customerLocked = !!receipt.sale_id;
  const rowLabels = { account: t.account, chooseAccount: t.chooseAccount, amount: t.amount, remove: t.removeRow, close: t.close, errAccount: t.errAccount, errAmount: t.errAmount };

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setSaving(true);
    setError(null);
    try {
      await write(() => updateCustomerPayment(paymentId, receiptUpdate(form, receipt, String(customer?.name || receipt.customer_name || ''), data.accounts)));
      toast.show(t.updated);
      guard.finish();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <KeyboardScreen style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />

          <View style={styles.group}>
            {customerLocked ? (
              <>
                <Txt style={styles.label}>{t.customerField}</Txt>
                <Txt style={styles.fixed}>{String(customer?.name || receipt.customer_name || '')}</Txt>
                <Txt style={styles.hint}>{t.customerLocked}</Txt>
              </>
            ) : (
              <SelectField
                label={t.customerField}
                placeholder={t.chooseCustomer}
                closeLabel={t.close}
                value={form.customer_id}
                options={data.customers
                  .filter((c) => c.is_active !== false || c.id === form.customer_id)
                  .map((c) => ({ key: c.id, label: [c.name, c.phone].filter(Boolean).join(' - ') }))}
                onChange={(customer_id) => set({ customer_id })}
                error={shown.customer ? t.errCustomer : undefined}
                searchPlaceholder={t.searchCustomers}
                emptyText={t.noCustomerMatch}
              />
            )}
            {customer ? <Txt style={styles.hint}>{t.owesBesides(money(owedBesides))}</Txt> : null}
          </View>

          <View style={styles.group}>
            <Txt accessibilityRole="header" style={styles.section}>
              {t.paidInto}
            </Txt>
            <PaymentRowFields row={form.row} accounts={data.accounts} onChange={setRow} errors={shown.row} labels={rowLabels} />
          </View>

          {discount > 0 ? <Txt style={styles.kept}>{t.discountKept(money(discount))}</Txt> : null}

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
                { label: t.previousDue, value: money(owedBesides) },
                { label: t.receivingNow, value: money(amount) },
                ...(discount > 0 ? [{ label: t.discount, value: money(discount) }] : []),
              ]}
              grand={{ label: t.dueAfter, value: money(Math.max(0, owedBesides - amount - discount)) }}
            />
            {shown.tooMuch ? <FieldError plain>{t.errTooMuch(money(owedBesides), money(amount + discount), money(amount + discount - owedBesides))}</FieldError> : null}
          </View>

          <AlertBanner tone="error">{error}</AlertBanner>
        </ScrollView>
        <FormFooter cancelLabel={t.cancel} onCancel={() => router.back()} saveLabel={saving ? t.saving : t.save} onSave={save} saving={saving} />
      </KeyboardScreen>
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
  section: { fontSize: 16, fontWeight: '600', color: Zinc[900] },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  fixed: { fontSize: 15, color: Zinc[900] },
  hint: { fontSize: 13, color: Zinc[500] },
  kept: { fontSize: 13, color: Amber[800] },
});
