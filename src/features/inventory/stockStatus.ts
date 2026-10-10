import { Green, Red, Zinc } from '@/constants/theme';
import type { Lang } from '@/context/LanguageContext';
import type { INVENTORY_COPY } from '@/features/inventory/copy';
import { formatNumber } from '@/lib/money';
import type { StockRow } from '@/services/inventory.services';

export type StockStatus = 'available' | 'upcoming' | 'out_of_stock';

/**
 * Copied from Hatim/src/pages/Inventory.tsx getStatus - and it has to agree
 * with the server's status filter, or filtering by one status would list rows
 * wearing another's badge: nothing on hand but some on the way is Upcoming.
 */
export function stockStatus(row: Pick<StockRow, 'available_qty' | 'upcoming_qty'>): StockStatus {
  if (Number(row.available_qty || 0) <= 0 && Number(row.upcoming_qty || 0) > 0) return 'upcoming';
  if (Number(row.available_qty || 0) <= 0) return 'out_of_stock';
  return 'available';
}

/**
 * The badge's words. An Upcoming one says how many are on the way - beside
 * the quantity on hand, which for such a product is nil or below, a bare
 * "Upcoming" read as if that number were the one coming.
 */
export function statusText(
  row: Pick<StockRow, 'available_qty' | 'upcoming_qty'>,
  t: (typeof INVENTORY_COPY)['en'],
  lang: Lang,
): string {
  const status = stockStatus(row);
  return status === 'upcoming' ? t.upcomingCount(formatNumber(row.upcoming_qty, lang)) : t.statuses[status];
}

/** The website's badges: green, grey, red. */
export const STATUS_LOOK: Record<StockStatus, { bg: string; ink: string }> = {
  available: { bg: Green[100], ink: Green[800] },
  upcoming: { bg: Zinc[100], ink: Zinc[700] },
  out_of_stock: { bg: Red[100], ink: Red[800] },
};
