import { StyleSheet, View } from 'react-native';

import { StatTile } from '@/components/StatTile';
import { useCopy } from '@/context/LanguageContext';
import { DASHBOARD_COPY } from '@/features/dashboard/copy';

/** Purchase, Sales, Profit and Expenses for the period, two by two. */
export function TotalsGrid({
  purchase,
  sales,
  profit,
  expenses,
}: {
  purchase: string;
  sales: string;
  profit: string;
  expenses: string;
}) {
  const t = useCopy(DASHBOARD_COPY);
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <StatTile icon="truck" label={t.totalPurchase} value={purchase} />
        <StatTile icon="store" label={t.totalSales} value={sales} />
      </View>
      <View style={styles.row}>
        <StatTile icon="coins" label={t.totalProfit} value={profit} />
        <StatTile icon="creditCard" label={t.totalExpenses} value={expenses} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
});
