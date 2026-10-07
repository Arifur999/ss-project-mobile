import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FiguresCard } from '@/components/FiguresCard';
import { FilterChips } from '@/components/FilterChips';
import { SearchField } from '@/components/SearchField';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { SALES_COPY } from '@/features/sales/copy';
import { SalesShell } from '@/features/sales/SalesShell';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import { SALE_PERIODS, type SalePeriod } from '@/lib/periods';
import { ITEM_SORTS, itemRows, soldItems, type ItemSort } from '@/lib/salesLists';
import { useCustomerData } from '@/services/customers.services';

// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/** Every product line sold - Hatim's Sales History: by product, code, invoice or customer, by date, five orders. */
export default function ItemsSoldScreen() {
  const t = useCopy(SALES_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const { data } = useCustomerData();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<SalePeriod>('all');
  const [sort, setSort] = useState<ItemSort>('date_desc');
  const [limit, setLimit] = useState(PAGE);

  const num = (n: unknown) => formatNumber(n, lang);
  const rows = itemRows(soldItems(data?.sales ?? []), { search, period, sort });
  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.total_amount, 0);
  const reset = () => setLimit(PAGE);

  return (
    <SalesShell section="items">
      <FigureCard
        dark
        label={t.itemsTotal}
        value={money(totalAmount)}
        caption={`${t.countItems(rows.length, num(rows.length))} · ${t.colQty} ${num(totalQty)}`}
      />
      <SearchField
        height={50}
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          reset();
        }}
        placeholder={t.searchItems}
        label={t.searchLabel}
      />
      <View style={styles.controls}>
        <View style={styles.grow}>
          <FilterChips
            label={t.periodLabel}
            selected={period}
            onSelect={(p) => {
              setPeriod(p);
              reset();
            }}
            options={SALE_PERIODS.map((key) => ({ key, label: t.periods[key] }))}
          />
        </View>
        <SelectPill
          shape="pill"
          label={t.sortLabel}
          value={sort}
          active={sort !== 'date_desc'}
          onChange={setSort}
          closeLabel={t.close}
          options={ITEM_SORTS.map((key) => ({ key, label: t.sorts[key] }))}
        />
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noItems}</Txt>
        </View>
      ) : (
        rows.slice(0, limit).map((row) => (
          <FiguresCard
            key={row.id}
            title={row.product_name}
            meta={[row.product_code, row.invoice_no, dateLabel(row.date, lang)].filter(Boolean).join(' · ')}
            sub={[row.customer_name, row.customer_phone].filter(Boolean).join(' · ')}
            figures={[
              { label: t.colQty, value: num(row.qty) },
              { label: t.colUnitPrice, value: money(row.actual_price) },
              { label: t.colTotal, value: money(row.total_amount), strong: true },
            ]}
          />
        ))
      )}
      {rows.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}
    </SalesShell>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
