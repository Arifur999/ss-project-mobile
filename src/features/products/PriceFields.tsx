import { StyleSheet, View } from 'react-native';

import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { PRODUCT_COPY } from '@/features/products/copy';
import { parseAmount } from '@/lib/money';
import { actualDp } from '@/lib/purchaseAmounts';

/**
 * A price and its percentage discount side by side, with the price after the
 * discount worked out under them as it is typed - the website's DP Rate /
 * DP Discount / Final DP (and MRP) row.
 */
export function PriceFields({
  label,
  finalLabel,
  price,
  discount,
  onPrice,
  onDiscount,
  priceError,
  discountError,
}: {
  label: string;
  finalLabel: string;
  price: string;
  discount: string;
  onPrice: (value: string) => void;
  onDiscount: (value: string) => void;
  priceError?: string;
  discountError?: string;
}) {
  const t = useCopy(PRODUCT_COPY);
  const { money } = useAmountShield();
  const base = parseAmount(price || '0');
  const pct = parseAmount(discount || '0');
  const final = Number.isNaN(base) || Number.isNaN(pct) ? null : actualDp(base, pct);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.price}>
          <TextField
            tone="zinc"
            label={label}
            placeholder="0"
            value={price}
            onChangeText={onPrice}
            error={priceError}
            plainError
            keyboardType="decimal-pad"
            inputStyle={styles.amount}
          />
        </View>
        <View style={styles.discount}>
          <TextField
            tone="zinc"
            label={t.discountField}
            placeholder="0"
            value={discount}
            onChangeText={onDiscount}
            error={discountError}
            plainError
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      {final !== null ? <Txt style={styles.final}>{t.finalLine(finalLabel, money(final))}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  price: { flex: 1.4, minWidth: 0 },
  discount: { flex: 1, minWidth: 0 },
  amount: { fontWeight: '600' },
  final: { fontSize: 13, fontWeight: '600', color: Zinc[700] },
});
