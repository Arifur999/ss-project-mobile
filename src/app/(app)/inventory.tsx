import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { ListScreen } from '@/components/ListScreen';
import { HeaderIconButton } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { AdjustStockSheet } from '@/features/inventory/AdjustStockSheet';
import { INVENTORY_COPY } from '@/features/inventory/copy';
import { StockCard } from '@/features/inventory/StockCard';
import { StockDetailSheet } from '@/features/inventory/StockDetailSheet';
import { stockStatus } from '@/features/inventory/stockStatus';
import { useCan } from '@/hooks/useCan';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { printTable } from '@/lib/print';
import { getAllStock, useStock, type StockRow, type StockStatusFilter } from '@/services/inventory.services';
import { pagedRows } from '@/services/paged.services';

const STATUSES: StockStatusFilter[] = ['all', 'available', 'out_of_stock', 'upcoming'];

/** The Inventory tab - Hatim's Inventory page: every product's stock, its value, and the corrections. */
export default function InventoryTab() {
  const t = useCopy(INVENTORY_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();

  // Opened from a product's "View stock": start searched to that product.
  const params = useLocalSearchParams<{ search?: string }>();
  const [search, setSearch] = useState(params.search ?? '');
  const [seededFrom, setSeededFrom] = useState(params.search ?? '');
  if ((params.search ?? '') !== seededFrom) {
    setSeededFrom(params.search ?? '');
    if (params.search) setSearch(params.search);
  }

  const [status, setStatus] = useState<StockStatusFilter>('all');
  const term = useDebouncedValue(search.trim());
  const query = useStock(term, status);
  const rows = pagedRows(query.data?.pages);
  const last = query.data?.pages.at(-1);
  const total = last?.total ?? 0;
  const totalValue = last?.totalStockValue ?? 0;
  // A negative total is proof something is oversold; a negative row in view says so too.
  const oversold = totalValue < 0 || rows.some((row) => Number(row.available_qty || 0) < 0);

  const [selected, setSelected] = useState<StockRow | null>(null);
  const [sheet, setSheet] = useState<'detail' | 'adjust' | null>(null);
  const [printing, setPrinting] = useState(false);

  const open = (row: StockRow) => {
    setSelected(row);
    setSheet('detail');
  };

  const print = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const all = await getAllStock(term, status);
      await printTable({
        title: t.printTitle,
        subtitle: `${t.totalValue}: ${money(all.totalStockValue)}`,
        columns: [
          { label: t.colNo },
          { label: t.colCode },
          { label: t.colName },
          { label: t.colStock, align: 'right' },
          { label: t.colDp, align: 'right' },
          { label: t.colValue, align: 'right' },
          { label: t.colStatus },
        ],
        rows: all.rows.map((row, i) => [
          i + 1,
          row.products?.product_code ?? '',
          row.products?.name ?? '',
          formatNumber(row.available_qty, lang),
          money(row.fifo_average_dp),
          money(row.fifo_stock_value),
          t.statuses[stockStatus(row)],
        ]),
      });
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <ListScreen
      title={t.title}
      right={<HeaderIconButton icon="printer" label={t.printList} onPress={print} disabled={printing || rows.length === 0} />}
      header={
        <>
          <FigureCard
            dark
            label={t.totalValue}
            value={money(totalValue)}
            valueColor={totalValue < 0 ? Red[300] : undefined}
            caption={oversold ? t.oversoldNote : undefined}
            captionColor={Red[300]}
            badge={{ icon: 'warehouse', bg: 'rgba(255, 255, 255, 0.12)', ink: White }}
          />
          <SearchField value={search} onChangeText={setSearch} placeholder={t.searchPlaceholder} label={t.searchLabel} height={50} />
          <FilterChips
            label={t.statusLabel}
            selected={status}
            onSelect={setStatus}
            bleed
            options={STATUSES.map((key) => ({ key, label: t.statuses[key] }))}
          />
          {query.isSuccess ? <Txt style={styles.count}>{t.count(total, formatNumber(total, lang))}</Txt> : null}
        </>
      }
      rows={rows}
      keyOf={(row) => row.id}
      renderRow={({ item }) => <StockCard row={item} onPress={open} />}
      query={query}
      emptyText={term || status !== 'all' ? t.emptyFiltered : t.emptyAll}
      errorText={() => t.loadError}
      retryLabel={t.retry}>
      <StockDetailSheet
        row={sheet === 'detail' ? selected : null}
        onClose={() => setSheet(null)}
        onAdjust={can('inventory.adjust') ? () => setSheet('adjust') : undefined}
      />
      <AdjustStockSheet row={sheet === 'adjust' ? selected : null} onClose={() => setSheet(null)} />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 13, fontWeight: '500', color: Zinc[500] },
});
