import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { MoneyLine } from '@/components/MoneyLine';
import { SearchField } from '@/components/SearchField';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import { IncomeSheet } from '@/features/supplier/IncomeSheet';
import { SupplierShell } from '@/features/supplier/SupplierShell';
import { useCan } from '@/hooks/useCan';
import { dateLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { inRange, LIST_PERIODS, listRange, type ListPeriod } from '@/lib/periods';
import { matches } from '@/lib/search';
import { deleteOtherIncome, useSupplierData, useSupplierWrite, type OtherIncome } from '@/services/supplier.services';

type KindFilter = 'all' | OtherIncome['income_type'];
// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/**
 * Income that is not a sale - Hatim's Others Income: commissions and
 * incentives from suppliers and anything else. Rows the loan ledger wrote are
 * listed too; the server refuses to change those here and says where to.
 */
export default function OtherIncomeScreen() {
  const t = useCopy(SUPPLIER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useSupplierWrite();
  const { data } = useSupplierData();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [period, setPeriod] = useState<ListPeriod>('all');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<OtherIncome | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'form' | 'confirm' | null>(null);
  const [editing, setEditing] = useState<OtherIncome | null>(null);
  const [deleting, setDeleting] = useState(false);

  const range = listRange(period);
  const titleOf = (row: OtherIncome) => (row.income_type === 'supplier' ? row.supplier_name : row.source_name) || t.incomeTypes[row.income_type].label;
  const rows = (data?.incomes ?? []).filter(
    (row) =>
      inRange(row.date, range) &&
      (kind === 'all' || row.income_type === kind) &&
      matches(search, row.supplier_name, row.source_name, row.account_name, row.notes),
  );
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const openForm = (row: OtherIncome | null) => {
    setEditing(row);
    setSheet('form');
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteOtherIncome(selected.id));
      toast.show(t.incomeDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  return (
    <SupplierShell section="income" fab={can('otherIncome.create') ? { label: t.newIncome, onPress: () => openForm(null) } : null}>
      <FigureCard dark label={t.totalIncome} value={money(total)} caption={t.countIncomes(rows.length, formatNumber(rows.length, lang))} />
      <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.sourcePlaceholder} label={t.searchLabel} />
      <SelectPill
        shape="pill"
        label={t.kindLabel}
        value={kind}
        active={kind !== 'all'}
        onChange={(k) => {
          setKind(k);
          setLimit(PAGE);
        }}
        closeLabel={t.close}
        options={[
          { key: 'all', label: t.allKinds },
          { key: 'supplier', label: t.incomeTypes.supplier.label },
          { key: 'other', label: t.incomeTypes.other.label },
        ]}
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
          <Txt style={styles.emptyText}>{t.noIncome}</Txt>
        </View>
      ) : (
        <View style={styles.list}>
          {rows.slice(0, limit).map((row, i) => (
            <MoneyLine
              key={row.id}
              direction="in"
              title={titleOf(row)}
              meta={[dateLabel(String(row.date || ''), lang), row.account_name || t.noAccount].join(' · ')}
              note={row.notes}
              amount={money(row.amount)}
              first={i === 0}
              label={`${titleOf(row)}, ${money(row.amount)}`}
              onPress={() => {
                setSelected(row);
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
        title={selected ? titleOf(selected) : ''}
        subtitle={selected ? `${money(selected.amount)} · ${dateLabel(String(selected.date || ''), lang)} · ${selected.account_name || t.noAccount}` : ''}
        cancelLabel={t.close}
        closeLabel={t.close}
        editLabel={t.editIncome}
        deleteLabel={t.deleteIncome}
        onEdit={can('otherIncome.update') ? () => openForm(selected) : undefined}
        onDelete={can('otherIncome.delete') ? () => setSheet('confirm') : undefined}
      />
      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={t.deleteIncomeTitle}
        text={selected?.account_name ? t.comesOut(money(selected.amount), selected.account_name) : ''}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
      <IncomeSheet open={sheet === 'form'} onClose={() => setSheet(null)} editing={editing} />
    </SupplierShell>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
});
