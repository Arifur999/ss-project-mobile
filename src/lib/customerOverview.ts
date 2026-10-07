import type { CustomerDashboardRow } from './customerDue';
import { matches } from './search';

// The Customer Dashboard's list, lifted from Hatim/src/pages/customers/
// CustomerDashboard.tsx (displayed): searched by name, phone or address,
// filtered to who owes or who is clear, and sorted five ways.

export type DueFilter = 'all' | 'due' | 'clear';
export type CustomerSort = 'due_desc' | 'due_asc' | 'purchase_desc' | 'collections_desc' | 'name_asc';

export const DUE_FILTERS: DueFilter[] = ['all', 'due', 'clear'];
export const CUSTOMER_SORTS: CustomerSort[] = ['due_desc', 'due_asc', 'purchase_desc', 'collections_desc', 'name_asc'];

const COMPARE: Record<CustomerSort, (a: CustomerDashboardRow, b: CustomerDashboardRow) => number> = {
  due_desc: (a, b) => Number(b.currentDue) - Number(a.currentDue),
  due_asc: (a, b) => Number(a.currentDue) - Number(b.currentDue),
  purchase_desc: (a, b) => Number(b.totalPurchase) - Number(a.totalPurchase),
  collections_desc: (a, b) => Number(b.collectionsAmount) - Number(a.collectionsAmount),
  name_asc: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
};

export function customerRows(list: CustomerDashboardRow[], search: string, due: DueFilter, sort: CustomerSort): CustomerDashboardRow[] {
  return list
    .filter(
      (c) =>
        matches(search, c.name, c.phone, c.address) &&
        (due === 'all' || (due === 'due' && Number(c.currentDue) > 0) || (due === 'clear' && Number(c.currentDue) <= 0)),
    )
    .sort(COMPARE[sort]);
}
