import { StyleSheet } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { REPORT_COPY } from '@/features/reports/copy';
import { fullMonthYearLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import type { MonthRow } from '@/lib/yearlyReport';

/**
 * One month of the Yearly report in full - every column of the website's
 * table for that month: its sales, what it earned and spent and kept, and
 * what it bought.
 */
export function YearMonthSheet({ year, row, onClose }: { year: number; row: MonthRow | null; onClose: () => void }) {
  const t = useCopy(REPORT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const m = (key: keyof MonthRow) => money(row?.[key] ?? 0);

  return (
    <BottomSheet open={!!row} onClose={onClose} closeLabel={t.close}>
      <Txt accessibilityRole="header" style={styles.title}>
        {row ? fullMonthYearLabel(year, row.month, lang) : ''}
      </Txt>
      <TotalsList
        rows={[
          { label: t.salesTargetLabel, value: m('salesGoal') },
          { label: t.salesBeforeDiscount, value: m('salesAmount') },
          { label: t.discount, value: m('discount') },
        ]}
        grand={{ label: t.actualSales, value: m('actualSales') }}
      />
      <TotalsList
        rows={[
          { label: t.profitTargetLabel, value: m('profitGoal') },
          { label: t.salesProfit, value: m('totalProfit') },
          { label: t.otherIncome, value: m('otherIncome') },
          { label: t.incentive, value: m('purchaseIncentive') },
          { label: t.profitAchieved, value: m('earnings') },
          { label: t.expenses, value: m('expenses') },
          { label: t.profitLoss, value: m('profitLoss') },
          { label: t.withdrawn, value: m('profitWithdraw') },
        ]}
        grand={{ label: t.availableProfit, value: m('availableProfit') }}
      />
      <TotalsList
        rows={[
          { label: t.purchases, value: m('purchaseOrderValue') },
          { label: t.incentive, value: m('purchaseIncentive') },
          { label: t.piecesBought, value: t.qtyCount(formatNumber(row?.purchaseQty ?? 0, lang)) },
        ]}
        grand={{ label: t.owedSuppliers, value: m('purchaseDeposit') }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 6, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
});
