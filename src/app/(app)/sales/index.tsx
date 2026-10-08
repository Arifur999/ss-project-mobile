import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { ConfirmDeleteSheet } from '@/components/ItemSheets';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SALES_COPY } from '@/features/sales/copy';
import { DeliverySheet, type SaleLine } from '@/features/sales/DeliverySheet';
import { invoiceTable } from '@/features/sales/invoicePrint';
import { SaleCard } from '@/features/sales/SaleCard';
import { saleEditable } from '@/features/sales/saleForm';
import { SalesShell } from '@/features/sales/SalesShell';
import { SaleSheet } from '@/features/sales/SaleSheet';
import { useCan } from '@/hooks/useCan';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { SALE_PERIODS, type SalePeriod } from '@/lib/periods';
import { printTable, shareTablePdf } from '@/lib/print';
import { latestSalesFirst, previousDueForSale, saleAccountDisplay, saleSubtotalAfterDiscount } from '@/lib/saleFigures';
import { DELIVERY_FILTERS, ledgerSales, type DeliveryFilter } from '@/lib/salesLists';
import { smsBusiness } from '@/lib/smsTexts';
import { useBusinessSettings } from '@/services/business.services';
import { useCustomerData } from '@/services/customers.services';
import { deleteSale, useSaleWrite } from '@/services/sales.services';

type Row = Record<string, any>;

// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/** Every sale - Hatim's Sales Ledger: search, date and delivery filters, the invoice, deliveries, edit, print, delete. */
export default function SalesLedgerScreen() {
  const t = useCopy(SALES_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useSaleWrite();
  const business = useBusinessSettings();
  const { data } = useCustomerData();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<SalePeriod>('all');
  const [delivery, setDelivery] = useState<DeliveryFilter>('all');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Row | null>(null);
  const [sheet, setSheet] = useState<'sale' | 'delete' | null>(null);
  const [delivering, setDelivering] = useState<SaleLine | null>(null);
  const [busy, setBusy] = useState(false);

  const accounts = data?.accounts ?? [];
  const sales = latestSalesFirst(data?.sales ?? []);
  const rows = ledgerSales(sales, accounts, { search, delivery, period });
  // Over every sale the filters keep, not the slice drawn.
  const total = rows.reduce((sum, sale) => sum + saleSubtotalAfterDiscount(sale), 0);
  const previousDue = selected && data ? previousDueForSale(selected, data.sales, data.customers, data.payments) : 0;
  const paidInto = selected ? saleAccountDisplay(selected, accounts) : '';
  const editable = !!selected && saleEditable(selected);

  const reset = () => setLimit(PAGE);

  const output = async (share: boolean) => {
    if (!selected) return;
    const table = invoiceTable({ sale: selected, previousDue, paidInto, business: smsBusiness(business.data).businessName, t, lang, money });
    try {
      if (share) await shareTablePdf(table, t.invoiceTitle(String(selected.invoice_no || '')));
      else await printTable(table);
    } catch (e) {
      toast.show(errorMessage(e));
    }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await write(() => deleteSale(String(selected.id)));
      toast.show(t.deleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setBusy(false);
      setSheet(null);
    }
  };

  return (
    <SalesShell section="invoices" fab={can('sale.create') ? { label: t.newSale, onPress: () => router.push('/sales/new') } : null}>
      <FigureCard dark label={t.totalShown} value={money(total)} caption={t.countInvoices(rows.length, formatNumber(rows.length, lang))} />
      <SearchField
        height={50}
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          reset();
        }}
        placeholder={t.searchInvoices}
        label={t.searchLabel}
      />
      <FilterChips
        label={t.periodLabel}
        selected={period}
        onSelect={(p) => {
          setPeriod(p);
          reset();
        }}
        options={SALE_PERIODS.map((key) => ({ key, label: t.periods[key] }))}
      />
      <FilterChips
        label={t.deliveryLabel}
        selected={delivery}
        onSelect={(d) => {
          setDelivery(d);
          reset();
        }}
        options={DELIVERY_FILTERS.map((key) => ({ key, label: key === 'all' ? t.allDeliveries : t.deliveryStates[key] }))}
      />

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noInvoices}</Txt>
        </View>
      ) : (
        rows.slice(0, limit).map((sale) => (
          <SaleCard
            key={String(sale.id)}
            sale={sale}
            onPress={(s) => {
              setSelected(s);
              setSheet('sale');
            }}
          />
        ))
      )}
      {rows.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}

      <SaleSheet
        sale={sheet === 'sale' ? selected : null}
        previousDue={previousDue}
        paidInto={paidInto}
        onClose={() => setSheet(null)}
        onDeliver={
          can('sale.deliver')
            ? (item) => {
                setSheet(null);
                if (selected) setDelivering({ sale: selected, item });
              }
            : undefined
        }
        onEdit={
          can('sale.edit') && editable && selected
            ? () => {
                setSheet(null);
                router.push({ pathname: '/sales/edit/[id]', params: { id: String(selected.id) } });
              }
            : undefined
        }
        editNote={can('sale.edit') && selected && !editable ? t.editBlocked : undefined}
        onShare={() => output(true)}
        onPrint={() => output(false)}
        onDelete={can('sale.delete') ? () => setSheet('delete') : undefined}
      />
      <DeliverySheet line={delivering} onClose={() => setDelivering(null)} />
      <ConfirmDeleteSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={selected ? t.deleteTitle(String(selected.invoice_no || '')) : ''}
        text={t.deleteText}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={busy}
        onConfirm={confirmDelete}
      />
    </SalesShell>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
