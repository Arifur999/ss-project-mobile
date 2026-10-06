import { inRange, type Range } from './periods';
import { businessEarnings, profitLoss, type ProfitInputs } from './profit';

// Every figure on the Dashboard, computed from raw rows. The rules are lifted
// from Hatim/src/pages/Dashboard.tsx line for line - what a sale is worth, what
// it earned, what counts as money in and out - so the app's Net Profit is the
// website's Net Profit. Pure, so it needs no network to reason about.

type Row = Record<string, any>;

const num = (value: unknown) => Number(value || 0) || 0;
const day = (value: unknown) => String(value || '').slice(0, 10);

/** A sale's value: line totals less the invoice discount, never negative. */
export function saleAmount(sale: Row): number {
  const items: Row[] = sale.sale_items || [];
  const gross = items.length
    ? items.reduce((sum, item) => sum + num(item.selling_price) * num(item.qty), 0)
    : num(sale.subtotal) || num(sale.net_amount);
  return Math.max(0, gross - num(sale.discount_amount));
}

/** What a sale earned over cost. Lines without a cost price earn nothing. */
export function saleProfit(sale: Row): number {
  const items: Row[] = sale.sale_items || [];
  return items.reduce((sum, item) => {
    const cost = num(item.cost_price);
    if (cost <= 0) return sum;
    return sum + (num(item.actual_price) - cost) * num(item.qty);
  }, 0);
}

/** The SP incentive a purchase gave back - earnings, so it belongs in profit. */
export function purchaseIncentive(purchase: Row): number {
  return (purchase.purchase_items || []).reduce((sum: number, item: Row) => sum + num(item.sp_amount), 0);
}

export const isCompleted = (sale: Row) => sale.status === undefined || sale.status === 'completed';

export type CashflowDay = { date: string; moneyIn: number; moneyOut: number };
export type MonthBar = { month: number; sales: number; profit: number; expense: number };
export type MonthBreakdown = {
  key: string;
  year: number;
  month: number;
  income: { name: string; amount: number }[];
  expenses: { name: string; amount: number }[];
  incomeTotal: number;
  expenseTotal: number;
};
export type TopCustomer = { name: string; sales: number; due: number };

export type DashboardFigures = {
  netProfit: number;
  totalPurchases: number;
  totalSales: number;
  totalProfit: number;
  totalExpenses: number;
  cashflow: CashflowDay[];
  chartYear: number;
  monthly: MonthBar[];
  breakdown: MonthBreakdown[];
  topCustomers: TopCustomer[];
};

export type DashboardRows = {
  period: { sales: Row[]; purchases: Row[]; expenses: Row[]; otherIncomes: Row[] };
  week: { sales: Row[]; otherIncomes: Row[]; customerPayments: Row[]; purchases: Row[]; expenses: Row[]; supplierPayments: Row[] };
  year: { sales: Row[]; expenses: Row[] };
};

/**
 * @param range      the selected period
 * @param weekDays   the seven cashflow days, oldest first
 * @param chartYear  the year the month chart covers
 * @param lastMonth  the last month (1-12) to draw - the current month for the
 *                   current year, 12 for a past one, as the design stops at Sep
 */
export function computeDashboard(
  rows: DashboardRows,
  range: Range,
  weekDays: string[],
  chartYear: number,
  lastMonth: number,
): DashboardFigures {
  const sales = rows.period.sales.filter((s) => isCompleted(s) && inRange(s.date, range));
  const purchases = rows.period.purchases.filter((p) => inRange(p.date, range));
  const expenses = rows.period.expenses.filter((e) => inRange(e.date, range));
  const otherIncomes = rows.period.otherIncomes.filter((o) => inRange(o.date, range));

  const totalSales = sales.reduce((sum, s) => sum + saleAmount(s), 0);
  const grossProfit = sales.reduce((sum, s) => sum + saleProfit(s), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + num(p.net_amount), 0);
  const incentive = purchases.reduce((sum, p) => sum + purchaseIncentive(p), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + num(e.amount), 0);
  const totalOtherIncome = otherIncomes.reduce((sum, o) => sum + num(o.amount), 0);

  const inputs: ProfitInputs = {
    grossProfit,
    purchaseIncentive: incentive,
    otherIncome: totalOtherIncome,
    expenses: totalExpenses,
  };

  // Cashflow: money in (sales, other income, due collected) against money out
  // (purchases, expenses, supplier payments), one point per day.
  const flow = new Map(weekDays.map((d) => [d, { moneyIn: 0, moneyOut: 0 }]));
  const add = (list: Row[], side: 'moneyIn' | 'moneyOut', value: (r: Row) => number, onlyCompleted = false) => {
    for (const r of list) {
      if (onlyCompleted && !isCompleted(r)) continue;
      const bucket = flow.get(day(r.date));
      if (bucket) bucket[side] += value(r);
    }
  };
  add(rows.week.sales, 'moneyIn', saleAmount, true);
  add(rows.week.otherIncomes, 'moneyIn', (r) => num(r.amount));
  add(rows.week.customerPayments, 'moneyIn', (r) => num(r.amount));
  add(rows.week.purchases, 'moneyOut', (r) => num(r.net_amount));
  add(rows.week.expenses, 'moneyOut', (r) => num(r.amount));
  add(rows.week.supplierPayments, 'moneyOut', (r) => num(r.amount));
  const cashflow = weekDays.map((date) => ({ date, ...flow.get(date)! }));

  // Month by month for the chart year: sales and what they earned, expenses.
  const months = new Map<number, MonthBar>();
  for (let m = 1; m <= lastMonth; m++) months.set(m, { month: m, sales: 0, profit: 0, expense: 0 });
  const monthOf = (r: Row) => {
    const d = day(r.date);
    return Number(d.slice(0, 4)) === chartYear ? Number(d.slice(5, 7)) : 0;
  };
  for (const s of rows.year.sales) {
    const bar = isCompleted(s) ? months.get(monthOf(s)) : undefined;
    if (bar) {
      bar.sales += saleAmount(s);
      bar.profit += saleProfit(s);
    }
  }
  for (const e of rows.year.expenses) {
    const bar = months.get(monthOf(e));
    if (bar) bar.expense += num(e.amount);
  }

  // Income and expenses by month, within the period. Due collections are left
  // out of income: they are cash for sales already counted here.
  const byMonth = new Map<string, { income: Map<string, number>; expenses: Map<string, number> }>();
  const put = (side: 'income' | 'expenses', date: unknown, name: string, amount: number) => {
    const key = day(date).slice(0, 7);
    if (key.length !== 7 || !amount) return;
    if (!byMonth.has(key)) byMonth.set(key, { income: new Map(), expenses: new Map() });
    const bucket = byMonth.get(key)![side];
    bucket.set(name, (bucket.get(name) || 0) + amount);
  };
  sales.forEach((s) => put('income', s.date, 'Sales', saleAmount(s)));
  otherIncomes.forEach((o) => put('income', o.date, 'Other Income', num(o.amount)));
  expenses.forEach((e) => put('expenses', e.date, String(e.category_name || '').trim() || 'Uncategorised', num(e.amount)));
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  const breakdown = [...byMonth.keys()].sort().reverse().map((key) => {
    const income = sorted(byMonth.get(key)!.income);
    const exp = sorted(byMonth.get(key)!.expenses);
    return {
      key,
      year: Number(key.slice(0, 4)),
      month: Number(key.slice(5, 7)),
      income,
      expenses: exp,
      incomeTotal: income.reduce((sum, r) => sum + r.amount, 0),
      expenseTotal: exp.reduce((sum, r) => sum + r.amount, 0),
    };
  });

  // Customers ranked by what they bought this period, with what they still owe.
  const customers = new Map<string, TopCustomer>();
  for (const s of sales) {
    const name = s.customer_name || 'Walk In Customer';
    const c = customers.get(name) ?? { name, sales: 0, due: 0 };
    c.sales += saleAmount(s);
    c.due += num(s.due_amount);
    customers.set(name, c);
  }

  return {
    netProfit: profitLoss(inputs),
    totalPurchases,
    totalSales,
    totalProfit: businessEarnings(inputs),
    totalExpenses,
    cashflow,
    chartYear,
    monthly: [...months.values()],
    breakdown,
    topCustomers: [...customers.values()].sort((a, b) => b.sales - a.sales).slice(0, 5),
  };
}
