// The damage rules, copied from Hatim/src/pages/damage/damageRules.ts (whose
// server twin is hatim_Backend/src/app/shared/damageStatus.ts). The form greys
// a field out before the request is sent; the server refuses it whatever the
// form did - so all three must agree. Re-copy rather than edit. The labels
// live in the screens' copy, in both languages.

export type DamageSource = 'own_stock' | 'supplier';
export type DamageAction = 'repair' | 'return' | 'exchange';
export type DamageStatus = 'pending' | 'partial' | 'completed';
export type DamageReceiveResult = 'repaired' | 'replaced' | 'scrapped';

/**
 * Whether this entry has to name a supplier. Goods that ARRIVED broken came
 * from somebody, and goods being returned or exchanged go back to somebody.
 * Only own-stock repair is free of it: a chair broken in the showroom usually
 * goes to a local carpenter who is not a supplier at all.
 */
export function needsSupplier(source: DamageSource, action: DamageAction): boolean {
  return source === 'supplier' || action === 'return' || action === 'exchange';
}

/** Repaired and replaced come back to the shelf; scrapped is gone for good. */
export function returnsStock(result: DamageReceiveResult): boolean {
  return result === 'repaired' || result === 'replaced';
}

/** What is still to come back on a line. */
export function outstandingQty(item: { qty: number; received_qty: number }): number {
  return Math.max(0, Number(item.qty || 0) - Number(item.received_qty || 0));
}
