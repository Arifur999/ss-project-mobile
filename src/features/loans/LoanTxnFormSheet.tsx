import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChoiceCard, PICKED_IN, PICKED_OUT } from '@/components/ChoiceCard';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { SelectField } from '@/components/SelectField';
import { InlineSwitch } from '@/components/SwitchRow';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Amber, Red, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { useLoanReceipt } from '@/features/loans/useLoanReceipt';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { balanceBefore } from '@/lib/loanBalances';
import { expenseCategoryFields, incomeSourceFields, needsExpenseCategory, needsIncomeSource, transactionAmounts } from '@/lib/loans';
import { parseAmount } from '@/lib/money';
import { createLoan, updateLoan, useLoanData, useLoanWrite, type LoanInput } from '@/services/loans.services';
import { smsFailureMessage } from '@/services/sms.services';

type Row = Record<string, any>;
type TxnType = 'receive' | 'payment' | '';
type Category = 'principal' | 'profit';
type Form = {
  lender_id: string;
  sms: boolean;
  payment_category: Category;
  transaction_type: TxnType;
  expense_category_id: string;
  income_source_name: string;
  amount: string;
  date: string;
  account_id: string;
  notes: string;
};

function formFor(record: Row | null, lenders: Row[]): Form {
  if (!record) {
    return {
      lender_id: '',
      sms: true,
      payment_category: 'principal',
      transaction_type: '',
      expense_category_id: '',
      income_source_name: '',
      amount: '',
      date: todayISO(),
      account_id: '',
      notes: '',
    };
  }
  const amounts = transactionAmounts(record);
  return {
    lender_id: record.lender_id || lenders.find((l) => l.name === record.lender_name)?.id || '',
    // A correction is bookkeeping; texting it again is a choice, not the default.
    sms: false,
    // Carried through, never defaulted: saving a profit row as principal would
    // move a balance that should not move.
    payment_category: record.payment_category === 'profit' ? 'profit' : 'principal',
    transaction_type: amounts.type === 'payment' ? 'payment' : 'receive',
    expense_category_id: record.expense_category_id || '',
    income_source_name: record.income_source_name || '',
    amount: String(amounts.received || amounts.paid || ''),
    date: String(record.date || '').slice(0, 10) || todayISO(),
    account_id: record.account_id || '',
    notes: record.notes || '',
  };
}

/** New or edited loan transaction - Hatim's LoanTransactions form, to the design. */
export function LoanTxnFormSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Row | null }) {
  const t = useCopy(LOAN_COPY);
  const toast = useToast();
  const write = useLoanWrite();
  const receipt = useLoanReceipt();
  const { data } = useLoanData();
  const lenders = data?.lenders ?? [];
  const accounts = data?.accounts ?? [];
  const categories = data?.categories ?? [];

  const [form, setForm] = useState<Form>(() => formFor(null, []));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? editing?.id ?? 'new' : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setForm(formFor(editing, lenders));
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const lender = lenders.find((l) => l.id === form.lender_id) ?? null;
  const amount = parseAmount(form.amount);
  const expense = needsExpenseCategory(form);
  const income = needsIncomeSource(form);

  // Active ones to choose from, as the website offers - plus the one already on the row.
  const lenderOptions = lenders
    .filter((l) => l.is_active !== false || l.id === form.lender_id)
    .map((l) => ({ key: l.id, label: l.name }));

  const errors: Partial<Record<'person' | 'type' | 'expense' | 'amount' | 'account', string>> = {};
  if (!form.lender_id) errors.person = t.errPerson;
  if (!form.transaction_type) errors.type = t.errType;
  if (expense && !form.expense_category_id) errors.expense = t.errExpense;
  if (!(amount > 0)) errors.amount = t.errAmount;
  if (!form.account_id) errors.account = t.errAccount;
  const shown = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || !lender || !form.transaction_type) return;
    const account = accounts.find((a) => a.id === form.account_id);
    const type = form.transaction_type;
    const input: LoanInput = {
      date: form.date,
      lender_id: lender.id,
      lender_name: lender.name,
      loan_type: String(lender.lender_type || '').toLowerCase().includes('bank') ? 'bank' : 'personal',
      transaction_type: type,
      payment_category: form.payment_category,
      ...expenseCategoryFields(form, categories),
      ...incomeSourceFields(form),
      received_amount: type === 'receive' ? amount : 0,
      payment_amount: type === 'payment' ? amount : 0,
      interest_amount: 0,
      account_id: form.account_id,
      account_name: account?.name || '',
      notes: form.notes.trim(),
    };
    // The receipt's balance: where they stood, moved by this row - by nothing
    // for profit, the same rule the server applies.
    const before = balanceBefore(lenders, data?.loans ?? [], lender.id, editing?.id ?? null);
    const effect = form.payment_category === 'profit' ? 0 : type === 'payment' ? amount : -amount;

    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updateLoan(editing.id, input) : createLoan(input)));
      const saved = editing ? t.txnUpdated : t.txnSaved;
      if (form.sms && before !== null) {
        // After the save: the transaction is on the books whatever the gateway says.
        try {
          const sent = await receipt(lender, amount, before + effect);
          toast.show(sent ? (editing ? t.txnUpdatedSms(lender.name) : t.txnSavedSms(lender.name)) : t.receiptNoPhone);
        } catch (e) {
          toast.show(smsFailureMessage(e, saved));
        }
      } else {
        toast.show(saved);
      }
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
        {editing ? t.formEdit : t.formNew}
      </Txt>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Txt style={styles.label}>{t.personField}</Txt>
          <InlineSwitch label={t.smsReceipt} value={form.sms} onChange={(sms) => set({ sms })} />
        </View>
        <SelectField
          placeholder={t.select}
          sheetTitle={t.personField}
          closeLabel={t.close}
          value={form.lender_id}
          options={lenderOptions}
          onChange={(lender_id) => set({ lender_id })}
          error={shown.person}
        />
      </View>

      <View style={styles.group}>
        <Txt style={styles.label}>{t.category}</Txt>
        <View accessibilityRole="radiogroup" accessibilityLabel={t.category} style={styles.pair8}>
          <ChoiceCard
            icon="banknote"
            title={t.principal}
            sub={t.movesBalance}
            selected={form.payment_category === 'principal'}
            onPress={() => set({ payment_category: 'principal' })}
          />
          <ChoiceCard
            icon="percent"
            title={t.profit}
            sub={t.balanceUnchanged}
            selected={form.payment_category === 'profit'}
            onPress={() => set({ payment_category: 'profit' })}
          />
        </View>
      </View>

      <View style={styles.group}>
        <Txt style={[styles.label, shown.type ? styles.labelError : null]}>{t.type}</Txt>
        <View accessibilityRole="radiogroup" accessibilityLabel={t.type} style={styles.pair8}>
          <ChoiceCard
            icon="arrowDownLeft"
            title={t.received}
            sub={t.moneyCameIn}
            picked={PICKED_IN}
            invalid={!!shown.type}
            selected={form.transaction_type === 'receive'}
            onPress={() => set({ transaction_type: 'receive' })}
          />
          <ChoiceCard
            icon="arrowUpRight"
            title={t.paid}
            sub={t.moneyWentOut}
            picked={PICKED_OUT}
            invalid={!!shown.type}
            selected={form.transaction_type === 'payment'}
            onPress={() => set({ transaction_type: 'payment' })}
          />
        </View>
        {shown.type ? <FieldError plain>{shown.type}</FieldError> : null}
      </View>

      {expense ? (
        <View style={styles.amberBox}>
          <SelectField
            label={t.expenseCategory}
            placeholder={t.select}
            closeLabel={t.close}
            value={form.expense_category_id}
            options={categories.map((c) => ({ key: c.id, label: c.name }))}
            onChange={(expense_category_id) => set({ expense_category_id })}
            error={shown.expense}
          />
          <Txt style={styles.amberHelp}>{t.expenseHelp}</Txt>
        </View>
      ) : null}

      {income ? (
        <View style={styles.amberBox}>
          <TextField
            tone="zinc"
            label={t.incomeSource}
            placeholder={lender?.name || t.incomePlaceholder}
            value={form.income_source_name}
            onChangeText={(income_source_name) => set({ income_source_name })}
          />
          <Txt style={styles.amberHelp}>{t.incomeHelp}</Txt>
        </View>
      ) : null}

      <View style={styles.pair12}>
        <View style={styles.grow}>
          <TextField
            tone="zinc"
            label={t.amount}
            placeholder="0"
            value={form.amount}
            onChangeText={(a) => set({ amount: a })}
            error={shown.amount ? ' ' : undefined}
            plainError
            keyboardType="decimal-pad"
            inputStyle={styles.amountInput}
          />
        </View>
        <View style={styles.grow}>
          <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />
        </View>
      </View>
      {shown.amount ? (
        <View style={styles.amountError}>
          <FieldError plain>{shown.amount}</FieldError>
        </View>
      ) : null}

      <View style={styles.field}>
        <SelectField
          label={t.account}
          placeholder={t.select}
          closeLabel={t.close}
          value={form.account_id}
          options={accounts.map((a) => ({ key: a.id, label: a.name }))}
          onChange={(account_id) => set({ account_id })}
          error={shown.account}
        />
        {form.transaction_type ? (
          <Txt style={styles.hint}>{form.transaction_type === 'receive' ? t.intoAccount : t.fromAccount}</Txt>
        ) : null}
      </View>

      <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.notes} onChangeText={(notes) => set({ notes })} minHeight={64} />

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
  field: { gap: 6 },
  group: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  labelError: { color: Red[700] },
  pair8: { flexDirection: 'row', gap: 8 },
  pair12: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  amberBox: { gap: 6, padding: 12, borderRadius: 14, backgroundColor: Amber[50], borderWidth: 1, borderColor: Amber[200] },
  amberHelp: { fontSize: 13, color: Amber[900] },
  amountInput: { fontWeight: '600' },
  amountError: { marginTop: -6 },
  hint: { fontSize: 13, color: Zinc[500] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
