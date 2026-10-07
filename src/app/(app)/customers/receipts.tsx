import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { ConfirmDeleteSheet } from '@/components/ItemSheets';
import { MoneyLine } from '@/components/MoneyLine';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { CustomersShell } from '@/features/customers/CustomersShell';
import { ReceiptSheet } from '@/features/customers/ReceiptSheet';
import { receiptTable } from '@/features/customers/receiptPrint';
import { useCan } from '@/hooks/useCan';
import { groupReceipts, receiptNo, type Receipt } from '@/lib/customerReceipts';
import { dateLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { inRange, LIST_PERIODS, listRange, type ListPeriod } from '@/lib/periods';
import { printTable, shareTablePdf } from '@/lib/print';
import { matches } from '@/lib/search';
import { smsBusiness } from '@/lib/smsTexts';
import { useBusinessSettings } from '@/services/business.services';
import { deleteCustomerPayment, useCustomerData, useCustomerWrite } from '@/services/customers.services';

// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/** Every due collection - Hatim's Due Received list: search, period, the receipt, print, delete. */
export default function DueReceivedScreen() {
  const t = useCopy(CUSTOMER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useCustomerWrite();
  const business = useBusinessSettings();
  const { data } = useCustomerData();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<ListPeriod>('all');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [sheet, setSheet] = useState<'receipt' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const range = listRange(period);
  // Searched across everything someone might arrive knowing, as the website's list is.
  const receipts = groupReceipts(data?.payments ?? [], data?.customers ?? [], data?.sales ?? []).filter(
    (r) =>
      inRange(r.date, range) &&
      matches(
        search,
        r.customer_name,
        r.customer_phone,
        r.payment_receiver,
        r.discount_category,
        r.invoice_no,
        r.display_notes,
        r.payment_methods.map((m) => m.account_name).join(' '),
        Number(r.total_received || 0).toLocaleString('en-US'),
        r.date,
        receiptNo(r),
      ),
  );
  const total = receipts.reduce((sum, r) => sum + Number(r.total_received || 0), 0);

  const output = async (share: boolean) => {
    if (!selected) return;
    const table = receiptTable({ receipt: selected, business: smsBusiness(business.data).businessName, t, lang, money });
    try {
      if (share) await shareTablePdf(table, `${t.receiptTitle} ${receiptNo(selected)}`);
      else await printTable(table);
    } catch (e) {
      toast.show(errorMessage(e));
    }
  };

  // Every part of a split collection goes, one request each, as the website deletes them.
  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(async () => {
        for (const id of selected.payment_ids) await deleteCustomerPayment(id);
      });
      toast.show(t.receiptDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  const reset = () => setLimit(PAGE);

  return (
    <CustomersShell
      section="receipts"
      fab={can('customerPayment.create') ? { label: t.receiveDue, onPress: () => router.push('/customers/receive') } : null}>
      <FigureCard dark label={t.totalReceived} value={money(total)} caption={t.countReceipts(receipts.length, formatNumber(receipts.length, lang))} />
      <SearchField
        height={50}
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          reset();
        }}
        placeholder={t.searchReceipts}
        label={t.searchLabel}
      />
      <FilterChips
        label={t.periodLabel}
        selected={period}
        onSelect={(p) => {
          setPeriod(p);
          reset();
        }}
        options={LIST_PERIODS.map((key) => ({ key, label: t.periods[key] }))}
      />

      {receipts.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noReceipts}</Txt>
        </View>
      ) : (
        <View style={styles.list}>
          {receipts.slice(0, limit).map((r, i) => (
            <MoneyLine
              key={r.payment_ids[0]}
              direction="in"
              title={r.customer_name || ''}
              meta={[dateLabel(String(r.date || ''), lang), r.payment_methods.map((m) => m.account_name).join(' + '), r.payment_receiver].filter(Boolean).join(' · ')}
              note={r.display_notes}
              amount={money(r.total_received)}
              first={i === 0}
              label={`${r.customer_name}, ${money(r.total_received)}`}
              onPress={() => {
                setSelected(r);
                setSheet('receipt');
              }}
            />
          ))}
        </View>
      )}
      {receipts.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}

      <ReceiptSheet
        receipt={sheet === 'receipt' ? selected : null}
        onClose={() => setSheet(null)}
        onShare={() => output(true)}
        onPrint={() => output(false)}
        onDelete={can('customerPayment.delete') ? () => setSheet('delete') : undefined}
      />
      <ConfirmDeleteSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={t.deleteReceiptTitle}
        text={selected ? t.deleteReceiptText(money(selected.total_received)) : ''}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </CustomersShell>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
