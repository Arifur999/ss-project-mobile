import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { MoneyLine } from '@/components/MoneyLine';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import { PaymentSheet } from '@/features/supplier/PaymentSheet';
import { SupplierShell } from '@/features/supplier/SupplierShell';
import { useCan } from '@/hooks/useCan';
import { dateLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { inRange, LIST_PERIODS, listRange, type ListPeriod } from '@/lib/periods';
import { deletePayment, supplierLabel, useSupplierData, useSupplierWrite, type SupplierPayment } from '@/services/supplier.services';

const ALL = '__all';
// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/** Money paid to suppliers - Hatim's Supplier Transactions: filter, add, edit, delete. */
export default function SupplierPaymentsScreen() {
  const t = useCopy(SUPPLIER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useSupplierWrite();
  const { data } = useSupplierData();
  const [supplier, setSupplier] = useState(ALL);
  const [period, setPeriod] = useState<ListPeriod>('all');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<SupplierPayment | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'form' | 'confirm' | null>(null);
  const [editing, setEditing] = useState<SupplierPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const nameOf = (id: string, fallback: string) => supplierLabel(data?.suppliers.find((s) => s.id === id)) || fallback;
  const range = listRange(period);
  const rows = (data?.payments ?? []).filter((p) => inRange(p.date, range) && (supplier === ALL || p.supplier_id === supplier));
  const total = rows.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const openForm = (payment: SupplierPayment | null) => {
    setEditing(payment);
    setSheet('form');
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deletePayment(selected.id));
      toast.show(t.paymentDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  return (
    <SupplierShell section="payments" fab={can('supplierPayment.write') ? { label: t.newPayment, onPress: () => openForm(null) } : null}>
      <FigureCard dark label={t.totalShown} value={money(total)} caption={t.countPayments(rows.length, formatNumber(rows.length, lang))} />
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
          <Txt style={styles.emptyText}>{t.noPayments}</Txt>
        </View>
      ) : (
        <View style={styles.list}>
          {rows.slice(0, limit).map((p, i) => (
            <MoneyLine
              key={p.id}
              direction="out"
              title={nameOf(p.supplier_id, p.supplier_name)}
              meta={[dateLabel(String(p.date || ''), lang), p.account_name, p.purchase_si_no ? t.purchaseRef(p.purchase_si_no) : ''].filter(Boolean).join(' · ')}
              note={p.notes}
              amount={money(p.amount)}
              first={i === 0}
              label={`${nameOf(p.supplier_id, p.supplier_name)}, ${money(p.amount)}`}
              onPress={() => {
                setSelected(p);
                setSheet('actions');
              }}
            />
          ))}
        </View>
      )}
      {rows.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected ? nameOf(selected.supplier_id, selected.supplier_name) : ''}
        subtitle={selected ? `${money(selected.amount)} · ${dateLabel(String(selected.date || ''), lang)} · ${selected.account_name}` : ''}
        cancelLabel={t.close}
        closeLabel={t.close}
        editLabel={t.editPayment}
        deleteLabel={t.deletePayment}
        onEdit={can('supplierPayment.write') ? () => openForm(selected) : undefined}
        onDelete={can('supplierPayment.delete') ? () => setSheet('confirm') : undefined}
      />
      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={t.deletePaymentTitle}
        text={selected ? t.goesBack(money(selected.amount), selected.account_name) : ''}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
      <PaymentSheet open={sheet === 'form'} onClose={() => setSheet(null)} editing={editing} />
    </SupplierShell>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
});
