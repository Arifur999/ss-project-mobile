import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { DesignIcon } from '@/components/DesignIcon';
import { ProgressBar } from '@/components/ProgressBar';
import { Txt } from '@/components/Txt';
import { categoryColor, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { EXPENSE_COPY } from '@/features/expenses/copy';
import { usageColor, usageWidth } from '@/features/expenses/usage';
import type { ExpenseTotals } from '@/lib/expenseTotals';
import type { Category } from '@/services/expenses.services';

/**
 * One category opened from the list: its total and share, this month and
 * this year, the budget and how much of it is used (or a prompt to set one),
 * then Edit, View transactions and Delete.
 */
export function CategoryDetailSheet({
  category,
  totals,
  grandTotal,
  isTop,
  onClose,
  onEdit,
  onTransactions,
  onDelete,
}: {
  category: Category | null;
  totals: ExpenseTotals;
  grandTotal: number;
  isTop: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTransactions: () => void;
  onDelete: () => void;
}) {
  const t = useCopy(EXPENSE_COPY);
  const { money } = useAmountShield();
  const id = category?.id ?? '';
  const total = totals.allTime[id] || 0;
  const month = totals.thisMonth[id] || 0;
  const year = totals.thisYear[id] || 0;
  const budget = Number(category?.monthly_budget || 0);
  const used = budget > 0 ? (month / budget) * 100 : 0;

  const cells = [
    { label: t.thisMonth, value: money(month) },
    { label: t.thisYear, value: money(year) },
    ...(budget > 0
      ? [
          { label: t.monthlyBudget, value: money(budget) },
          { label: t.yearlyBudget, value: money(budget * 12) },
        ]
      : []),
  ];

  return (
    <BottomSheet open={!!category} onClose={onClose} closeLabel={t.close}>
      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: categoryColor(category?.color) }]} />
        <Txt accessibilityRole="header" style={styles.title}>
          {category?.name ?? ''}
        </Txt>
        {isTop ? (
          <View style={styles.top}>
            <Txt style={styles.topText}>{t.topExpense}</Txt>
          </View>
        ) : null}
      </View>

      <View>
        <Txt style={styles.total}>{money(total)}</Txt>
        <Txt style={styles.shareLine}>
          {total > 0 ? t.totalSpentShare(t.pct(grandTotal > 0 ? (total / grandTotal) * 100 : 0)) : t.noSpendingYet}
        </Txt>
      </View>

      <View style={styles.grid}>
        {[cells.slice(0, 2), cells.slice(2)].filter((row) => row.length).map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {row.map((cell) => (
              <View key={cell.label} style={styles.cell}>
                <Txt style={styles.cellLabel}>{cell.label}</Txt>
                <Txt style={styles.cellValue} numberOfLines={1} adjustsFontSizeToFit>
                  {cell.value}
                </Txt>
              </View>
            ))}
          </View>
        ))}
      </View>

      {budget > 0 ? (
        <View style={styles.used}>
          <ProgressBar percent={usageWidth(used, month)} color={usageColor(used, false)} track={Zinc[100]} label={t.monthUsedLabel} />
          <Txt style={styles.usedText}>{t.usedText(Math.round(used), money(Math.max(0, budget - month)))}</Txt>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.setBudget}>
          <DesignIcon name="target" size={20} color={Zinc[900]} />
          <View>
            <Txt style={styles.setTitle}>{t.setBudget}</Txt>
            <Txt style={styles.setHint}>{t.setBudgetHint}</Txt>
          </View>
        </Pressable>
      )}

      <View style={styles.list}>
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.action}>
          <DesignIcon name="pencil" size={20} color={Zinc[900]} />
          <Txt style={styles.actionText}>{t.editCategory}</Txt>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={onTransactions} style={[styles.action, styles.divider]}>
          <DesignIcon name="receiptText" size={20} color={Zinc[900]} />
          <Txt style={styles.actionText}>{t.viewTransactions}</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDelete} style={[styles.action, styles.divider]}>
          <DesignIcon name="trash" size={20} color={Red[700]} />
          <Txt style={[styles.actionText, { color: Red[700] }]}>{t.deleteCategory}</Txt>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 999, flexShrink: 0 },
  title: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  top: { flexShrink: 0, paddingHorizontal: 10, borderRadius: 999, backgroundColor: Zinc[900] },
  topText: { fontSize: 12, fontWeight: '600', color: White },
  total: { fontSize: 28, fontWeight: '700', lineHeight: 33.6, color: Zinc[900] },
  shareLine: { fontSize: 13, color: Zinc[600] },
  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: Zinc[200] },
  cellLabel: { fontSize: 12, color: Zinc[500] },
  cellValue: { fontSize: 16, fontWeight: '600', color: Zinc[900] },
  used: { gap: 6 },
  usedText: { fontSize: 13, color: Zinc[600] },
  setBudget: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Zinc[300],
    borderRadius: 14,
    backgroundColor: White,
  },
  setTitle: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  setHint: { fontSize: 12, color: Zinc[500] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  action: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: White },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  actionText: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
});
