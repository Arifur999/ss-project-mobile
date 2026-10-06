import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Blue, Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { LoanShell } from '@/features/loans/LoanShell';
import { LoanTxnFormSheet } from '@/features/loans/LoanTxnFormSheet';
import { LoanTxnRow } from '@/features/loans/LoanTxnRow';
import { useLoanReceipt } from '@/features/loans/useLoanReceipt';
import { dateLabel, monthName } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { balanceAfterRow } from '@/lib/loanBalances';
import { lenderKey, lenderKeyFromLoan, loanDisplayName, transactionAmounts } from '@/lib/loans';
import { deleteLoan, useLoanData, useLoanWrite } from '@/services/loans.services';
import { smsFailureMessage } from '@/services/sms.services';

type Row = Record<string, any>;

const ALL = '__all';
// Drawn a slice at a time, as the website's useProgressiveRows does; the
// totals above always cover every matching row.
const PAGE = 40;

/** Every loan transaction, newest first, grouped by day - Hatim's LoanTransactions. */
export default function LoanTransactionsScreen() {
  const t = useCopy(LOAN_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useLoanWrite();
  const receipt = useLoanReceipt();
  const { data } = useLoanData();
  const loans = useMemo(() => data?.loans ?? [], [data?.loans]);

  const [person, setPerson] = useState(ALL);
  const [month, setMonth] = useState(ALL);
  const [limit, setLimit] = useState(PAGE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'confirm' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return `${monthName(m, lang)} ${lang === 'bn' ? bnDigits(y) : y}`;
  };

  const people = useMemo(() => [...new Set(loans.map((r) => loanDisplayName(r)).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [loans]);
  const months = useMemo(() => [...new Set(loans.map((r) => String(r.date || '').slice(0, 7)).filter(Boolean))].sort().reverse(), [loans]);

  const filtered = useMemo(
    () =>
      loans.filter(
        (r) => (person === ALL || loanDisplayName(r) === person) && (month === ALL || String(r.date || '').slice(0, 7) === month),
      ),
    [loans, person, month],
  );
  const received = filtered.reduce((s, r) => s + transactionAmounts(r).received, 0);
  const paid = filtered.reduce((s, r) => s + transactionAmounts(r).paid, 0);
  const isFiltered = person !== ALL || month !== ALL;

  const groups: { day: string; rows: Row[] }[] = [];
  filtered.slice(0, limit).forEach((r) => {
    const day = String(r.date || '').slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(r);
    else groups.push({ day, rows: [r] });
  });

  const lenderOf = (record: Row) => (data?.lenders ?? []).find((l) => lenderKey(l) === lenderKeyFromLoan(record));

  const resend = async () => {
    if (!selected) return;
    setSheet(null);
    const amounts = transactionAmounts(selected);
    const lender = lenderOf(selected);
    try {
      const sent = await receipt(lender, amounts.received || amounts.paid, balanceAfterRow(data?.lenders ?? [], loans, selected));
      toast.show(sent ? t.receiptSent(loanDisplayName(selected)) : t.receiptNoPhone);
    } catch (e) {
      toast.show(smsFailureMessage(e));
    }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteLoan(selected.id));
      setSheet(null);
      toast.show(t.txnDeleted);
    } catch (e) {
      setSheet(null);
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  // What the actions and delete sheets say about the chosen row.
  const sel = (() => {
    if (!selected) return null;
    const amounts = transactionAmounts(selected);
    const isIn = amounts.type !== 'payment';
    const amount = money(amounts.received || amounts.paid);
    const name = loanDisplayName(selected);
    const date = dateLabel(selected.date, lang);
    const account = String(selected.account_name || '');
    const what = isIn ? t.receiptOf(amount, name, date) : t.paymentOf(amount, name, date);
    return {
      title: isIn ? t.receivedAmount(amount) : t.paidAmount(amount),
      summary: [name, amounts.isProfit ? t.profit : t.principal, account, date].filter(Boolean).join(' · '),
      note: amounts.isProfit
        ? isIn
          ? t.otherIncomeAs(selected.income_source_name || name)
          : t.expenseAs(selected.expense_category_name || t.notSet)
        : undefined,
      deleteText: what + (amounts.isProfit ? t.deleteProfitTail(account, isIn) : t.deletePrincipalTail(name, account)),
    };
  })();

  return (
    <LoanShell
      section="transactions"
      gap={14}
      fab={{
        label: t.newTransaction,
        onPress: () => {
          setEditing(null);
          setFormOpen(true);
        },
      }}>
      <View style={styles.totals}>
        <Txt accessibilityRole="header" style={styles.scope}>
          {`${person === ALL ? t.allPeople : person} · ${month === ALL ? t.allTime : monthLabel(month)}`}
        </Txt>
        <View style={styles.pair}>
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <DesignIcon name="arrowDownLeft" size={14} color={Zinc[600]} strokeWidth={2.4} />
              <Txt style={styles.tileLabel}>{t.received}</Txt>
            </View>
            <Txt style={[styles.tileValue, { color: Green[700] }]} numberOfLines={1} adjustsFontSizeToFit>
              {money(received)}
            </Txt>
            <Txt style={styles.tileCaption}>{t.moneyCameIn}</Txt>
          </View>
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <DesignIcon name="arrowUpRight" size={14} color={Zinc[600]} strokeWidth={2.4} />
              <Txt style={styles.tileLabel}>{t.paid}</Txt>
            </View>
            <Txt style={[styles.tileValue, { color: Red[600] }]} numberOfLines={1} adjustsFontSizeToFit>
              {money(paid)}
            </Txt>
            <Txt style={styles.tileCaption}>{t.moneyWentOut}</Txt>
          </View>
        </View>
      </View>

      <View accessibilityLabel={t.filtersLabel} style={styles.filters}>
        <SelectPill
          shape="pill"
          label={t.filterPerson}
          value={person}
          active={person !== ALL}
          onChange={(p) => {
            setPerson(p);
            setLimit(PAGE);
          }}
          closeLabel={t.close}
          options={[{ key: ALL, label: t.allPeople }, ...people.map((p) => ({ key: p, label: p }))]}
          style={styles.personFilter}
        />
        <SelectPill
          shape="pill"
          label={t.filterMonth}
          value={month}
          active={month !== ALL}
          onChange={(m) => {
            setMonth(m);
            setLimit(PAGE);
          }}
          closeLabel={t.close}
          options={[{ key: ALL, label: t.allMonths }, ...months.map((m) => ({ key: m, label: monthLabel(m) }))]}
          style={styles.monthFilter}
        />
      </View>

      <View style={styles.countRow}>
        <Txt style={styles.count}>{t.countTxns(filtered.length)}</Txt>
        {isFiltered ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPerson(ALL);
              setMonth(ALL);
              setLimit(PAGE);
            }}
            style={styles.clear}>
            <Txt style={styles.clearText}>{t.clearFilters}</Txt>
          </Pressable>
        ) : null}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{isFiltered ? t.emptyFiltered : t.emptyAll}</Txt>
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.day} style={styles.group}>
          <Txt accessibilityRole="header" style={styles.groupLabel}>
            {dateLabel(group.day, lang)}
          </Txt>
          <View style={styles.groupList}>
            {group.rows.map((record, i) => (
              <LoanTxnRow
                key={record.id}
                record={record}
                first={i === 0}
                onMenu={() => {
                  setSelected(record);
                  setSheet('actions');
                }}
              />
            ))}
          </View>
        </View>
      ))}

      {filtered.length > limit ? (
        <Button title={t.loadOlder} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} style={styles.older} />
      ) : null}

      <LoanTxnFormSheet open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={sel?.title ?? ''}
        subtitle={sel?.summary ?? ''}
        note={sel?.note}
        editLabel={t.editTxn}
        deleteLabel={t.deleteTxn}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        extra={[{ label: t.sendReceipt, icon: 'message', onPress: resend }]}
        onEdit={() => {
          setSheet(null);
          setEditing(selected);
          setFormOpen(true);
        }}
        onDelete={() => setSheet('confirm')}
      />

      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={t.deleteTxnTitle}
        text={sel?.deleteText ?? ''}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </LoanShell>
  );
}

const styles = StyleSheet.create({
  totals: { gap: 8 },
  scope: { fontSize: 13, fontWeight: '500', color: Zinc[500] },
  pair: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Zinc[100],
    borderWidth: 1,
    borderColor: Zinc[200],
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLabel: { fontSize: 13, fontWeight: '500', color: Zinc[600] },
  tileValue: { fontSize: 19, fontWeight: '600' },
  tileCaption: { fontSize: 12, color: Zinc[500] },
  filters: { flexDirection: 'row', gap: 8 },
  personFilter: { flex: 1.15, minWidth: 0 },
  monthFilter: { flex: 1, minWidth: 0 },
  countRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  count: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  clear: { height: 36, paddingHorizontal: 4, justifyContent: 'center' },
  clearText: { fontSize: 14, fontWeight: '600', color: Blue[700] },
  empty: { paddingVertical: 32, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  group: { gap: 8 },
  groupLabel: { fontSize: 13, fontWeight: '600', color: Zinc[500] },
  groupList: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  older: { height: 48 },
});
