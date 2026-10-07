import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { ConfirmDeleteSheet, ConfirmSheet } from '@/components/ItemSheets';
import { SearchField } from '@/components/SearchField';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { InvoiceCard } from '@/features/purchase/InvoiceCard';
import { InvoiceSheet } from '@/features/purchase/InvoiceSheet';
import { PurchaseShell } from '@/features/purchase/PurchaseShell';
import { voucherTable } from '@/features/purchase/voucher';
import { useCan } from '@/hooks/useCan';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { smsBusiness } from '@/lib/smsTexts';
import { formatNumber } from '@/lib/money';
import { inRange, LIST_PERIODS, listRange, type ListPeriod } from '@/lib/periods';
import { printTable, shareTablePdf } from '@/lib/print';
import { invoiceMetrics, receivedOf } from '@/lib/purchaseOrder';
import { matches } from '@/lib/search';
import { useBusinessSettings } from '@/services/business.services';
import { deletePurchase, receiveWholePurchase, usePurchaseWrite } from '@/services/purchase.services';
import { supplierLabel, useSupplierData } from '@/services/supplier.services';

type Row = Record<string, any>;

const ALL = '__all';
// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/** Every purchase invoice - Hatim's Purchase Ledger: search, filter, the voucher, receive, print, delete. */
export default function PurchaseLedgerScreen() {
  const t = useCopy(PURCHASE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = usePurchaseWrite();
  const business = useBusinessSettings();
  const { data } = useSupplierData();
  const [search, setSearch] = useState('');
  const [supplier, setSupplier] = useState(ALL);
  const [period, setPeriod] = useState<ListPeriod>('all');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Row | null>(null);
  const [sheet, setSheet] = useState<'invoice' | 'receive' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);

  const nameOf = (p: Row) => supplierLabel(data?.suppliers.find((s) => s.id === p.supplier_id)) || String(p.supplier_name || '');
  const range = listRange(period);
  const rows = (data?.purchases ?? []).filter(
    (p) => inRange(p.date, range) && (supplier === ALL || p.supplier_id === supplier) && matches(search, p.si_no, nameOf(p)),
  );
  const total = rows.reduce((sum, p) => sum + invoiceMetrics(p).grandTotal, 0);
  const selectedDue = (selected?.purchase_items ?? []).reduce((s: number, item: Row) => s + Math.max(0, Number(item.qty || 0) - receivedOf(item)), 0);

  const open = (purchase: Row) => {
    setSelected(purchase);
    setSheet('invoice');
  };

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await write(work);
      toast.show(done);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setBusy(false);
      setSheet(null);
    }
  };

  const output = async (share: boolean) => {
    if (!selected) return;
    const table = voucherTable({ purchase: selected, supplier: nameOf(selected), business: smsBusiness(business.data).businessName, t, lang, money });
    try {
      if (share) await shareTablePdf(table, t.voucherTitle(String(selected.si_no || '')));
      else await printTable(table);
    } catch (e) {
      toast.show(errorMessage(e));
    }
  };

  return (
    <PurchaseShell section="ledger" fab={can('purchase.create') ? { label: t.newOrder, onPress: () => router.push('/more/purchase/new') } : null}>
      <FigureCard dark label={t.totalShown} value={money(total)} caption={t.countInvoices(rows.length, formatNumber(rows.length, lang))} />
      <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.searchInvoices} label={t.searchLabel} />
      <SelectPill
        shape="pill"
        label={t.filterSupplier}
        value={supplier}
        active={supplier !== ALL}
        onChange={(s) => {
          setSupplier(s);
          setLimit(PAGE);
        }}
        closeLabel={t.close}
        options={[{ key: ALL, label: t.allSuppliers }, ...(data?.suppliers ?? []).map((s) => ({ key: s.id, label: supplierLabel(s) }))]}
      />
      <FilterChips
        label={t.periodLabel}
        selected={period}
        onSelect={(p) => {
          setPeriod(p);
          setLimit(PAGE);
        }}
        options={LIST_PERIODS.map((key) => ({ key, label: t.periods[key] }))}
      />

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noInvoices}</Txt>
        </View>
      ) : (
        rows.slice(0, limit).map((p) => <InvoiceCard key={p.id} purchase={p} supplier={nameOf(p)} onPress={open} />)
      )}
      {rows.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}

      <InvoiceSheet
        purchase={sheet === 'invoice' ? selected : null}
        supplier={selected ? nameOf(selected) : ''}
        onClose={() => setSheet(null)}
        onReceiveAll={can('purchase.receive') ? () => setSheet('receive') : undefined}
        onShare={() => output(true)}
        onPrint={() => output(false)}
        onDelete={can('purchase.delete') ? () => setSheet('delete') : undefined}
      />
      <ConfirmSheet
        open={sheet === 'receive'}
        onClose={() => setSheet(null)}
        title={t.receiveAllTitle}
        text={t.receiveAllText(formatNumber(selectedDue, lang))}
        cancelLabel={t.cancel}
        confirmLabel={t.receiveAllConfirm}
        closeLabel={t.close}
        busy={busy}
        icon="download"
        tone="primary"
        onConfirm={() =>
          selected && run(() => receiveWholePurchase(selected.id, { receive_date: todayISO(), receiver_name: '', notes: '' }), t.receivedAll)
        }
      />
      <ConfirmDeleteSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={selected ? t.deleteTitle(String(selected.si_no || '')) : ''}
        text={t.deleteText}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={busy}
        onConfirm={() => selected && run(() => deletePurchase(selected.id), t.deleted)}
      />
    </PurchaseShell>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
