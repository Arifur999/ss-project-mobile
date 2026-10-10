import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProductImage } from '@/components/ProductImage';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { INVENTORY_COPY } from '@/features/inventory/copy';
import { STATUS_LOOK, statusText, stockStatus } from '@/features/inventory/stockStatus';
import { formatNumber } from '@/lib/money';
import type { StockRow } from '@/services/inventory.services';

/**
 * A product's stock in the list: photo, name, code and supplier, the DP each
 * and the value, then the quantity on hand - red when it has gone below zero -
 * with its status badge (an Upcoming one counting what is on the way).
 * Memoised for the paged list.
 */
export const StockCard = memo(function StockCard({ row, onPress }: { row: StockRow; onPress: (row: StockRow) => void }) {
  const t = useCopy(INVENTORY_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const product = row.products;
  const status = stockStatus(row);
  const look = STATUS_LOOK[status];
  const qty = Number(row.available_qty || 0);
  const badge = statusText(row, t, lang);
  const supplier = String(product?.suppliers?.company_name || product?.suppliers?.name || '').trim();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product?.name ?? ''}, ${t.inStock} ${formatNumber(qty, lang)}, ${badge}`}
      onPress={() => onPress(row)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <ProductImage url={product?.image_url} size={56} />
      <View style={styles.body}>
        <Txt style={styles.name} numberOfLines={2}>
          {product?.name ?? ''}
        </Txt>
        <Txt style={styles.meta} numberOfLines={1}>
          {[product?.product_code, supplier || t.noSupplier].filter(Boolean).join(' · ')}
        </Txt>
        <Txt style={styles.value} numberOfLines={1}>
          {`${t.dpEach(money(row.fifo_average_dp))} · ${money(row.fifo_stock_value)}`}
        </Txt>
      </View>
      <View style={styles.stock}>
        <Txt style={[styles.qty, qty < 0 && styles.negative]} numberOfLines={1}>
          {formatNumber(qty, lang)}
        </Txt>
        <View style={[styles.badge, { backgroundColor: look.bg }]}>
          <Txt style={[styles.badgeText, { color: look.ink }]} numberOfLines={1}>
            {badge}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Zinc[200],
    backgroundColor: White,
  },
  pressed: { backgroundColor: Zinc[50] },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', lineHeight: 21, color: Zinc[900] },
  meta: { fontSize: 13, color: Zinc[600] },
  value: { fontSize: 12, color: Zinc[500] },
  stock: { flexShrink: 0, maxWidth: '32%', alignItems: 'flex-end', gap: 4 },
  qty: { fontSize: 20, fontWeight: '700', color: Zinc[900] },
  negative: { color: Red[600] },
  badge: { paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
