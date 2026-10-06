import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { EXPENSE_COPY } from '@/features/expenses/copy';
import { usageColor, usageWidth } from '@/features/expenses/usage';
import { monthName } from '@/lib/dates';
import type { budgetSummary } from '@/lib/expenseTotals';

type Summary = ReturnType<typeof budgetSummary>;

/** The near-black budget card: this month, then this year, each against its budget. */
export function BudgetCard({ summary }: { summary: Summary }) {
  const t = useCopy(EXPENSE_COPY);
  const { lang } = useLang();
  const now = new Date();
  const year = lang === 'bn' ? bnDigits(now.getFullYear()) : String(now.getFullYear());

  return (
    <View accessibilityLabel={t.budget} style={styles.card}>
      <Meter
        title={t.spentThisMonth}
        period={`${monthName(now.getMonth() + 1, lang)} ${year}`}
        spent={summary.monthSpent}
        budget={summary.monthlyBudget}
        usage={summary.monthUsage}
        noBudget={t.noMonthBudget}
        meterLabel={t.monthBudgetUsed}
        big
      />
      <View style={styles.rule} />
      <Meter
        title={t.spentThisYear}
        period={year}
        spent={summary.yearSpent}
        budget={summary.yearlyBudget}
        usage={summary.yearUsage}
        noBudget={t.noYearBudget}
        meterLabel={t.yearBudgetUsed}
      />
    </View>
  );
}

function Meter({
  title,
  period,
  spent,
  budget,
  usage,
  noBudget,
  meterLabel,
  big,
}: {
  title: string;
  period: string;
  spent: number;
  budget: number;
  usage: number;
  noBudget: string;
  meterLabel: string;
  big?: boolean;
}) {
  const t = useCopy(EXPENSE_COPY);
  const { money } = useAmountShield();
  const pct = Math.round(usage);
  return (
    <View style={styles.meter}>
      <View style={styles.head}>
        <Txt style={styles.title}>{title}</Txt>
        <Txt style={styles.period}>{period}</Txt>
      </View>
      <Txt style={big ? styles.bigValue : styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {money(spent)}
      </Txt>
      <ProgressBar
        percent={usageWidth(usage, spent)}
        color={usageColor(usage, true)}
        track="rgba(255, 255, 255, 0.16)"
        label={meterLabel}
      />
      <View style={styles.foot}>
        <Txt style={styles.footText}>{budget > 0 ? t.usedOf(pct, money(budget)) : noBudget}</Txt>
        {budget > 0 ? (
          <Txt style={styles.footText}>{spent > budget ? t.over(money(spent - budget)) : t.left(money(budget - spent))}</Txt>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Zinc[950] },
  rule: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  meter: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 13, fontWeight: '500', color: 'rgba(255, 255, 255, 0.75)' },
  period: { fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' },
  bigValue: { fontSize: 28, fontWeight: '700', lineHeight: 33.6, letterSpacing: -0.28, color: White },
  value: { fontSize: 22, fontWeight: '700', lineHeight: 27.5, color: White },
  foot: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  footText: { flexShrink: 1, fontSize: 13, color: 'rgba(255, 255, 255, 0.75)' },
});
