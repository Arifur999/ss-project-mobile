// What has been spent per category, and against what budget - lifted from
// Hatim/src/pages/expenses/ExpenseDashboard.tsx so the figures equal the
// website's: all-time, this month and this year per category; budgets are
// monthly, the yearly allowance twelve of them; the list names the eight
// biggest and sums the rest on one line.

type Row = Record<string, any>;

/** How many categories the list names before folding the rest into one line. */
export const LEGEND_LIMIT = 8;

export type ExpenseTotals = {
  allTime: Record<string, number>;
  thisMonth: Record<string, number>;
  thisYear: Record<string, number>;
};

export function expenseTotals(expenses: Row[], now = new Date()): ExpenseTotals {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const allTime: Record<string, number> = {};
  const thisMonth: Record<string, number> = {};
  const thisYear: Record<string, number> = {};
  for (const e of expenses) {
    // The day as stored, not a Date: "2026-10-01" parsed as UTC is still
    // September in a timezone behind it.
    const [y, m] = String(e.date || '').slice(0, 10).split('-').map(Number);
    const amount = Number(e.amount || 0);
    allTime[e.category_id] = (allTime[e.category_id] || 0) + amount;
    if (m === month && y === year) thisMonth[e.category_id] = (thisMonth[e.category_id] || 0) + amount;
    if (y === year) thisYear[e.category_id] = (thisYear[e.category_id] || 0) + amount;
  }
  return { allTime, thisMonth, thisYear };
}

const sum = (record: Record<string, number>) => Object.values(record).reduce((s, v) => s + v, 0);

export function budgetSummary(categories: Row[], totals: ExpenseTotals) {
  const monthSpent = sum(totals.thisMonth);
  const yearSpent = sum(totals.thisYear);
  const monthlyBudget = categories.reduce((s, c) => s + Number(c.monthly_budget || 0), 0);
  const yearlyBudget = monthlyBudget * 12;
  return {
    allTime: sum(totals.allTime),
    monthSpent,
    yearSpent,
    monthlyBudget,
    yearlyBudget,
    monthUsage: monthlyBudget > 0 ? (monthSpent / monthlyBudget) * 100 : 0,
    yearUsage: yearlyBudget > 0 ? (yearSpent / yearlyBudget) * 100 : 0,
  };
}

/**
 * Every category with spending, largest first, with its share of the total;
 * the first LEGEND_LIMIT are named and the rest summed. Categories with nothing
 * spent come back separately, by name.
 */
export function categoryShares<C extends Row>(categories: C[], totals: ExpenseTotals) {
  const rows = categories
    .map((category) => ({ category, value: totals.allTime[category.id] || 0 }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((s, row) => s + row.value, 0);
  const withShare = rows.map((row) => ({ ...row, share: total > 0 ? (row.value / total) * 100 : 0 }));
  const rest = withShare.slice(LEGEND_LIMIT);
  return {
    total,
    listed: withShare.slice(0, LEGEND_LIMIT),
    restCount: rest.length,
    restValue: rest.reduce((s, row) => s + row.value, 0),
    restShare: rest.reduce((s, row) => s + row.share, 0),
    unspent: categories.filter((c) => !(totals.allTime[c.id] > 0)),
  };
}
