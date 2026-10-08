import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Green, White, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { PRICE_COPY } from '@/features/products/priceCopy';
import { formatNumber, roundTaka } from '@/lib/money';
import { PRICE_FIELDS, type PriceField, type PriceMatch } from '@/lib/priceFile';

const PERCENT: PriceField[] = ['dp_discount', 'mrp_discount'];

/**
 * One product a price file will change - the website preview's row: its code
 * and name, and each of the four prices, the old one struck through above the
 * new where it changes, as it is where it does not.
 */
export function PriceChangeRow({ row }: { row: PriceMatch }) {
  const t = useCopy(PRICE_COPY);
  const { lang } = useLang();
  // Money to the whole taka; a percentage as it is.
  const show = (field: PriceField, value: number | undefined) =>
    value === undefined ? '-' : formatNumber(PERCENT.includes(field) ? value : roundTaka(value), lang);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Txt style={styles.name} numberOfLines={2}>
          {row.name}
        </Txt>
        <Txt style={styles.code}>{row.product_code}</Txt>
      </View>
      <View style={styles.fields}>
        {PRICE_FIELDS.map((field) => {
          const changed = row.before[field] !== undefined;
          return (
            <View
              key={field}
              style={styles.field}
              accessible
              accessibilityLabel={
                changed ? `${t.fields[field]}: ${t.now} ${show(field, row.before[field])}, ${t.next} ${show(field, row.after[field])}` : `${t.fields[field]}: ${show(field, row.after[field])}`
              }>
              <Txt style={styles.label}>{t.fields[field]}</Txt>
              {changed ? <Txt style={styles.before}>{show(field, row.before[field])}</Txt> : null}
              <Txt style={changed ? styles.after : styles.same} numberOfLines={1} adjustsFontSizeToFit>
                {show(field, row.after[field])}
              </Txt>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  code: { flexShrink: 0, fontSize: 12, color: Zinc[500] },
  fields: { flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Zinc[100] },
  field: { flex: 1, minWidth: 0 },
  label: { fontSize: 11, fontWeight: '600', color: Zinc[500] },
  before: { fontSize: 12, color: Zinc[400], textDecorationLine: 'line-through' },
  after: { fontSize: 14, fontWeight: '700', color: Green[700] },
  same: { fontSize: 14, color: Zinc[500] },
});
