import { saleProfit } from './dashboard';

// Each shareholder's capital and share of profit. Lifted line for line from
// Hatim/src/pages/transactions/ShareholderDashboard.tsx so the app's figures
// are the website's: every month's business profit (sales profit + other income
// - expenses) is split by each shareholder's capital at that month's end.

type Row = Record<string, any>;

export type ShareholderPeriod = { from: string; to: string; mode: 'month' | 'year' | 'custom' };

export type ShareholderRow = {
  id: string;
  name: string;
  opening: number;
  periodInvested: number;
  periodWithdrawn: number;
  periodProfitShare: number;
  periodProfitWithdrawn: number;
  retainedProfit: number;
  netCapital: number;
  sharePct: number;
};

const num = (v: unknown) => Number(v || 0) || 0;
const monthKey = (date: unknown) => String(date || '').slice(0, 7);
const inRange = (date: unknown, from: string, to: string) => {
  const day = String(date || '').slice(0, 10);
  return Boolean(day) && day >= from && day <= to;
};

/** Older rows carry only the name; they are still that shareholder's money. */
export const belongsTo = (record: Row, shareholder: Row) =>
  record.shareholder_id === shareholder.id || (!record.shareholder_id && record.shareholder_name === shareholder.name);

function monthOverlaps(key: string, from: string, to: string) {
  if (!key) return false;
  const [y, m] = key.split('-').map(Number);
  const end = `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
  return `${key}-01` <= to && end >= from;
}

/** The month a profit withdrawal pays out for: its profit_month/year, else its date. */
export function profitMonthKey(record: Row) {
  const month = num(record.profit_month);
  const year = num(record.profit_year);
  return year && month ? `${year}-${String(month).padStart(2, '0')}` : monthKey(record.date);
}

export function computeShareholderRows(
  input: { shareholders: Row[]; investments: Row[]; profitWithdrawals: Row[]; sales: Row[]; expenses: Row[]; otherIncomes: Row[] },
  period: ShareholderPeriod,
): ShareholderRow[] {
  const { shareholders, investments, profitWithdrawals } = input;
  const allProfit = new Map<string, number>();
  const periodProfit = new Map<string, number>();
  const addProfit = (date: unknown, amount: number) => {
    const key = monthKey(date);
    allProfit.set(key, (allProfit.get(key) || 0) + amount);
    if (inRange(date, period.from, period.to)) periodProfit.set(key, (periodProfit.get(key) || 0) + amount);
  };
  input.sales.filter((s) => s.status === undefined || s.status === 'completed').forEach((s) => addProfit(s.date, saleProfit(s)));
  input.expenses.forEach((e) => addProfit(e.date, -num(e.amount)));
  input.otherIncomes.forEach((o) => addProfit(o.date, num(o.amount)));

  const months = [...allProfit.keys()].sort();
  const capitalAt = (shareholder: Row, key: string) =>
    num(shareholder.opening_amount) +
    investments
      .filter((r) => belongsTo(r, shareholder) && monthKey(r.date) <= key)
      .reduce((sum, r) => sum + num(r.invest_amount) - num(r.withdraw_amount), 0);
  const totalAt = (key: string) => shareholders.reduce((sum, sh) => sum + capitalAt(sh, key), 0);
  const shareOf = (shareholder: Row, entries: Iterable<[string, number]>) => {
    let sum = 0;
    for (const [key, profit] of entries) {
      const total = totalAt(key);
      if (total > 0) sum += profit * (capitalAt(shareholder, key) / total);
    }
    return sum;
  };

  const rows = shareholders.map((sh) => {
    const own = investments.filter((r) => belongsTo(r, sh));
    const ownProfits = profitWithdrawals.filter((r) => belongsTo(r, sh));
    const inPeriod = own.filter((r) => inRange(r.date, period.from, period.to));
    const profitsInPeriod = ownProfits.filter((r) =>
      period.mode === 'custom' ? inRange(r.date, period.from, period.to) : monthOverlaps(profitMonthKey(r), period.from, period.to),
    );
    const opening = num(sh.opening_amount);
    return {
      id: String(sh.id),
      name: String(sh.name || ''),
      opening,
      periodInvested: inPeriod.reduce((s, r) => s + num(r.invest_amount), 0),
      periodWithdrawn: inPeriod.reduce((s, r) => s + num(r.withdraw_amount), 0),
      periodProfitShare: shareOf(sh, periodProfit.entries()),
      periodProfitWithdrawn: profitsInPeriod.reduce((s, r) => s + num(r.amount), 0),
      retainedProfit: shareOf(sh, months.map((k) => [k, allProfit.get(k) || 0] as [string, number])) - ownProfits.reduce((s, r) => s + num(r.amount), 0),
      netCapital: opening + own.reduce((s, r) => s + num(r.invest_amount), 0) - own.reduce((s, r) => s + num(r.withdraw_amount), 0),
      sharePct: 0,
    };
  });

  const totalCapital = rows.reduce((s, r) => s + r.netCapital, 0);
  return rows.map((r) => ({ ...r, sharePct: totalCapital > 0 ? (r.netCapital / totalCapital) * 100 : 0 }));
}

/**
 * What a shareholder has put in: opening amount plus everything invested
 * since, less everything withdrawn - Hatim/src/lib/shareholderCapital.ts.
 */
export function totalInvestment(investments: Row[], shareholder: Row): number {
  return (
    num(shareholder.opening_amount) +
    investments.filter((r) => belongsTo(r, shareholder)).reduce((s, r) => s + num(r.invest_amount) - num(r.withdraw_amount), 0)
  );
}
