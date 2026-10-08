import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FigureCard } from '@/components/FigureCard';
import { PromptCard } from '@/components/PromptCard';
import { SelectPill } from '@/components/SelectPill';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { CompanyWays } from '@/features/reports/CompanyWays';
import { REPORT_COPY } from '@/features/reports/copy';
import { ReportsShell } from '@/features/reports/ReportsShell';
import { TargetProgressCard } from '@/features/reports/TargetProgressCard';
import { YearMonthRow } from '@/features/reports/YearMonthRow';
import { YearMonthSheet } from '@/features/reports/YearMonthSheet';
import { monthName, yearLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import type { MonthRow } from '@/lib/yearlyReport';
import { useYearlyReport } from '@/services/reports.services';

// The website's year picker: five years either side of this one.
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => THIS_YEAR - 5 + i);

/**
 * Hatim's Yearly Report: the year's sales and profit against their goals,
 * profit and loss with its margin and what is left after withdrawals,
 * expenses, the incentive and other income, purchases, every month (opened
 * for its full figures), the buying targets that touch the year, and the
 * company ways.
 */
export default function YearlyReportScreen() {
  const t = useCopy(REPORT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const [year, setYear] = useState(THIS_YEAR);
  const [opened, setOpened] = useState<MonthRow | null>(null);
  const query = useYearlyReport(year);
  const report = query.data;
  const pct = (n: number) => formatNumber(Math.round(n * 10) / 10, lang);

  return (
    <ReportsShell section="yearly" query={query}>
      <SelectPill
        shape="box"
        label={t.yearLabel}
        value={String(year)}
        onChange={(key) => setYear(Number(key))}
        options={YEARS.map((y) => ({ key: String(y), label: yearLabel(y, lang) }))}
        closeLabel={t.close}
      />

      {report ? (
        <>
          {!report.hasYearData ? <PromptCard icon="chartLine" text={t.noYearData(yearLabel(year, lang))} /> : null}
          <TargetProgressCard dark label={t.actualSales} value={report.summary.actualSales} target={report.summary.salesGoal} />
          <TargetProgressCard label={t.profitAchieved} value={report.profitAchieved} target={report.summary.profitGoal} />
          <FigureCard
            label={t.profitLoss}
            value={money(report.summary.profitLoss)}
            valueColor={report.summary.profitLoss < 0 ? Red[600] : Green[700]}
            caption={`${t.margin(pct(report.summary.profitMargin))} · ${t.available(money(report.summary.availableProfit), money(report.summary.profitWithdraw))}`}
          />
          <View style={styles.row}>
            <FigureCard label={t.expenses} value={money(report.summary.totalExpenses)} valueColor={Red[600]} caption={t.ofSales(pct(report.expensePct))} />
            <FigureCard
              label={t.incentiveOther}
              value={money(report.summary.purchaseIncentive + report.summary.totalOtherIncome)}
              valueColor={Green[700]}
              caption={t.incentiveParts(money(report.summary.purchaseIncentive), money(report.summary.totalOtherIncome))}
            />
          </View>
          <FigureCard
            label={t.purchases}
            value={money(report.summary.totalPurchases)}
            caption={t.purchaseDetail(money(report.summary.purchaseIncentive), money(report.summary.purchaseDeposit))}
          />

          <View style={styles.group}>
            <Txt accessibilityRole="header" style={styles.title}>
              {t.monthByMonth}
            </Txt>
            {report.hasYearData && report.bestMonth ? (
              <Txt style={styles.sub}>{t.bestMonth(monthName(report.bestMonth.month, lang), money(report.bestMonth.profitLoss))}</Txt>
            ) : null}
            <View style={styles.list}>
              {report.months.map((row, i) => (
                <YearMonthRow
                  key={row.month}
                  row={row}
                  first={i === 0}
                  best={report.hasYearData && row.month === report.bestMonth?.month}
                  onPress={() => setOpened(row)}
                />
              ))}
            </View>
          </View>

          {report.purchaseTargetRows.length > 0 ? (
            <View style={styles.group}>
              <Txt accessibilityRole="header" style={styles.title}>
                {t.buyingTargets(yearLabel(year, lang))}
              </Txt>
              <TargetProgressCard label={t.boughtAgainst} value={report.purchaseTargetTotals.achieved} target={report.purchaseTargetTotals.target} />
              <TotalsList
                rows={report.purchaseTargetRows.map((row) => ({
                  label: row.company,
                  value: [t.buyingFigures(money(row.achieved), money(row.target)), row.remaining > 0 ? t.remaining(money(row.remaining)) : '']
                    .filter(Boolean)
                    .join(' · '),
                }))}
              />
            </View>
          ) : null}

          <CompanyWays rows={report.companyWayRows} />
        </>
      ) : null}

      <YearMonthSheet year={year} row={opened} onClose={() => setOpened(null)} />
    </ReportsShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  group: { gap: 10 },
  title: { marginTop: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  sub: { fontSize: 13, color: Zinc[600] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
});
