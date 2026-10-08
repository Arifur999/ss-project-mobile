import { Pressable, StyleSheet, View } from 'react-native';

import { FieldError } from '@/components/FieldError';
import { FigureRow } from '@/components/FiguresCard';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import type { DraftLine, LineErrors } from '@/features/purchase/orderForm';
import type { OrderLine } from '@/lib/purchaseOrder';

/**
 * One product on a purchase order: how many, its DP and DP discount as typed,
 * and under them what the website's row works out - the actual DP, the total,
 * the SP incentive and the deposit owed. An edited invoice's line can say what
 * has arrived of it, and has no Remove once anything has.
 */
export function OrderLineCard({
  line,
  priced,
  onChange,
  onRemove,
  errors,
  errorText,
  notes = [],
}: {
  line: DraftLine;
  priced: OrderLine;
  onChange: (patch: Partial<DraftLine>) => void;
  onRemove?: () => void;
  errors?: LineErrors;
  /** In place of the quantity's own words, when it is wrong for a reason of its own. */
  errorText?: string;
  notes?: string[];
}) {
  const t = useCopy(PURCHASE_COPY);
  const { money } = useAmountShield();
  // Three narrow fields share the row, so each only turns red and the words go once beneath them.
  const messages = [errors?.qty && (errorText || t.errQty), errors?.dp && t.errDp, errors?.discount && t.errDiscount].filter(Boolean);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.who}>
          <Txt style={styles.name} numberOfLines={2}>
            {line.product_name}
          </Txt>
          <Txt style={styles.code}>{line.product_code}</Txt>
        </View>
        {onRemove ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${t.removeLine} ${line.product_name}`} onPress={onRemove} style={styles.remove}>
            <Txt style={styles.removeText}>{t.removeLine}</Txt>
          </Pressable>
        ) : null}
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
            label={t.dp}
            placeholder="0"
            value={line.dp}
            onChangeText={(dp) => onChange({ dp })}
            error={errors?.dp ? ' ' : undefined}
            keyboardType="decimal-pad"
            inputStyle={styles.figure}
          />
        </View>
        <View style={styles.narrow}>
          <TextField
            tone="zinc"
            label={t.discountPct}
            placeholder="0"
            value={line.discount}
            onChangeText={(discount) => onChange({ discount })}
            error={errors?.discount ? ' ' : undefined}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      {messages.length ? <FieldError plain>{messages.join(' · ')}</FieldError> : null}
      {notes.map((note) => (
        <Txt key={note} style={styles.note}>
          {note}
        </Txt>
      ))}
      <FigureRow
        figures={[
          { label: t.actualDp, value: money(priced.actual_dp) },
          { label: t.colTotal, value: money(priced.total_amount) },
          { label: t.colSp, value: money(priced.sp_amount) },
          { label: t.colDeposit, value: money(priced.deposit_amount), strong: true },
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
  fields: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  narrow: { flex: 1, minWidth: 0 },
  wide: { flex: 1.5, minWidth: 0 },
  figure: { fontWeight: '600' },
  note: { fontSize: 13, color: Zinc[600] },
});
