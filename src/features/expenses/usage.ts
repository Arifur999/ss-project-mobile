import { Amber, Green, Red } from '@/constants/theme';

/**
 * How full a budget meter is drawn: nothing when nothing is spent, otherwise
 * at least a sliver, never past the end - the design's bar().
 */
export const usageWidth = (percent: number, spent: number) => (spent > 0 ? Math.min(100, Math.max(percent, 1.2)) : 0);

/** Green under 80%, amber from 80%, red over budget; lighter shades on the dark card. */
export function usageColor(percent: number, onDark: boolean) {
  if (percent > 100) return onDark ? Red[400] : Red[600];
  if (percent >= 80) return onDark ? Amber[400] : Amber[600];
  return onDark ? Green[400] : Green[600];
}
