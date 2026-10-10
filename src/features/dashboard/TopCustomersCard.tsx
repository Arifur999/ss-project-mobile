import { Pressable, StyleSheet, View } from 'react-native';

import { Initial } from '@/components/Initial';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { DASHBOARD_COPY } from '@/features/dashboard/copy';
import type { TopCustomer } from '@/lib/dashboard';

/** The period's five best customers, what they bought and what they still owe; View all only for a member who may open the Customers tab. */
export function TopCustomersCard({ customers, onViewAll }: { customers: TopCustomer[]; onViewAll?: () => void }) {
  const t = useCopy(DASHBOARD_COPY);
  const { money } = useAmountShield();
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Txt style={styles.title}>{t.topCustomers}</Txt>
          <Txt style={styles.sub}>{t.bySales}</Txt>
        </View>
        {onViewAll ? (
          <Pressable accessibilityRole="link" onPress={onViewAll} style={styles.viewAll}>
            <Txt style={styles.viewAllText}>{t.viewAll}</Txt>
          </Pressable>
        ) : null}
      </View>

      {customers.length === 0 ? (
        <Txt style={styles.empty}>{t.noCustomers}</Txt>
      ) : (
        <View style={styles.list}>
          {customers.map((c, i) => (
            <View key={c.name} style={[styles.row, i > 0 && styles.divider]}>
              <Initial name={c.name} size={36} tone="muted" />
              <View style={styles.who}>
                <Txt style={styles.name} numberOfLines={1}>
                  {c.name}
                </Txt>
                <Txt style={styles.meta}>{t.customerSales(money(c.sales))}</Txt>
              </View>
              <View style={styles.dueCol}>
                <Txt style={styles.dueLabel}>{t.due}</Txt>
                <Txt style={[styles.due, { color: c.due > 0 ? Red[600] : Zinc[900] }]}>{money(c.due)}</Txt>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 20, borderRadius: 20, backgroundColor: Zinc[100], borderWidth: 1, borderColor: Zinc[200] },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headText: { flexShrink: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  sub: { fontSize: 13, color: Zinc[600] },
  viewAll: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Zinc[200],
    backgroundColor: White,
    justifyContent: 'center',
  },
  viewAllText: { fontSize: 13, fontWeight: '600', color: Zinc[900] },
  list: { borderRadius: 14, backgroundColor: White, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  who: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  meta: { fontSize: 13, color: Zinc[500] },
  dueCol: { alignItems: 'flex-end', flexShrink: 0 },
  dueLabel: { fontSize: 12, color: Zinc[500] },
  due: { fontSize: 15, fontWeight: '600' },
  empty: { paddingVertical: 20, fontSize: 14, color: Zinc[600], textAlign: 'center' },
});
