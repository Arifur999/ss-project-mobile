import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FigureCard } from '@/components/FigureCard';
import { ConfirmDeleteSheet } from '@/components/ItemSheets';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { BudgetCard } from '@/features/expenses/BudgetCard';
import { CategoryBlockedSheet } from '@/features/expenses/CategoryBlockedSheet';
import { CategoryDetailSheet } from '@/features/expenses/CategoryDetailSheet';
import { CategoryFormSheet } from '@/features/expenses/CategoryFormSheet';
import { CategoryRankList } from '@/features/expenses/CategoryRankList';
import { EXPENSE_COPY } from '@/features/expenses/copy';
import { ExpenseShell } from '@/features/expenses/ExpenseShell';
import { budgetSummary, categoryShares, expenseTotals } from '@/lib/expenseTotals';
import { errorMessage } from '@/lib/httpClient';
import { deleteCategory, useExpenseData, useExpenseWrite, type Category } from '@/services/expenses.services';

type Sheet = 'detail' | 'blocked' | 'confirm' | null;

/** Budgets and where the money goes, by category - Hatim's ExpenseDashboard. */
export default function ExpenseOverviewScreen() {
  const t = useCopy(EXPENSE_COPY);
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useExpenseWrite();
  const { data } = useExpenseData();
  const categories = useMemo(() => data?.categories ?? [], [data?.categories]);

  const totals = useMemo(() => expenseTotals(data?.expenses ?? []), [data?.expenses]);
  const summary = budgetSummary(categories, totals);
  const shares = useMemo(() => categoryShares(categories, totals), [categories, totals]);

  const [selected, setSelected] = useState<Category | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openTransactions = () => {
    setSheet(null);
    if (selected) router.replace({ pathname: '/more/expenses/transactions', params: { category: selected.id } });
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteCategory(selected.id));
      setSheet(null);
      toast.show(t.categoryDeleted(selected.name));
    } catch (e) {
      const linked = isAxiosError(e) && (e.response?.status === 409 || /transaction|foreign|linked/i.test(errorMessage(e)));
      setSheet(null);
      toast.show(linked ? t.linkedCategory : errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ExpenseShell
      section="overview"
      fab={{
        label: t.newCategory,
        onPress: () => {
          setEditing(null);
          setFormOpen(true);
        },
      }}>
      <BudgetCard summary={summary} />

      <View style={styles.pair}>
        <FigureCard label={t.allTimeSpend} value={money(summary.allTime)} />
        <FigureCard label={t.categories} value={t.catCount(categories.length)} />
      </View>

      <View style={styles.section}>
        <View style={styles.head}>
          <Txt accessibilityRole="header" style={styles.title}>
            {t.byCategory}
          </Txt>
          <Txt style={styles.scope}>{t.allTime}</Txt>
        </View>
        <CategoryRankList
          shares={shares}
          totals={totals}
          onOpen={(category) => {
            setSelected(category);
            setSheet('detail');
          }}
        />
      </View>

      <CategoryDetailSheet
        category={sheet === 'detail' ? selected : null}
        totals={totals}
        grandTotal={summary.allTime}
        isTop={!!selected && shares.listed[0]?.category.id === selected.id}
        onClose={() => setSheet(null)}
        onEdit={() => {
          setSheet(null);
          setEditing(selected);
          setFormOpen(true);
        }}
        onTransactions={openTransactions}
        onDelete={() => setSheet(selected && (totals.allTime[selected.id] || 0) > 0 ? 'blocked' : 'confirm')}
      />

      <CategoryFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSaved={(saved) => {
          // An edit returns to the category it was opened from, as the design does.
          if (editing) {
            setSelected(saved);
            setSheet('detail');
          }
        }}
      />

      <CategoryBlockedSheet
        open={sheet === 'blocked'}
        name={selected?.name ?? ''}
        spent={selected ? totals.allTime[selected.id] || 0 : 0}
        onClose={() => setSheet(null)}
        onTransactions={openTransactions}
      />

      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={selected ? t.deleteCategoryTitle(selected.name) : ''}
        text={t.deleteCategoryText}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </ExpenseShell>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 12 },
  section: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  scope: { fontSize: 13, color: Zinc[500] },
});
