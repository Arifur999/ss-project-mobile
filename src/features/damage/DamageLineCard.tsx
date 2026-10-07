import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import type { DamageLine } from '@/features/damage/damageForm';

/** One product on a new damage entry: which, how many, and - only if FIFO has nothing - what each cost. */
export function DamageLineCard({
  line,
  onChange,
  onRemove,
  errors,
}: {
  line: DamageLine;
  onChange: (patch: Partial<DamageLine>) => void;
  onRemove: () => void;
  errors?: { qty?: true; cost?: true };
}) {
  const t = useCopy(DAMAGE_COPY);
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
      <View style={styles.pair}>
        <View style={styles.qty}>
          <TextField
            tone="zinc"
            label={t.qty}
            placeholder="1"
            value={line.qty}
            onChangeText={(qty) => onChange({ qty })}
            error={errors?.qty ? t.errQty : undefined}
            plainError
            keyboardType="number-pad"
            inputStyle={styles.figure}
          />
        </View>
        <View style={styles.cost}>
          <TextField
            tone="zinc"
            label={t.unitCost}
            placeholder={t.optional}
            value={line.unit_cost}
            onChangeText={(unit_cost) => onChange({ unit_cost })}
            error={errors?.cost ? t.errCost : undefined}
            plainError
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      <Txt style={styles.hint}>{t.unitCostHint}</Txt>
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
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  qty: { flex: 1, minWidth: 0 },
  cost: { flex: 1.4, minWidth: 0 },
  figure: { fontWeight: '600' },
  hint: { fontSize: 12, color: Zinc[500] },
});
