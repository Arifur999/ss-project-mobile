import { firstAmount, roundTaka, saleItemAmount } from './money';
import { profitLoss as profitLossOf } from './profit';
import { purchaseItemDeposit } from './purchaseAmounts';
import { purchaseProgressForMonth } from './purchaseRollingTarget';
import { boughtBySupplier } from './purchaseTargets';
import { calculateRollingTargets, getDaysInMonth } from './rollingTarget';

// The Report Summary's figures, lifted from Hatim/src/pages/reports/
// ReportSummary.tsx (loadReport) so the app's report is the website's: sales,
// cost and profit by product, purchases, expenses, supplier payments, other
// income, the company-ways rows, each supplier's buying target for the month,
// profit and loss, and the daily performance series with the owner's rolling
// target. The rows come in already fetched; this decides what they add up to.
//
// One departure: a product's company is read from `supplier`, the relation
// GET /products actually returns. The website reads `suppliers`, which the API
// never sends, so its company-ways sales all land under "Unassigned".

type Row = Record<string, any>;

export type BreakdownRow = {
  name: string;
  type?: string;
  qty?: number;
  count?: number;
  amount: number;
  cost?: number;
  profit?: number;
  incentive?: number;
  actualPurchase?: number;
  paid?: number;
  owed?: number;
  due?: number;
  percent?: number;
};

export type MonthlyPurchaseRow = { company: string; target: number; achieved: number; extra: number; nextMonthTarget: number };
export type CompanyWayRow = { company: string; purchase: number; sales: number };
export type DailyPerformanceRow = {
  date: string;
  target: number;
  sales: number;
  profit: number;
  expense: number;
  remainingTarget: number;
  nextTarget: number | null;
};

export type ReportData = {
  salesTarget: number;
  profitTarget: number;
  totalSales: number;
  salesCost: number;
  grossProfit: number;
  uncostedSales: number;
  purchaseValue: number;
  purchaseIncentive: number;
  purchaseDeposit: number;
  purchaseQty: number;
  totalExpenses: number;
  totalOtherIncome: number;
  supplierPayments: number;
  profitWithdraw: number;
  profitLoss: number;
  availableProfit: number;
  salesBreakdown: BreakdownRow[];
  purchaseBreakdown: BreakdownRow[];
  expenseBreakdown: BreakdownRow[];
  supplierPaymentBreakdown: BreakdownRow[];
  otherIncomeBreakdown: BreakdownRow[];
  companyWayRows: CompanyWayRow[];
  monthlyPurchaseRows: MonthlyPurchaseRow[];
  monthlyPurchaseMonth: string;
  dailyPerformance: DailyPerformanceRow[];
};

export type ReportInputs = {
  /** Inclusive YYYY-MM-DD bounds; both '' for all time. */
  range: { start: string; end: string };
  /** YYYY-MM-DD. */
  today: string;
  /** Completed sales in the range. */
  sales: Row[];
  /** Completed sales over every whole month the range touches - the rolling target reads the full month. */
  targetSales: Row[];
  purchases: Row[];
  /** Every purchase ever: a buying target rolls on from its first month. */
  allPurchases: Row[];
  expenses: Row[];
  supplierPayments: Row[];
  withdrawals: Row[];
  otherIncomes: Row[];
  /** Monthly sales and profit targets. */
  targets: Row[];
  products: Row[];
  purchaseTargets: Row[];
};

const amount = (value: unknown) => roundTaka(value);
const pct = (value: number, target: number) => (target > 0 ? (value / target) * 100 : 0);
const companyName = (value: string | null | undefined) => String(value || '').trim() || 'Unassigned';

function isoDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function monthRange(year: number, month: number) {
  return { start: `${year}-${String(month).padStart(2, '0')}-01`, end: isoDate(new Date(year, month, 0)) };
}

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart <= bEnd && bStart <= aEnd;

/** Which days of a month are settled and which one is still running, relative to `today`. */
function monthProgress(year: number, month: number, today: string) {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const current = today.slice(0, 7);
  if (key < current) return { completedThroughDay: getDaysInMonth(year, month), inProgressDay: 0 };
  if (key > current) return { completedThroughDay: 0, inProgressDay: 0 };
  const day = Number(today.slice(8, 10));
  return { completedThroughDay: day - 1, inProgressDay: day };
}

const nextDateOf = (key: string) => {
  const step = new Date(`${key}T12:00:00`);
  step.setDate(step.getDate() + 1);
  return isoDate(step);
};

export function buildReport(input: ReportInputs): ReportData {
  const { range, today, sales, purchases, expenses, supplierPayments, withdrawals, otherIncomes, targets } = input;
  const bounded = !!(range.start && range.end);

  // Targets whose month touches the range; every one over all time.
  const activeTargets = !bounded
    ? targets
    : targets.filter((target) => {
        const year = Number(target.year || 0);
        const month = Number(target.month || 0);
        if (!year || !month) return false;
        const r = monthRange(year, month);
        return overlaps(r.start, r.end, range.start, range.end);
      });
  const salesTarget = activeTargets.reduce((sum, t) => sum + amount(t.sales_target), 0);
  const profitTarget = activeTargets.reduce((sum, t) => sum + amount(t.profit_target), 0);

  // Sales and profit by product. A line without a cost earns nothing, and is counted as uncosted.
  const totalSales = sales.reduce((sum, sale) => sum + firstAmount(sale.net_amount, sale.subtotal), 0);
  const saleProductMap: Record<string, BreakdownRow> = {};
  let uncostedSales = 0;
  for (const sale of sales) {
    for (const item of sale.sale_items || []) {
      const name = item.product_name || 'Unknown Product';
      const qty = amount(item.qty);
      const saleAmount = saleItemAmount(item, qty);
      const unitCost = amount(item.cost_price);
      const cost = unitCost > 0 ? unitCost * qty : 0;
      const profit = unitCost > 0 ? saleAmount - cost : 0;
      if (unitCost <= 0) uncostedSales += saleAmount;
      const current = saleProductMap[name] || { name, qty: 0, amount: 0, cost: 0, profit: 0 };
      current.qty = amount(current.qty) + qty;
      current.amount += saleAmount;
      current.cost = amount(current.cost) + cost;
      current.profit = amount(current.profit) + profit;
      saleProductMap[name] = current;
    }
  }
  const salesCost = Object.values(saleProductMap).reduce((sum, row) => sum + amount(row.cost), 0);
  const grossProfit = Object.values(saleProductMap).reduce((sum, row) => sum + amount(row.profit), 0);
  const salesBreakdown = Object.values(saleProductMap)
    .map((row) => ({ ...row, percent: pct(row.amount, totalSales) }))
    .sort((a, b) => amount(b.profit) - amount(a.profit));

  // Purchases by product, with the SP incentive taken off.
  const purchaseProductMap: Record<string, BreakdownRow> = {};
  for (const purchase of purchases) {
    for (const item of purchase.purchase_items || []) {
      const name = item.product_name || 'Unknown Product';
      const qty = amount(item.qty);
      const rowAmount = amount(item.total_amount);
      const incentive = amount(item.sp_amount);
      const current = purchaseProductMap[name] || { name, qty: 0, amount: 0, incentive: 0, actualPurchase: 0 };
      current.qty = amount(current.qty) + qty;
      current.amount += rowAmount;
      current.incentive = amount(current.incentive) + incentive;
      current.actualPurchase = amount(current.actualPurchase) + Math.max(0, rowAmount - incentive);
      purchaseProductMap[name] = current;
    }
  }
  const purchaseValue =
    purchases.reduce((sum, p) => sum + firstAmount(p.net_amount, p.total_amount), 0) ||
    Object.values(purchaseProductMap).reduce((sum, row) => sum + row.amount, 0);
  const purchaseIncentive = Object.values(purchaseProductMap).reduce((sum, row) => sum + amount(row.incentive), 0);
  const purchaseQty = Object.values(purchaseProductMap).reduce((sum, row) => sum + amount(row.qty), 0);
  const purchaseBreakdown = Object.values(purchaseProductMap)
    .map((row) => ({ ...row, percent: pct(row.amount, purchaseValue) }))
    .sort((a, b) => b.amount - a.amount);

  // Expenses by category.
  const totalExpenses = expenses.reduce((sum, e) => sum + amount(e.amount), 0);
  const expenseMap: Record<string, BreakdownRow> = {};
  for (const expense of expenses) {
    const name = expense.category_name || 'Uncategorized';
    const current = expenseMap[name] || { name, amount: 0, count: 0 };
    current.amount += amount(expense.amount);
    current.count = amount(current.count) + 1;
    expenseMap[name] = current;
  }
  const expenseBreakdown = Object.values(expenseMap)
    .map((row) => ({ ...row, percent: pct(row.amount, totalExpenses) }))
    .sort((a, b) => b.amount - a.amount);

  // What each supplier was owed for these purchases (less SP) and was paid.
  const supplierMap: Record<string, BreakdownRow> = {};
  for (const purchase of purchases) {
    const key = purchase.supplier_id || purchase.supplier_name || 'Unknown Supplier';
    const items: Row[] = purchase.purchase_items || [];
    const current = supplierMap[key] || { name: purchase.supplier_name || 'Unknown Supplier', qty: 0, amount: 0, owed: 0, paid: 0, due: 0 };
    current.qty = amount(current.qty) + items.reduce((sum, item) => sum + amount(item.qty), 0);
    current.amount += firstAmount(purchase.net_amount, purchase.total_amount);
    current.owed = amount(current.owed) + items.reduce((sum, item) => sum + purchaseItemDeposit(item), 0);
    supplierMap[key] = current;
  }
  for (const payment of supplierPayments) {
    const key = payment.supplier_id || payment.supplier_name || 'Unknown Supplier';
    const current = supplierMap[key] || { name: payment.supplier_name || 'Unknown Supplier', qty: 0, amount: 0, paid: 0, due: 0 };
    current.paid = amount(current.paid) + amount(payment.amount);
    supplierMap[key] = current;
  }
  const supplierPaymentsTotal = supplierPayments.reduce((sum, p) => sum + amount(p.amount), 0);
  const supplierPaymentBreakdown = Object.values(supplierMap)
    .map((row) => ({ ...row, due: amount(row.owed) - amount(row.paid), percent: pct(row.amount, purchaseValue) }))
    .sort((a, b) => b.amount - a.amount);

  // Other income by where it came from.
  const totalOtherIncome = otherIncomes.reduce((sum, i) => sum + amount(i.amount), 0);
  const otherIncomeMap: Record<string, BreakdownRow> = {};
  for (const income of otherIncomes) {
    const type = income.income_type === 'supplier' ? 'Supplier' : 'Other';
    const name = income.income_type === 'supplier' ? income.supplier_name || 'Unknown Supplier' : income.source_name || 'Other Source';
    const key = `${type}-${name}`;
    const current = otherIncomeMap[key] || { name, type, amount: 0, count: 0 };
    current.amount += amount(income.amount);
    current.count = amount(current.count) + 1;
    otherIncomeMap[key] = current;
  }
  const otherIncomeBreakdown = Object.values(otherIncomeMap)
    .map((row) => ({ ...row, percent: pct(row.amount, totalOtherIncome) }))
    .sort((a, b) => b.amount - a.amount);

  // Company ways: purchases by their supplier, sales traced through the product to its company.
  const productCompany = new Map<string, string>();
  for (const product of input.products) {
    const relation = product.supplier ?? product.suppliers;
    const supplier = Array.isArray(relation) ? relation[0] : relation;
    const name = companyName(supplier?.company_name || supplier?.name);
    if (product.id) productCompany.set(product.id, name);
    if (product.product_code) productCompany.set(product.product_code, name);
  }
  const companyMap: Record<string, CompanyWayRow> = {};
  for (const purchase of purchases) {
    const company = companyName(purchase.supplier_name);
    const current = companyMap[company] || { company, purchase: 0, sales: 0 };
    const itemTotal = (purchase.purchase_items || []).reduce((sum: number, item: Row) => sum + amount(item.total_amount), 0);
    current.purchase += itemTotal || amount(purchase.total_amount || purchase.net_amount);
    companyMap[company] = current;
  }
  for (const sale of sales) {
    for (const item of sale.sale_items || []) {
      const company = companyName(productCompany.get(item.product_id) || productCompany.get(item.product_code));
      const current = companyMap[company] || { company, purchase: 0, sales: 0 };
      current.sales += saleItemAmount(item, amount(item.qty));
      companyMap[company] = current;
    }
  }
  const companyWayRows = Object.values(companyMap).sort((a, b) => b.purchase + b.sales - (a.purchase + a.sales));

  // Each supplier's buying target for the month the range ends in (this one over all time).
  const reportMonthDate = new Date(`${range.end || today}T12:00:00`);
  const reportYear = reportMonthDate.getFullYear();
  const reportMonth = reportMonthDate.getMonth() + 1;
  const bought = boughtBySupplier(input.allPurchases);
  const monthlyPurchaseRows = input.purchaseTargets
    .map((target): MonthlyPurchaseRow | null => {
      const progress = purchaseProgressForMonth(
        {
          start_year: Number(target.start_year),
          start_month: Number(target.start_month),
          end_year: Number(target.end_year),
          end_month: Number(target.end_month),
          total_amount: amount(target.total_amount),
        },
        bought[target.supplier_id] || {},
        reportYear,
        reportMonth,
      );
      if (!progress.inRange) return null;
      const supplier = Array.isArray(target.supplier) ? target.supplier[0] : target.supplier;
      return {
        company: companyName(supplier?.company_name || supplier?.name),
        target: progress.target,
        achieved: progress.achieved,
        extra: progress.extra,
        nextMonthTarget: progress.nextMonthTarget,
      };
    })
    .filter((row): row is MonthlyPurchaseRow => row !== null)
    .sort((a, b) => b.target - a.target);

  const profitWithdraw = withdrawals.reduce((sum, w) => sum + amount(w.amount), 0);
  const profitLoss = profitLossOf({ grossProfit, purchaseIncentive, otherIncome: totalOtherIncome, expenses: totalExpenses });

  // One bucket per day: sales, profit (other income counts as profit) and expense.
  const dailyMap: Record<string, { sales: number; profit: number; expense: number }> = {};
  const ensureDay = (key: string) => (dailyMap[key] ??= { sales: 0, profit: 0, expense: 0 });
  // Empty days are drawn only within bounds; over all time the days come from the data.
  for (let cursor = range.start, guard = 0; bounded && cursor <= range.end && guard < 400; cursor = nextDateOf(cursor), guard += 1) ensureDay(cursor);
  for (const sale of sales) {
    const key = String(sale.date || '').slice(0, 10);
    if (!key) continue;
    const bucket = ensureDay(key);
    bucket.sales += firstAmount(sale.net_amount, sale.subtotal);
    bucket.profit += (sale.sale_items || []).reduce((sum: number, item: Row) => {
      const qty = amount(item.qty);
      const unitCost = amount(item.cost_price);
      return unitCost <= 0 ? sum : sum + (saleItemAmount(item, qty) - unitCost * qty);
    }, 0);
  }
  for (const expense of expenses) {
    const key = String(expense.date || '').slice(0, 10);
    if (key) ensureDay(key).expense += amount(expense.amount);
  }
  for (const income of otherIncomes) {
    const key = String(income.date || '').slice(0, 10);
    if (key) ensureDay(key).profit += amount(income.amount);
  }
  const dailyKeys = Object.keys(dailyMap).sort();

  // The rolling target, run per whole month the chart touches.
  const salesByMonth: Record<string, Record<number, number>> = {};
  for (const sale of input.targetSales) {
    const saleDate = String(sale.date || '').slice(0, 10);
    const day = Number(saleDate.slice(8, 10));
    if (saleDate.length < 10 || !day) continue;
    const perDay = (salesByMonth[saleDate.slice(0, 7)] ??= {});
    perDay[day] = (perDay[day] || 0) + firstAmount(sale.net_amount, sale.subtotal);
  }
  const targetByMonth: Record<string, number> = {};
  for (const target of targets) {
    const year = Number(target.year || 0);
    const month = Number(target.month || 0);
    if (!year || month < 1 || month > 12) continue;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    targetByMonth[key] = (targetByMonth[key] || 0) + amount(target.sales_target);
  }
  const targetByDate: Record<string, number> = {};
  const remainingByDate: Record<string, number> = {};
  for (const key of new Set(dailyKeys.map((k) => k.slice(0, 7)))) {
    const year = Number(key.slice(0, 4));
    const month = Number(key.slice(5, 7));
    calculateRollingTargets({
      monthlyTarget: targetByMonth[key] || 0,
      year,
      month,
      dailySalesMap: salesByMonth[key] || {},
      ...monthProgress(year, month, today),
    }).dailyRecords.forEach((record) => {
      targetByDate[record.dateString] = record.openingTarget;
      remainingByDate[record.dateString] = record.remainingTargetAfterSales;
    });
  }
  const dailyPerformance = dailyKeys.map((key) => {
    const bucket = dailyMap[key];
    const next = nextDateOf(key);
    return {
      date: key,
      target: targetByDate[key] || 0,
      sales: bucket.sales,
      profit: bucket.profit,
      expense: bucket.expense,
      remainingTarget: remainingByDate[key] || 0,
      nextTarget: next in targetByDate ? targetByDate[next] : null,
    };
  });

  return {
    salesTarget,
    profitTarget,
    totalSales,
    salesCost,
    grossProfit,
    uncostedSales,
    purchaseValue,
    purchaseIncentive,
    purchaseDeposit: Math.max(0, purchaseValue - purchaseIncentive),
    purchaseQty,
    totalExpenses,
    totalOtherIncome,
    supplierPayments: supplierPaymentsTotal,
    profitWithdraw,
    profitLoss,
    availableProfit: profitLoss - profitWithdraw,
    salesBreakdown,
    purchaseBreakdown,
    expenseBreakdown,
    supplierPaymentBreakdown,
    otherIncomeBreakdown,
    companyWayRows,
    monthlyPurchaseRows,
    monthlyPurchaseMonth: `${reportYear}-${String(reportMonth).padStart(2, '0')}`,
    dailyPerformance,
  };
}

/** The whole months a range touches, which the rolling target needs; null over all time. */
export function targetSpan(range: { start: string; end: string }): { start: string; end: string } | null {
  if (!range.start || !range.end) return null;
  return {
    start: `${range.start.slice(0, 7)}-01`,
    end: isoDate(new Date(Number(range.end.slice(0, 4)), Number(range.end.slice(5, 7)), 0)),
  };
}
