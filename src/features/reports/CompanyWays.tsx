import { StyleSheet, View } from 'react-native';

import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { REPORT_COPY } from '@/features/reports/copy';
import type { CompanyWayRow } from '@/lib/reportSummary';

/** The reports' company-ways table: what was bought from and sold of each company. Nothing when there is none. */
export function CompanyWays({ rows }: { rows: CompanyWayRow[] }) {
  const t = useCopy(REPORT_COPY);
  const { money } = useAmountShield();
  if (rows.length === 0) return null;
  return (
    <View style={styles.group}>
      <Txt accessibilityRole="header" style={styles.title}>
        {t.companies}
      </Txt>
      <TotalsList rows={rows.map((row) => ({ label: row.company, value: t.companyFigures(money(row.purchase), money(row.sales)) }))} />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  title: { marginTop: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
});
