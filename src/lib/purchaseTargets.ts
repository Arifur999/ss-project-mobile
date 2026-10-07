import { roundTaka } from './money';
import { monthKey } from './purchaseRollingTarget';

// A buying target's months and what was bought against it, lifted from
// Hatim/src/pages/reports/PurchaseTarget.tsx (monthsInRange, perMonthAmount
// and the bought-per-supplier map its load builds) - the Report Summary
// builds the same map.

type Row = Record<string, any>;

/** The months a target covers, both ends counted: January to January is one. */
export function monthsInRange(target: { start_year: number; start_month: number; end_year: number; end_month: number }) {
  const start = Number(target.start_year) * 12 + Number(target.start_month);
  const end = Number(target.end_year) * 12 + Number(target.end_month);
  return Math.max(0, end - start + 1);
}

export function perMonthAmount(total: number, months: number) {
  return months > 0 ? Number(total || 0) / months : 0;
}

/** What was bought from each supplier each month - its lines' totals, else the purchase's own. */
export function boughtBySupplier(purchases: Row[]): Record<string, Record<string, number>> {
  const bought: Record<string, Record<string, number>> = {};
  for (const purchase of purchases) {
    if (!purchase.supplier_id || !purchase.date) continue;
    const when = new Date(`${String(purchase.date).slice(0, 10)}T12:00:00`);
    const key = monthKey(when.getFullYear(), when.getMonth() + 1);
    const lines = (purchase.purchase_items || []).reduce((sum: number, item: Row) => sum + roundTaka(item.total_amount), 0);
    const value = lines || roundTaka(purchase.total_amount || purchase.net_amount);
    const perSupplier = (bought[purchase.supplier_id] ??= {});
    perSupplier[key] = (perSupplier[key] || 0) + value;
  }
  return bought;
}
