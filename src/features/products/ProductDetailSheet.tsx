import { StyleSheet, View } from 'react-native';

import { ActionsSheet } from '@/components/ItemSheets';
import { ProductImage } from '@/components/ProductImage';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { PRODUCT_COPY } from '@/features/products/copy';
import { formatNumber } from '@/lib/money';
import { actualDp } from '@/lib/purchaseAmounts';
import { supplierName, type Product } from '@/services/products.services';

/**
 * A product opened from the list: photo, supplier and opening quantity, both
 * prices before and after their discount, size and weight - then View stock
 * (for a member who may open Inventory), and Edit / Delete where the user may.
 */
export function ProductDetailSheet({
  product,
  onClose,
  onStock,
  onEdit,
  onDelete,
  deleteBusy,
}: {
  product: Product | null;
  onClose: () => void;
  onStock?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteBusy?: boolean;
}) {
  const t = useCopy(PRODUCT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();

  const price = (base: unknown, pct: unknown) => {
    const off = Number(pct || 0);
    return {
      final: money(actualDp(base, off)),
      // "Tk 20,000 − 10%" under the final figure, when there is a discount.
      from: off > 0 ? `${money(base)} − ${t.pct(off)}` : '',
    };
  };
  const mrp = price(product?.selling_price, product?.mrp_discount);
  const dp = price(product?.cost_price, product?.dp_discount);
  const specs = [
    { label: t.size, value: product?.size },
    { label: t.weight, value: product?.weight },
  ].filter((spec) => String(spec.value || '').trim());

  return (
    <ActionsSheet
      open={!!product}
      onClose={onClose}
      title={product?.name ?? ''}
      subtitle={[product?.product_code, product?.category].filter(Boolean).join(' · ')}
      cancelLabel={t.close}
      closeLabel={t.close}
      editLabel={t.edit}
      deleteLabel={t.delete}
      onEdit={onEdit}
      onDelete={onDelete}
      deleteBusy={deleteBusy}
      extra={onStock ? [{ label: t.viewStock, icon: 'package', onPress: onStock }] : []}>
      <View style={styles.top}>
        <ProductImage url={product?.image_url} size={88} radius={16} label={product?.name} />
        <View style={styles.facts}>
          <Fact label={t.supplier} value={supplierName(product?.suppliers) || t.noSupplier} />
          <Fact label={t.openingQty} value={formatNumber(product?.opening_qty ?? 0, lang)} />
        </View>
      </View>

      <View style={styles.pair}>
        <View style={styles.cell}>
          <Txt style={styles.cellLabel}>{t.finalMrp}</Txt>
          <Txt style={styles.cellValue} numberOfLines={1} adjustsFontSizeToFit>
            {mrp.final}
          </Txt>
          {mrp.from ? <Txt style={styles.cellSub}>{mrp.from}</Txt> : null}
        </View>
        <View style={styles.cell}>
          <Txt style={styles.cellLabel}>{t.finalDp}</Txt>
          <Txt style={styles.cellValue} numberOfLines={1} adjustsFontSizeToFit>
            {dp.final}
          </Txt>
          {dp.from ? <Txt style={styles.cellSub}>{dp.from}</Txt> : null}
        </View>
      </View>

      {specs.length ? (
        <View style={styles.specs}>
          {specs.map((spec) => (
            <Fact key={spec.label} label={spec.label} value={String(spec.value)} />
          ))}
        </View>
      ) : null}
    </ActionsSheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Txt style={styles.factLabel}>{label}</Txt>
      <Txt style={styles.factValue} numberOfLines={2}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  facts: { flex: 1, minWidth: 0, gap: 8 },
  fact: { flex: 1, minWidth: 0 },
  factLabel: { fontSize: 12, color: Zinc[500] },
  factValue: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  pair: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: Zinc[200] },
  cellLabel: { fontSize: 12, color: Zinc[500] },
  cellValue: { fontSize: 17, fontWeight: '700', color: Zinc[900] },
  cellSub: { fontSize: 12, color: Zinc[500] },
  specs: { flexDirection: 'row', gap: 10 },
});
