import { outstandingQty } from './damageRules';

// The figures the website's damage pages work out (Hatim/src/pages/damage):
// what broke and what it cost, what is still out, and the money either side.

type Item = { qty: number; received_qty: number; total_cost: number | string; product_name: string; product_code?: string };
type Entry<I extends Item = Item> = { doc_no: string; supplier_name: string; damage_items: I[] };
type Money = { direction: 'out' | 'in'; amount: number; account_id: string | null };

/** One entry's pieces, value off the shelf (at FIFO cost) and pieces not yet back. */
export function entryTotals(entry: Entry) {
  let qty = 0;
  let value = 0;
  let outstanding = 0;
  for (const item of entry.damage_items) {
    qty += Number(item.qty || 0);
    value += Number(item.total_cost || 0);
    outstanding += outstandingQty(item);
  }
  return { qty, value, outstanding };
}

/** The dashboard's three counts over a set of entries. */
export function damageStats(entries: Entry[]) {
  return entries.reduce(
    (sum, entry) => {
      const t = entryTotals(entry);
      return { pieces: sum.pieces + t.qty, valueOut: sum.valueOut + t.value, stillOut: sum.stillOut + t.outstanding };
    },
    { pieces: 0, valueOut: 0, stillOut: 0 },
  );
}

/**
 * The money: repairs paid out (an expense with an account), written off (an
 * expense with none - no cash left the till), recovered (refunds). Net cost
 * is the first two less the third.
 */
export function damageMoney(rows: Money[]) {
  let paidOut = 0;
  let writtenOff = 0;
  let cameIn = 0;
  for (const row of rows) {
    if (row.direction === 'in') cameIn += row.amount;
    else if (row.account_id) paidOut += row.amount;
    else writtenOff += row.amount;
  }
  return { paidOut, writtenOff, cameIn, net: paidOut + writtenOff - cameIn };
}

/** One row per line still owing something - an entry can have three products of which one is back. */
export function pendingLines<E extends Entry>(entries: E[]) {
  const rows: { entry: E; item: E['damage_items'][number]; outstanding: number }[] = [];
  for (const entry of entries) {
    for (const item of entry.damage_items) {
      const outstanding = outstandingQty(item);
      if (outstanding > 0) rows.push({ entry, item, outstanding });
    }
  }
  return rows;
}
