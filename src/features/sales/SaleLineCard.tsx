import { Pressable, StyleSheet, View } from 'react-native';

import { FieldError } from '@/components/FieldError';
import { FigureRow } from '@/components/FiguresCard';
import { Segmented } from '@/components/Segmented';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { SALES_COPY } from '@/features/sales/copy';
import { priceLine, type DiscountMode, type SaleLine } from '@/features/sales/saleForm';

/**
 * One product on a new sale: how many and at what price, a discount in taka
 * or percent, whether it goes out now, and under them what each comes to after
 * the discount and the line's total - priced as the website prices it.
 */
export function SaleLineCard({
  line,
  onChange,
  onRemove,
  errors,
}: {
  line: SaleLine;
  onChange: (patch: Partial<SaleLine>) => void;
  onRemove: () => void;
  errors?: { qty?: true; price?: true; discount?: true };
}) {
  const t = useCopy(SALES_COPY);
  const { money } = useAmountShield();
  const priced = priceLine(line);
  // Narrow fields share the rows, so each only turns red and the words go once beneath them.
  const messages = [errors?.qty && t.errQty, errors?.price && t.errPrice, errors?.discount && t.errDiscount].filter(Boolean);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.who}>
          <Txt style={styles.name} numberOfLines={2}>
            {line.product_name}
          </Txt>
          <Txt style={styles.code}>{line.product_code}</Txt>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t.removeLine} ${line.product_name}`} onPress={onRemove} style={styles.remove}>
          <Txt style={styles.removeText}>{t.removeLine}</Txt>
        </Pressable>
      </View>
      <View style={styles.fields}>
        <View style={styles.narrow}>
          <TextField
            tone="zinc"
            label={t.qty}
            placeholder="1"
            value={line.qty}
            onChangeText={(qty) => onChange({ qty })}
            error={errors?.qty ? ' ' : undefined}
            keyboardType="number-pad"
            inputStyle={styles.figure}
          />
        </View>
        <View style={styles.wide}>
          <TextField
            tone="zinc"
            label={t.price}
            placeholder="0"
            value={line.price}
            onChangeText={(price) => onChange({ price })}
            error={errors?.price ? ' ' : undefined}
            keyboardType="decimal-pad"
            inputStyle={styles.figure}
          />
        </View>
      </View>
      <View style={styles.fields}>
        <View style={styles.wide}>
          <TextField
            tone="zinc"
            label={t.discountField}
            placeholder="0"
            value={line.discount}
            onChangeText={(discount) => onChange({ discount })}
            error={errors?.discount ? ' ' : undefined}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.unit}>
          <Segmented<DiscountMode>
            label={t.discountUnit}
            value={line.mode}
            onChange={(mode) => onChange({ mode })}
            height={48}
            fontSize={15}
            segments={[
              { key: 'amount', label: t.inTaka },
              { key: 'pct', label: t.inPercent },
            ]}
          />
        </View>
      </View>
      {messages.length ? <FieldError plain>{messages.join(' · ')}</FieldError> : null}
      <View style={styles.delivery}>
        <Toggle value={line.delivered} onChange={(delivered) => onChange({ delivered })} label={t.deliveredNow} />
        <Txt style={styles.deliveryText}>{line.delivered ? t.deliveredNow : t.deliveredLater}</Txt>
      </View>
      <FigureRow
        figures={[
          { label: t.eachAfter, value: money(priced.actual_price) },
          { label: t.discount, value: money(priced.discount_amount * priced.qty) },
          { label: t.lineTotal, value: money(priced.total_amount), strong: true },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  who: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  code: { fontSize: 13, color: Zinc[500] },
  remove: { minHeight: 36, paddingHorizontal: 4, justifyContent: 'center' },
  removeText: { fontSize: 14, fontWeight: '600', color: Red[700] },
  fields: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  narrow: { flex: 1, minWidth: 0 },
  wide: { flex: 1.6, minWidth: 0 },
  unit: { width: 104, flexShrink: 0 },
  figure: { fontWeight: '600' },
  delivery: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deliveryText: { flex: 1, fontSize: 13, color: Zinc[700] },
});
