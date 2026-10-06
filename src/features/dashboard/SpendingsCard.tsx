import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoiceSheet } from '@/components/ChoiceSheet';
import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DASHBOARD_COPY } from '@/features/dashboard/copy';
import type { MonthBreakdown } from '@/lib/dashboard';
import { monthYearLabel } from '@/lib/dates';

type Tab = 'income' | 'expense';

/**
 * Income against expenses for one month of the period, with a month picker.
 * Opens on Expenses, as the design does; an empty month says so plainly.
 */
export function SpendingsCard({ months, fallback }: { months: MonthBreakdown[]; fallback: { year: number; month: number } }) {
  const t = useCopy(DASHBOARD_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const [tab, setTab] = useState<Tab>('expense');
  const [key, setKey] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const current =
    months.find((m) => m.key === key) ??
    months[0] ?? {
      key: 'none',
      year: fallback.year,
      month: fallback.month,
      income: [],
      expenses: [],
      incomeTotal: 0,
      expenseTotal: 0,
    };
  const label = monthYearLabel(current.year, current.month, lang);
  const isIncome = tab === 'income';
  const name = (raw: string) => t.incomeNames[raw] ?? (raw === 'Uncategorised' ? t.uncategorised : raw);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Txt style={styles.title}>{t.monthlySpendings}</Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.chooseMonth}: ${label}`}
          onPress={() => months.length > 1 && setPicking(true)}
          style={styles.monthButton}>
          <Txt style={styles.monthText}>{label}</Txt>
          <DesignIcon name="chevronDown" size={16} color={Zinc[900]} strokeWidth={2} />
        </Pressable>
      </View>

      <View accessibilityRole="tablist" style={styles.tabs}>
        <TabButton selected={isIncome} onPress={() => setTab('income')} text={`${t.income} (${money(current.incomeTotal)})`} />
        <TabButton selected={!isIncome} onPress={() => setTab('expense')} text={`${t.expenses} (${money(current.expenseTotal)})`} />
      </View>

      {isIncome ? (
        current.incomeTotal > 0 ? (
          <View style={styles.panel}>
            <Txt style={styles.bigFigure}>{money(current.incomeTotal)}</Txt>
            <Txt style={styles.panelText}>{t.totalIncome(label)}</Txt>
          </View>
        ) : (
          <Empty text={t.noIncome(label)} />
        )
      ) : current.expenses.length > 0 ? (
        <View style={styles.list}>
          {current.expenses.map((row, i) => (
            <View key={row.name} style={[styles.row, i > 0 && styles.rowDivider]}>
              <Txt style={styles.rowName} numberOfLines={1}>
                {name(row.name)}
              </Txt>
              <Txt style={styles.rowAmount}>{money(row.amount)}</Txt>
            </View>
          ))}
        </View>
      ) : (
        <Empty text={t.noExpenses(label)} />
      )}

      <ChoiceSheet
        open={picking}
        onClose={() => setPicking(false)}
        title={t.chooseMonth}
        closeLabel={t.close}
        options={months.map((m) => ({ key: m.key, label: monthYearLabel(m.year, m.month, lang) }))}
        selected={current.key}
        onSelect={setKey}
      />
    </View>
  );
}

function TabButton({ selected, onPress, text }: { selected: boolean; onPress: () => void; text: string }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.tab, { borderBottomColor: selected ? Zinc[900] : 'transparent' }]}>
      <Txt style={[styles.tabText, { fontWeight: selected ? '600' : '500', color: selected ? Zinc[900] : Zinc[600] }]} numberOfLines={1}>
        {text}
      </Txt>
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.panel}>
      <View style={styles.emptyBadge}>
        <DesignIcon name="receipt" size={22} color={Zinc[500]} />
      </View>
      <Txt style={styles.emptyText}>{text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 20, borderRadius: 20, backgroundColor: Zinc[100], borderWidth: 1, borderColor: Zinc[200] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  monthButton: {
    height: 36,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Zinc[200],
    borderRadius: 999,
    backgroundColor: White,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthText: { fontSize: 13, fontWeight: '600', color: Zinc[900] },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Zinc[200] },
  tab: { flex: 1, height: 44, marginBottom: -1, borderBottomWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14 },
  panel: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 10 },
  bigFigure: { fontSize: 28, fontWeight: '600', letterSpacing: -0.56, color: Zinc[900] },
  panelText: { marginTop: -6, fontSize: 14, color: Zinc[600] },
  emptyBadge: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: White,
    borderWidth: 1,
    borderColor: Zinc[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 15, color: Zinc[600], textAlign: 'center' },
  list: { borderRadius: 14, backgroundColor: White, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  rowName: { flex: 1, fontSize: 15, fontWeight: '500', color: Zinc[900] },
  rowAmount: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
});
