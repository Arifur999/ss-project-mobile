import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ProductImage } from '@/components/ProductImage';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { INVENTORY_COPY } from '@/features/inventory/copy';
import { STATUS_LOOK, statusText, stockStatus } from '@/features/inventory/stockStatus';
import { dateLabel, toISODate } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import { useStockHistory, type StockRow } from '@/services/inventory.services';

/** History rows drawn at first; the server keeps up to 500. */
const HISTORY_STEP = 20;

/**
 * One product's stock opened from the list: how the figure is made up
 * (opening, ordered, received, upcoming, sold), its value, any manual
 * adjustments inside it, and every movement - the "why is this number what it
 * is" the website answers beside its adjust box. Adjust only for those allowed.
 */
export function StockDetailSheet({ row, onClose, onAdjust }: { row: StockRow | null; onClose: () => void; onAdjust?: () => void }) {
  const t = useCopy(INVENTORY_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const history = useStockHistory(row?.product_id ?? null);
  const [shown, setShown] = useState(HISTORY_STEP);
  const [seeded, setSeeded] = useState<string | null>(null);
  if ((row?.id ?? null) !== seeded) {
    setSeeded(row?.id ?? null);
    setShown(HISTORY_STEP);
  }

  const num = (n: unknown) => formatNumber(n, lang);
  const qty = Number(row?.available_qty || 0);
  const status = row ? stockStatus(row) : 'available';
  const look = STATUS_LOOK[status];
  const adjusted = qty - Number(row?.computed_qty || 0);
  const supplier = String(row?.products?.suppliers?.company_name || row?.products?.suppliers?.name || '').trim();

  const figures = [
    { label: t.opening, value: num(row?.opening_qty) },
    { label: t.ordered, value: num(row?.order_qty) },
    { label: t.received, value: num(row?.received_qty) },
    { label: t.upcoming, value: num(row?.upcoming_qty) },
    { label: t.sold, value: num(row?.sales_qty) },
    { label: t.dpPer, value: money(row?.fifo_average_dp) },
  ];
  const moves = history.data ?? [];

  return (
    <BottomSheet open={!!row} onClose={onClose} closeLabel={t.close}>
      <View style={styles.head}>
        <ProductImage url={row?.products?.image_url} size={64} radius={14} />
        <View style={styles.headText}>
          <Txt accessibilityRole="header" style={styles.title} numberOfLines={2}>
            {row?.products?.name ?? ''}
          </Txt>
          <Txt style={styles.sub} numberOfLines={1}>
            {[row?.products?.product_code, supplier || t.noSupplier].filter(Boolean).join(' · ')}
          </Txt>
        </View>
      </View>

      <View style={styles.stock}>
        <View>
          <Txt style={styles.stockLabel}>{t.inStock}</Txt>
          <Txt style={[styles.stockQty, qty < 0 && styles.negative]}>{t.pcs(num(qty))}</Txt>
        </View>
        <View style={styles.stockSide}>
          <View style={[styles.badge, { backgroundColor: look.bg }]}>
            <Txt style={[styles.badgeText, { color: look.ink }]}>{row ? statusText(row, t, lang) : ''}</Txt>
          </View>
          <Txt style={styles.stockLabel}>{t.value}</Txt>
          <Txt style={styles.stockValue}>{money(row?.fifo_stock_value)}</Txt>
        </View>
      </View>

      <View style={styles.grid}>
        {[figures.slice(0, 3), figures.slice(3)].map((line, i) => (
          <View key={i} style={styles.gridRow}>
            {line.map((f) => (
              <View key={f.label} style={styles.cell}>
                <Txt style={styles.cellLabel} numberOfLines={1}>
                  {f.label}
                </Txt>
                <Txt style={styles.cellValue} numberOfLines={1} adjustsFontSizeToFit>
                  {f.value}
                </Txt>
              </View>
            ))}
          </View>
        ))}
      </View>
      {adjusted !== 0 ? <Txt style={styles.note}>{t.adjustedBy(`${adjusted > 0 ? '+' : ''}${num(adjusted)}`)}</Txt> : null}

      {onAdjust ? <Button title={t.adjust} icon="swap" variant="pill" onPress={onAdjust} /> : null}

      <Txt accessibilityRole="header" style={styles.section}>
        {t.history}
      </Txt>
      {history.isPending ? (
        <View style={styles.loading}>
          <Spinner color={Zinc[900]} size={20} />
        </View>
      ) : history.isError ? (
        <Txt style={styles.note}>{t.historyError}</Txt>
      ) : moves.length === 0 ? (
        <Txt style={styles.note}>{t.noHistory}</Txt>
      ) : (
        <View style={styles.list}>
          {moves.slice(0, shown).map((move, i) => {
            const label = t.moves[move.reference_type] ?? t.otherMove;
            const note = String(move.notes || '').trim();
            const up = Number(move.qty_change) > 0;
            return (
              <View key={move.id} style={[styles.move, i > 0 && styles.divider]}>
                <View style={styles.moveBody}>
                  <Txt style={styles.moveLabel}>{label}</Txt>
                  {note && note !== label ? (
                    <Txt style={styles.moveNote} numberOfLines={2}>
                      {note}
                    </Txt>
                  ) : null}
                  <Txt style={styles.moveDate}>{dateLabel(toISODate(new Date(move.created_at)), lang)}</Txt>
                </View>
                <View style={styles.moveFigures}>
                  <Txt style={[styles.moveQty, { color: up ? Green[700] : Red[600] }]}>{`${up ? '+' : ''}${num(move.qty_change)}`}</Txt>
                  <Txt style={styles.moveAfter}>{t.after(num(move.qty_after))}</Txt>
                </View>
              </View>
            );
          })}
        </View>
      )}
      {moves.length > shown ? <Button title={t.showMore} variant="pillOutline" onPress={() => setShown((n) => n + HISTORY_STEP)} /> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headText: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  sub: { fontSize: 13, color: Zinc[600] },
  stock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Zinc[100],
  },
  stockSide: { alignItems: 'flex-end', gap: 2 },
  stockLabel: { fontSize: 12, color: Zinc[500] },
  stockQty: { fontSize: 26, fontWeight: '700', color: Zinc[900] },
  stockValue: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  negative: { color: Red[600] },
  badge: { paddingHorizontal: 8, borderRadius: 999, marginBottom: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  grid: { gap: 8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, minWidth: 0, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: Zinc[200] },
  cellLabel: { fontSize: 11, color: Zinc[500] },
  cellValue: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  note: { fontSize: 13, color: Zinc[500] },
  section: { marginTop: 4, fontSize: 16, fontWeight: '600', color: Zinc[900] },
  loading: { paddingVertical: 16, alignItems: 'center' },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  move: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  moveBody: { flex: 1, minWidth: 0, gap: 1 },
  moveLabel: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  moveNote: { fontSize: 12, color: Zinc[600] },
  moveDate: { fontSize: 12, color: Zinc[500] },
  moveFigures: { flexShrink: 0, alignItems: 'flex-end' },
  moveQty: { fontSize: 15, fontWeight: '600' },
  moveAfter: { fontSize: 12, color: Zinc[500] },
});
