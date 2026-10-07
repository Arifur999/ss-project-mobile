import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProductImage } from '@/components/ProductImage';
import { Txt } from '@/components/Txt';
import { Green, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { PRODUCT_COPY } from '@/features/products/copy';
import { actualDp } from '@/lib/purchaseAmounts';
import { supplierName, type Product } from '@/services/products.services';

/**
 * A product in the catalogue: photo, name, code and category, supplier, and
 * its prices after discount - MRP large, DP under it. Memoised, because the
 * list re-renders every loaded row whenever a page arrives.
 */
export const ProductCard = memo(function ProductCard({ product, onPress }: { product: Product; onPress: (product: Product) => void }) {
  const t = useCopy(PRODUCT_COPY);
  const { money } = useAmountShield();
  const mrpOff = Number(product.mrp_discount || 0);
  const meta = [product.product_code, product.category].filter(Boolean).join(' · ');
  const supplier = supplierName(product.suppliers);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${meta}, ${t.mrp} ${money(actualDp(product.selling_price, mrpOff))}`}
      onPress={() => onPress(product)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <ProductImage url={product.image_url} size={64} />
      <View style={styles.body}>
        <Txt style={styles.name} numberOfLines={2}>
          {product.name}
        </Txt>
        <Txt style={styles.meta} numberOfLines={1}>
          {meta}
        </Txt>
        <Txt style={[styles.supplier, !supplier && styles.muted]} numberOfLines={1}>
          {supplier || t.noSupplier}
        </Txt>
      </View>
      <View style={styles.prices}>
        <Txt style={styles.mrp} numberOfLines={1}>
          {money(actualDp(product.selling_price, mrpOff))}
        </Txt>
        {mrpOff > 0 ? (
          <View style={styles.off}>
            <Txt style={styles.offText}>{`-${t.pct(mrpOff)}`}</Txt>
          </View>
        ) : null}
        <Txt style={styles.dp} numberOfLines={1}>
          {`${t.dp} ${money(actualDp(product.cost_price, product.dp_discount))}`}
        </Txt>
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
  name: { fontSize: 15, fontWeight: '600', lineHeight: 20, color: Zinc[900] },
  meta: { fontSize: 13, color: Zinc[600] },
  supplier: { fontSize: 12, color: Zinc[500] },
  muted: { color: Zinc[400] },
  prices: { flexShrink: 0, maxWidth: '38%', alignItems: 'flex-end', gap: 3 },
  mrp: { fontSize: 15, fontWeight: '700', color: Zinc[900] },
  off: { paddingHorizontal: 6, borderRadius: 999, backgroundColor: Green[100] },
  offText: { fontSize: 11, fontWeight: '600', color: Green[800] },
  dp: { fontSize: 12, color: Zinc[500] },
});
