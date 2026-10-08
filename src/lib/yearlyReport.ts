import { firstAmount, saleItemAmount } from './money';
import { availableProfit, businessEarnings, profitLoss, profitMargin, type ProfitInputs } from './profit';
import { targetCompletion } from './purchaseRollingTarget';
import { boughtBySupplier } from './purchaseTargets';
import { companyName, productCompanies, type CompanyWayRow } from './reportSummary';

// The Yearly Report's figures, lifted from Hatim/src/pages/reports/
// YearlyReport.tsx (loadData and its summary) so the app's year is the
// website's: each month's goals, sales, profit, purchases, other income,
// expenses, profit and loss, withdrawals and what is left; the year's totals;
// purchases and sales by company; and every buying target that touches the
// year, taken whole. The rows come in already fetched; this decides what they
// add up to.
//
// Two departures, both in how a row is read rather than in what it adds up to:
// a date's month is read from its YYYY-MM-DD text (the website asks the
// device's clock, which agrees in Bangladesh but not west of UTC), and a
// product's company from `supplier`, the relation GET /products returns - the
// website reads `suppliers` and files every company's sales as Unassigned.

type Row = Record<string, any>;

export type MonthRow = {
  /** 1-12. */
  month: number;
  salesGoal: number;
  profitGoal: number;
  /** Before discount. */
  salesAmount: number;
  discount: number;
  actualSales: number;
  purchaseOrderValue: number;
  purchaseIncentive: number;
  purchaseDeposit: number;
  purchaseQty: number;
  /** Profit on the costed sale lines. */
  totalProfit: number;
  otherIncome: number;
  /** Sales profit, other income and the incentive - what the profit goal is measured against. */
  earnings: number;
  expenses: number;
  profitLoss: number;
  profitWithdraw: number;
  availableProfit: number;
};

export type YearSummary = {
  salesGoal: number;
  profitGoal: number;
  totalSales: number;
  actualSales: number;
  totalProfit: number;
  profitLoss: number;
  profitMargin: number;
  totalPurchases: number;
  purchaseIncentive: number;
  purchaseDeposit: number;
  totalOtherIncome: number;
  totalExpenses: number;
  profitWithdraw: number;
  availableProfit: number;
  purchaseQty: number;
};

export type YearTargetRow = { company: string; target: number; achieved: number; remaining: number };

export type YearlyReport = {
  months: MonthRow[];
  summary: YearSummary;
  /** Everything earned before expenses, against the year's profit goal. */
  profitAchieved: number;
  salesPct: number;
  profitPct: number;
  /** Expenses as a share of actual sales. */
  expensePct: number;
  /** Whether anything was sold, bought, spent or earned in the year. */
  hasYearData: boolean;
  /** The month with the best profit and loss. */
  bestMonth: MonthRow | null;
  companyWayRows: CompanyWayRow[];
  purchaseTargetRows: YearTargetRow[];
  purchaseTargetTotals: { target: number; achieved: number; remaining: number };
};

export type YearlyInputs = {
  year: number;
  /** Completed sales dated in the year. */
  sales: Row[];
  /** Purchases dated in the year. */
  purchases: Row[];
  /** Every purchase ever: a buying target counts what was bought across its own months. */
  allPurchases: Row[];
  /** Expenses dated in the year. */
  expenses: Row[];
  /** Monthly sales and profit targets; only the year's are read. */
  targets: Row[];
  /** Profit withdrawals dated in the year. */
  withdrawals: Row[];
  /** Other income dated in the year. */
  otherIncomes: Row[];
  products: Row[];
  purchaseTargets: Row[];
};

const num = (value: unknown) => Number(value || 0);
const pct = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);
const monthOf = (date: unknown) => Number(String(date || '').slice(5, 7));
const sum = (rows: Row[], read: (row: Row) => number) => rows.reduce((total, row) => total + read(row), 0);

const profitInputs = (row: Pick<MonthRow, 'totalProfit' | 'purchaseIncentive' | 'otherIncome' | 'expenses'>): ProfitInputs => ({
  grossProfit: row.totalProfit,
  purchaseIncentive: row.purchaseIncentive,
  otherIncome: row.otherIncome,
  expenses: row.expenses,
});

export function buildYearlyReport(input: YearlyInputs): YearlyReport {
  const { year, sales, purchases, expenses, withdrawals, otherIncomes } = input;
  const targets = input.targets.filter((target) => Number(target.year) === year);

  const months = Array.from({ length: 12 }, (_, i): MonthRow => {
    const month = i + 1;
    const inMonth = (row: Row) => monthOf(row.date) === month;
    const monthSales = sales.filter(inMonth);
    const monthPurchases = purchases.filter(inMonth);
    const monthTarget = targets.find((target) => Number(target.month) === month);
    // A withdrawal belongs to the month whose profit it took, when it says so.
    const monthWithdrawals = withdrawals.filter((withdrawal) => {
      const profitYear = num(withdrawal.profit_year);
      const profitMonth = num(withdrawal.profit_month);
      if (profitYear === year && profitMonth > 0) return profitMonth === month;
      return inMonth(withdrawal);
    });

    const salesAmount = sum(monthSales, (sale) => firstAmount(sale.subtotal, sale.net_amount));
    const discount = sum(monthSales, (sale) => num(sale.discount_amount));
    const totalProfit = sum(monthSales, (sale) =>
      sum(sale.sale_items || [], (item) => {
        const costPrice = num(item.cost_price);
        return costPrice <= 0 ? 0 : (num(item.actual_price) - costPrice) * num(item.qty);
      }),
    );
    const lines = monthPurchases.flatMap((purchase) => purchase.purchase_items || []);
    const purchaseIncentive = sum(lines, (item) => num(item.sp_amount));
    const row = {
      totalProfit,
      purchaseIncentive,
      otherIncome: sum(otherIncomes.filter(inMonth), (income) => num(income.amount)),
      expenses: sum(expenses.filter(inMonth), (expense) => num(expense.amount)),
    };
    const profitWithdraw = sum(monthWithdrawals, (withdrawal) => num(withdrawal.amount));

    return {
      month,
      salesGoal: num(monthTarget?.sales_target),
      profitGoal: num(monthTarget?.profit_target),
      salesAmount,
      discount,
      actualSales: salesAmount - discount,
      purchaseOrderValue: sum(monthPurchases, (purchase) => firstAmount(purchase.net_amount, purchase.total_amount)),
      purchaseDeposit: sum(lines, (item) => Math.max(0, num(item.total_amount) - num(item.sp_amount))),
      purchaseQty: sum(lines, (item) => num(item.qty)),
      ...row,
      earnings: businessEarnings(profitInputs(row)),
      profitLoss: profitLoss(profitInputs(row)),
      profitWithdraw,
      availableProfit: availableProfit(profitInputs(row), profitWithdraw),
    };
  });

  const total = (key: keyof MonthRow) => sum(months, (row) => row[key]);
  const totals = {
    salesGoal: total('salesGoal'),
    profitGoal: total('profitGoal'),
    totalSales: total('salesAmount'),
    actualSales: total('actualSales'),
    totalProfit: total('totalProfit'),
    profitLoss: total('profitLoss'),
    totalPurchases: total('purchaseOrderValue'),
    purchaseIncentive: total('purchaseIncentive'),
    purchaseDeposit: total('purchaseDeposit'),
    totalOtherIncome: total('otherIncome'),
    totalExpenses: total('expenses'),
    profitWithdraw: total('profitWithdraw'),
    availableProfit: total('availableProfit'),
    purchaseQty: total('purchaseQty'),
  };
  const yearInputs: ProfitInputs = {
    grossProfit: totals.totalProfit,
    purchaseIncentive: totals.purchaseIncentive,
    otherIncome: totals.totalOtherIncome,
    expenses: totals.totalExpenses,
  };
  const summary: YearSummary = { ...totals, profitMargin: profitMargin(yearInputs, totals.actualSales) };
  const profitAchieved = businessEarnings(yearInputs);

  // Company ways: purchases by their supplier, sales traced through the product to its company.
  const productCompany = productCompanies(input.products);
  const companyMap: Record<string, CompanyWayRow> = {};
  for (const purchase of purchases) {
    const company = companyName(purchase.supplier_name);
    const current = (companyMap[company] ??= { company, purchase: 0, sales: 0 });
    const items: Row[] = purchase.purchase_items || [];
    current.purchase += items.length ? sum(items, (item) => firstAmount(item.total_amount)) : firstAmount(purchase.total_amount, purchase.net_amount);
  }
  for (const sale of sales) {
    for (const item of sale.sale_items || []) {
      const company = companyName(productCompany.get(item.product_id) || productCompany.get(item.product_code));
      const current = (companyMap[company] ??= { company, purchase: 0, sales: 0 });
      // The discounted amount actually billed, as the Summary's company rows count it.
      current.sales += saleItemAmount(item, num(item.qty));
    }
  }
  const companyWayRows = Object.values(companyMap).sort((a, b) => b.purchase + b.sales - (a.purchase + a.sales));

  // Buying targets that touch the year, each taken whole across its own months:
  // one running Nov to Feb is one target, not two halves with a false shortfall.
  const bought = boughtBySupplier(input.allPurchases);
  const purchaseTargetRows = input.purchaseTargets
    .filter((target) => Number(target.start_year) <= year && Number(target.end_year) >= year)
    .map((target): YearTargetRow => {
      const supplier = Array.isArray(target.supplier) ? target.supplier[0] : target.supplier;
      const done = targetCompletion(
        {
          start_year: Number(target.start_year),
          start_month: Number(target.start_month),
          end_year: Number(target.end_year),
          end_month: Number(target.end_month),
          total_amount: num(target.total_amount),
        },
        bought[target.supplier_id] || {},
      );
      return { company: companyName(supplier?.company_name || supplier?.name), target: num(target.total_amount), achieved: done.achieved, remaining: done.remaining };
    })
    .sort((a, b) => b.target - a.target);
  const purchaseTargetTotals = purchaseTargetRows.reduce(
    (acc, row) => ({ target: acc.target + row.target, achieved: acc.achieved + row.achieved, remaining: acc.remaining + row.remaining }),
    { target: 0, achieved: 0, remaining: 0 },
  );

  return {
    months,
    summary,
    profitAchieved,
    salesPct: pct(summary.actualSales, summary.salesGoal),
    profitPct: pct(profitAchieved, summary.profitGoal),
    expensePct: pct(summary.totalExpenses, summary.actualSales),
    hasYearData: months.some((row) => row.actualSales || row.purchaseOrderValue || row.expenses || row.totalProfit || row.otherIncome),
    bestMonth: months.reduce<MonthRow | null>((best, row) => (best === null || row.profitLoss > best.profitLoss ? row : best), null),
    companyWayRows,
    purchaseTargetRows,
    purchaseTargetTotals,
  };
}
