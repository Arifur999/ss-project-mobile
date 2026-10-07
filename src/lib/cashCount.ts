// Counting the drawer at day end, as Hatim/src/components/CashCounter.tsx
// counts it: Bangladeshi notes largest first, Tk 1,000 down to Tk 5 (the two
// and the one are coins nobody counts one by one), how many of each and what
// that comes to. A blank box is untouched; a typed 0 is a deliberate none.

export const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5] as const;

/** Notes counted, by denomination; a missing one was never typed. */
export type Counts = Partial<Record<number, number>>;

export type CashDraft = { countedBy: string; date: string; counts: Counts };

export function cashRows(counts: Counts) {
  return DENOMINATIONS.map((value) => {
    const qty = Math.max(0, Math.floor(Number(counts[value] || 0)));
    return { value, qty, amount: value * qty };
  });
}

export function cashTotals(counts: Counts) {
  const rows = cashRows(counts);
  return { notes: rows.reduce((s, r) => s + r.qty, 0), amount: rows.reduce((s, r) => s + r.amount, 0) };
}

/** A box typed into: '' clears that note, anything else is a whole count of none or more. */
export function withCount(counts: Counts, value: number, typed: number | null): Counts {
  const next = { ...counts };
  if (typed === null) delete next[value];
  else next[value] = Math.max(0, Math.floor(typed));
  return next;
}
