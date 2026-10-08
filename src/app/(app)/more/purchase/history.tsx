import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FiguresCard } from '@/components/FiguresCard';
import { FilterChips } from '@/components/FilterChips';
import { SearchField } from '@/components/SearchField';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Green, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { PurchaseShell } from '@/features/purchase/PurchaseShell';
import { RECEIVE_LOOK } from '@/features/purchase/status';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import { LIST_PERIODS, type ListPeriod } from '@/lib/periods';
import { BOUGHT_SORTS, boughtCompanies, boughtItems, boughtRows, boughtState, type BoughtSort } from '@/lib/purchaseHistory';
import { useSupplierData } from '@/services/supplier.services';

const ALL = '__all';
// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/**
 * Every product bought, line by line - Hatim's Product History (Purchase
 * History): by product, code or supplier, by company and date, five orders;
 * what each line cost and is owed, and how much of it has arrived, with the
 * pieces, pieces in and money of everything the filters keep.
 */
export default function PurchaseHistoryScreen() {
  const t = useCopy(PURCHASE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const { data } = useSupplierData();
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState(ALL);
  const [period, setPeriod] = useState<ListPeriod>('all');
  const [sort, setSort] = useState<BoughtSort>('date_desc');
  const [limit, setLimit] = useState(PAGE);

  const num = (n: unknown) => formatNumber(n, lang);
  const items = boughtItems(data?.purchases ?? []);
  const rows = boughtRows(items, { search, company: company === ALL ? '' : company, period, sort });
  // Over every row the filters keep, not the slice drawn.
  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
  const totalReceived = rows.reduce((sum, row) => sum + row.received_qty, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.total_amount, 0);
  const reset = () => setLimit(PAGE);

  return (
    <PurchaseShell section="history">
      <Txt style={styles.intro}>{t.historyIntro}</Txt>
      <FigureCard dark label={t.totalBill} value={money(totalAmount)} caption={t.countLines(rows.length, num(rows.length))} />
      <View style={styles.row}>
        <FigureCard label={t.colQty} value={num(totalQty)} />
        <FigureCard label={t.receivedLabel} value={num(totalReceived)} valueColor={Green[700]} />
      </View>

      <SearchField
        height={50}
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          reset();
        }}
        placeholder={t.searchHistory}
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
      <View style={styles.row}>
        <SelectPill
          shape="pill"
          label={t.companyLabel}
          value={company}
          active={company !== ALL}
          onChange={(c) => {
            setCompany(c);
            reset();
          }}
          options={[{ key: ALL, label: t.allCompanies }, ...boughtCompanies(items).map((name) => ({ key: name, label: name }))]}
          closeLabel={t.close}
          style={styles.grow}
        />
        <SelectPill
          shape="pill"
          label={t.sortLabel}
          value={sort}
          active={sort !== 'date_desc'}
          onChange={setSort}
          options={BOUGHT_SORTS.map((key) => ({ key, label: t.historySorts[key] }))}
          closeLabel={t.close}
          style={styles.grow}
        />
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noHistory}</Txt>
        </View>
      ) : (
        rows.slice(0, limit).map((row) => {
          const state = boughtState(row);
          return (
            <FiguresCard
              key={row.id}
              title={row.product_name}
              meta={[row.product_code, dateLabel(row.date.slice(0, 10), lang), t.lineMeta(money(row.dp_price), num(row.discount_pct), money(row.sp_amount))].filter(Boolean).join(' · ')}
              sub={`${row.supplier_name} · ${t.receivedOf(num(row.received_qty), num(row.qty))}`}
              badge={{ label: t.statuses[state], ...RECEIVE_LOOK[state] }}
              figures={[
                { label: t.actualDp, value: money(row.actual_dp) },
                { label: t.colQty, value: num(row.qty) },
                { label: t.colTotal, value: money(row.total_amount) },
                { label: t.colDeposit, value: money(row.deposit_amount), strong: true },
              ]}
            />
          );
        })
      )}
      {rows.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}
    </PurchaseShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: Zinc[600] },
  row: { flexDirection: 'row', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
