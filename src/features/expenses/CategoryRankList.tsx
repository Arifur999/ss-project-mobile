import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Txt } from '@/components/Txt';
import { categoryColor, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { EXPENSE_COPY } from '@/features/expenses/copy';
import type { categoryShares, ExpenseTotals } from '@/lib/expenseTotals';
import type { Category } from '@/services/expenses.services';

type Shares = ReturnType<typeof categoryShares<Category>>;

/**
 * Spending by category: the eight biggest by name with their share, the rest
 * on one grey line, then the categories nothing has been spent on. Tapping a
 * category opens it.
 */
export function CategoryRankList({ shares, totals, onOpen }: { shares: Shares; totals: ExpenseTotals; onOpen: (category: Category) => void }) {
  const t = useCopy(EXPENSE_COPY);
  const { money } = useAmountShield();
  const topId = shares.listed[0]?.category.id;

  return (
    <View style={styles.list}>
      {shares.listed.map(({ category, value, share }, i) => {
        const hex = categoryColor(category.color);
        const budget = Number(category.monthly_budget || 0);
        const month = totals.thisMonth[category.id] || 0;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={t.rowLabel(category.name, money(value), t.pct(share))}
            onPress={() => onOpen(category)}
            style={[styles.row, i > 0 && styles.divider]}>
            <View style={styles.line}>
              <View style={[styles.dot, { backgroundColor: hex }]} />
              <Txt style={styles.name} numberOfLines={1}>
                {category.name}
              </Txt>
              {category.id === topId ? (
                <View style={styles.top}>
                  <Txt style={styles.topText}>{t.top}</Txt>
                </View>
              ) : null}
              <Txt style={styles.amount}>{money(value)}</Txt>
            </View>
            <View style={styles.line10}>
              <View style={styles.grow}>
                <ProgressBar percent={share} color={hex} track={Zinc[100]} height={6} minWidth={3} />
              </View>
              <Txt style={styles.share}>{t.pct(share)}</Txt>
            </View>
            {budget > 0 ? <Txt style={styles.budget}>{t.budgetLine(money(budget), Math.round((month / budget) * 100))}</Txt> : null}
          </Pressable>
        );
      })}

      {shares.restCount > 0 ? (
        <View style={[styles.row, styles.rest, shares.listed.length > 0 && styles.divider]}>
          <View style={styles.line}>
            <View style={[styles.dot, styles.hollow]} />
            <Txt style={styles.restName}>{t.moreCategories(shares.restCount)}</Txt>
            <Txt style={[styles.amount, styles.restAmount]}>{money(shares.restValue)}</Txt>
          </View>
          <View style={styles.line10}>
            <View style={styles.grow}>
              <ProgressBar percent={shares.restShare} color={Zinc[400]} track={Zinc[100]} height={6} minWidth={3} />
            </View>
            <Txt style={styles.share}>{t.pct(shares.restShare)}</Txt>
          </View>
        </View>
      ) : null}

      {shares.unspent.map((category, i) => (
        <Pressable
          key={category.id}
          accessibilityRole="button"
          accessibilityLabel={`${category.name}, ${t.noSpendingYet}`}
          onPress={() => onOpen(category)}
          style={[styles.zero, (i > 0 || shares.listed.length > 0 || shares.restCount > 0) && styles.divider]}>
          <View style={[styles.dot, { backgroundColor: categoryColor(category.color) }]} />
          <Txt style={styles.name} numberOfLines={1}>
            {category.name}
          </Txt>
          <Txt style={styles.zeroNote}>{t.noSpendingYet}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  row: { gap: 6, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: White },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  line10: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 999, flexShrink: 0 },
  hollow: { borderWidth: 1.5, borderColor: Zinc[400] },
  name: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  top: { flexShrink: 0, paddingHorizontal: 8, borderRadius: 999, backgroundColor: Zinc[900] },
  topText: { fontSize: 11, fontWeight: '600', color: White },
  amount: { flexShrink: 0, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  share: { width: 44, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Zinc[700] },
  budget: { fontSize: 12, color: Zinc[500] },
  rest: { backgroundColor: Zinc[50] },
  restName: { flex: 1, fontSize: 15, fontWeight: '500', color: Zinc[700] },
  restAmount: { color: Zinc[700] },
  zero: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: White },
  zeroNote: { flexShrink: 0, fontSize: 13, color: Zinc[500] },
});
