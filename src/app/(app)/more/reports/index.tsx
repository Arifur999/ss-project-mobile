import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Amber, Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { BREAKDOWN_TABS, BreakdownList, breakdownRows, type BreakdownTab } from '@/features/reports/BreakdownList';
import { CompanyWays } from '@/features/reports/CompanyWays';
import { REPORT_COPY } from '@/features/reports/copy';
import { DailyTargetRow } from '@/features/reports/DailyTargetRow';
import { ReportsShell } from '@/features/reports/ReportsShell';
import { TargetProgressCard } from '@/features/reports/TargetProgressCard';
import { TodayTargetCard } from '@/features/reports/TodayTargetCard';
import { monthName, toISODate } from '@/lib/dates';
import { REPORT_PERIODS, type ReportPeriod } from '@/lib/periods';
import { useReport } from '@/services/reports.services';

const PAGE = 20;
// A day-by-day list past a month says nothing a phone can show; the website's chart caps it the same way in practice.
const MAX_DAYS = 31;

/** Hatim's Report Summary: targets, profit and loss, the day-by-day target, the breakdowns and buying targets for a period. */
export default function ReportSummaryScreen() {
  const t = useCopy(REPORT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [tab, setTab] = useState<BreakdownTab>('sales');
  const [limit, setLimit] = useState(PAGE);
  const query = useReport(period);
  const report = query.data;

  const today = toISODate(new Date());
  const todayRow = report?.dailyPerformance.find((d) => d.date === today);
  const days = report && report.dailyPerformance.length <= MAX_DAYS ? report.dailyPerformance : [];
  const [y, m] = (report?.monthlyPurchaseMonth || today.slice(0, 7)).split('-').map(Number);

  return (
    <ReportsShell section="summary" query={query}>
      <FilterChips label={t.periodLabel} selected={period} onSelect={setPeriod} options={REPORT_PERIODS.map((key) => ({ key, label: t.periods[key] }))} />

      {report ? (
        <>
          <TargetProgressCard dark label={t.totalSales} value={report.totalSales} target={report.salesTarget} />
          <TargetProgressCard label={t.grossProfit} value={report.grossProfit} target={report.profitTarget} />
          <FigureCard
            label={t.profitLoss}
            value={money(report.profitLoss)}
            valueColor={report.profitLoss < 0 ? Red[600] : Green[700]}
            caption={t.available(money(report.availableProfit), money(report.profitWithdraw))}
          />
          <View style={styles.row}>
            <FigureCard label={t.expenses} value={money(report.totalExpenses)} valueColor={Red[600]} />
            <FigureCard label={t.otherIncome} value={money(report.totalOtherIncome)} valueColor={Green[700]} />
          </View>
          <View style={styles.row}>
            <FigureCard label={t.purchases} value={money(report.purchaseValue)} caption={t.purchaseDetail(money(report.purchaseIncentive), money(report.purchaseDeposit))} />
            <FigureCard label={t.supplierPaid} value={money(report.supplierPayments)} />
          </View>
          {report.uncostedSales > 0 ? (
            <View style={styles.note}>
              <Txt style={styles.noteText}>{t.uncosted(money(report.uncostedSales))}</Txt>
            </View>
          ) : null}

          {todayRow ? <TodayTargetCard day={todayRow} /> : null}
          {days.length > 0 ? (
            <View style={styles.group}>
              <Txt accessibilityRole="header" style={styles.title}>
                {t.daily}
              </Txt>
              <View style={styles.list}>
                {days.map((day, i) => (
                  <DailyTargetRow key={day.date} day={day} first={i === 0} isToday={day.date === today} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.group}>
            <Txt accessibilityRole="header" style={styles.title}>
              {t.breakdown}
            </Txt>
            <FilterChips
              label={t.breakdown}
              selected={tab}
              onSelect={(next) => {
                setTab(next);
                setLimit(PAGE);
              }}
              options={BREAKDOWN_TABS.map((key) => ({ key, label: t.tabs[key] }))}
            />
            <BreakdownList tab={tab} report={report} limit={limit} />
            {breakdownRows(report, tab).length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}
          </View>

          <CompanyWays rows={report.companyWayRows} />

          {report.monthlyPurchaseRows.length > 0 ? (
            <View style={styles.group}>
              <Txt accessibilityRole="header" style={styles.title}>
                {t.buyingTargets(`${monthName(m, lang)} ${lang === 'bn' ? bnDigits(String(y)) : y}`)}
              </Txt>
              <TotalsList
                rows={report.monthlyPurchaseRows.map((row) => ({
                  label: row.company,
                  value: [
                    t.buyingFigures(money(row.achieved), money(row.target)),
                    row.extra > 0 ? t.extra(money(row.extra)) : '',
                    t.nextMonth(money(row.nextMonthTarget)),
                  ]
                    .filter(Boolean)
                    .join(' · '),
                }))}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </ReportsShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  group: { gap: 10 },
  title: { marginTop: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  note: { padding: 12, borderRadius: 14, backgroundColor: Amber[50], borderWidth: 1, borderColor: Amber[200] },
  noteText: { fontSize: 13, color: Amber[900] },
});
