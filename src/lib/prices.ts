import { roundTaka } from './money';

/**
 * A price after its percentage discount: the DP after the DP discount, the MRP
 * after the MRP discount. Copied verbatim from Hatim/src/lib/purchaseAmounts.ts
 * actualDp (the server's shared/money.ts agrees): round the price first, then
 * subtract - multiplying before dividing keeps 1050 - 7% at exactly 976.5,
 * which rounds up to 977. Re-copy rather than edit.
 */
export function actualDp(dpPrice: unknown, discountPct: unknown): number {
  const dp = roundTaka(dpPrice);
  const pct = Number(discountPct) || 0;
  return roundTaka(dp - (dp * pct) / 100);
}
