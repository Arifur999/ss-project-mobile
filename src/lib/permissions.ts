import type { UserRole } from './account';

// What the signed-in user may do, so the app only offers actions the server
// will accept. This decides what to SHOW - the server still decides what is
// allowed, and refuses anything else with a 403.

/**
 * Whether a user holding `granted` may do `permission`. Copied verbatim from
 * Hatim/src/lib/permissions.ts hasPermission, which mirrors requirePermission on
 * the server: an owner always may, and an empty list means "everything the role
 * allows". Re-copy rather than edit.
 */
export function hasPermission(role: string | undefined, granted: string[] | undefined, permission: string): boolean {
  if (role === 'owner' || role === 'super_admin') return true;
  const list = granted ?? [];
  if (list.length === 0) return true;
  return list.includes(permission);
}

/**
 * The writes the app offers, each with the gate its route puts in front of it
 * (hatim_Backend .../<module>.route.ts): the roles checkAuth admits, then the
 * permission requirePermission asks for - any one of a list, as the middleware
 * reads one. Both have to pass.
 */
export const ACTIONS = {
  // product.route.ts: POST / and PATCH /:id
  'products.write': { roles: ['owner', 'manager'], permission: 'page:products.list' },
  // product.route.ts: POST /bulk-update-prices and /price-updates
  'products.updatePrice': { roles: ['owner', 'manager'], permission: 'page:products.update-price' },
  // product.route.ts: DELETE /:id
  'products.delete': { roles: ['owner', 'manager'], permission: 'act:products.delete' },
  // inventory.route.ts: POST /adjust
  'inventory.adjust': { roles: ['owner', 'manager'], permission: 'page:inventory.stock' },
  // damage.route.ts: POST /
  'damage.write': { roles: ['owner', 'manager'], permission: 'page:damage.entries' },
  // damage.route.ts: POST /:id/receive
  'damage.receive': { roles: ['owner', 'manager'], permission: 'page:damage.receive' },
  // damage.route.ts: POST /:id/transactions
  'damage.money': { roles: ['owner', 'manager'], permission: 'page:damage.transactions' },
  // damage.route.ts: DELETE /:id
  'damage.delete': { roles: ['owner', 'manager'], permission: 'act:damage.delete' },
  // supplier.route.ts: POST / and PATCH /:id
  'supplier.write': { roles: ['owner', 'manager'], permission: 'page:supplier.list' },
  // The website's Supplier Report page: whoever holds it reads the purchases it adds up
  'supplierReport.view': { roles: ['owner', 'manager', 'accountant', 'sales_staff'], permission: 'page:supplier.report' },
  // supplier.route.ts: DELETE /:id
  'supplier.delete': { roles: ['owner', 'manager'], permission: 'act:supplier.delete' },
  // supplierPayment.route.ts: POST / and PATCH /:id
  'supplierPayment.write': { roles: ['owner', 'manager'], permission: 'page:supplier.payments' },
  // supplierPayment.route.ts: DELETE /:id - the owner alone, no permission asked.
  'supplierPayment.delete': { roles: ['owner'], permission: 'page:supplier.payments' },
  // otherIncome.route.ts: POST / (an accountant may add)
  'otherIncome.create': { roles: ['owner', 'manager', 'accountant'], permission: 'page:supplier.other-income' },
  // otherIncome.route.ts: PATCH /:id
  'otherIncome.update': { roles: ['owner', 'manager'], permission: 'page:supplier.other-income' },
  // otherIncome.route.ts: DELETE /:id - the owner alone.
  'otherIncome.delete': { roles: ['owner'], permission: 'page:supplier.other-income' },
  // purchase.route.ts: POST /
  'purchase.create': { roles: ['owner', 'manager'], permission: 'page:purchase.orders' },
  // purchase.route.ts: PATCH /:id, PATCH /items/:itemId and POST /:id/items - taking a line off is purchase.delete's
  'purchase.edit': { roles: ['owner', 'manager'], permission: ['page:purchase.orders', 'page:purchase.drafts'] },
  // purchase.route.ts: POST /:id/receive and /:id/receive-all
  'purchase.receive': { roles: ['owner', 'manager'], permission: 'page:purchase.received' },
  // The website's Product History page (purchase history)
  'purchaseHistory.view': { roles: ['owner', 'manager', 'accountant', 'sales_staff'], permission: 'page:purchase.history' },
  // purchase.route.ts: DELETE /:id
  'purchase.delete': { roles: ['owner', 'manager'], permission: 'act:purchase.delete' },
  // customer.route.ts: POST / and PATCH /:id
  'customers.write': { roles: ['owner', 'manager', 'sales_staff'], permission: 'page:customers.list' },
  // customer.route.ts: DELETE /:id - refused while the customer has sales or payments
  'customers.delete': { roles: ['owner', 'manager'], permission: 'act:customers.delete' },
  // customerPayment.route.ts: POST /
  'customerPayment.create': { roles: ['owner', 'manager', 'sales_staff', 'accountant'], permission: 'page:customers.due-received' },
  // customerPayment.route.ts: PATCH /:id
  'customerPayment.edit': { roles: ['owner', 'manager'], permission: 'page:customers.due-received' },
  // customerPayment.route.ts: DELETE /:id
  'customerPayment.delete': { roles: ['owner', 'manager'], permission: 'act:customers.delete' },
  // expense.route.ts: POST / - a due discount is written as an expense
  'expense.create': { roles: ['owner', 'manager', 'accountant'], permission: 'page:expenses.transactions' },
  // sms.route.ts: POST /send - the owner's credits, no permission beyond the role
  'sms.send': { roles: ['owner'] },
  // sale.route.ts: POST /
  'sale.create': { roles: ['owner', 'manager', 'sales_staff'], permission: 'page:sales.new' },
  // sale.route.ts: PUT /:id - the server rolls the old lines' stock and FIFO cost back and writes the new ones
  'sale.edit': { roles: ['owner', 'manager', 'sales_staff'], permission: ['page:sales.ledger', 'page:sales.new'] },
  // draft.route.ts: POST, PATCH and DELETE / - no page permission, as publishing keeps its own gate
  'draft.write': { roles: ['owner', 'manager', 'sales_staff'] },
  // draft.service.ts: sales staff may park an invoice but not a purchase order
  'purchaseDraft.write': { roles: ['owner', 'manager'] },
  // The website's Draft Purchase page
  'purchaseDraft.list': { roles: ['owner', 'manager'], permission: 'page:purchase.drafts' },
  // The website's Draft Sales page: whoever may park one, holding its page
  'saleDraft.list': { roles: ['owner', 'manager', 'sales_staff'], permission: 'page:sales.drafts' },
  // sale.route.ts: POST /:id/deliveries
  'sale.deliver': { roles: ['owner', 'manager', 'sales_staff'], permission: ['page:sales.ledger', 'page:sales.new'] },
  // sale.route.ts: POST /items/:itemId/manual-cost - the server re-costs the line's stock at the rate
  'sale.cost': { roles: ['owner', 'manager', 'sales_staff'], permission: ['page:sales.ledger', 'page:sales.new'] },
  // sale.route.ts: DELETE /:id - the server puts the stock and its FIFO cost back
  'sale.delete': { roles: ['owner', 'manager'], permission: 'act:sales.delete' },
  // employee.route.ts: POST / and PATCH /:id - join, edit, resign
  'employee.write': { roles: ['owner', 'manager'], permission: 'page:employees.list' },
  // employee.route.ts: DELETE /:id
  'employee.delete': { roles: ['owner'] },
  // salaryTransaction.route.ts: POST /
  'salary.create': { roles: ['owner', 'manager', 'accountant'], permission: 'page:employees.transactions' },
  // salaryTransaction.route.ts: DELETE /:id
  'salary.delete': { roles: ['owner'] },
  // attendance.route.ts: PUT /
  'attendance.write': { roles: ['owner', 'manager'], permission: 'page:employees.attendance' },
  // attendance.route.ts: DELETE /:id
  'attendance.delete': { roles: ['owner', 'manager'], permission: 'act:employees.delete' },
  // monthlyTarget.route.ts: PUT / and DELETE /:id - the owner's alone
  'salesTarget.write': { roles: ['owner'] },
  // purchaseTarget.route.ts: POST / and PATCH /:id
  'purchaseTarget.write': { roles: ['owner', 'manager'], permission: 'page:reports.purchase-target' },
  // purchaseTarget.route.ts: DELETE /:id
  'purchaseTarget.delete': { roles: ['owner', 'manager'], permission: 'act:reports.delete' },
  // report.route.ts: POST /email - whoever may read a report, to the owner's own address
  'report.email': {
    roles: ['owner', 'manager', 'accountant'],
    permission: ['page:reports.summary', 'page:reports.yearly', 'page:reports.monthly-target', 'page:reports.purchase-target'],
  },
} as const satisfies Record<string, { roles: readonly UserRole[]; permission?: string | readonly string[] }>;

export type Action = keyof typeof ACTIONS;

/**
 * What a screen needs: a page permission, or one of the website's two
 * sentinels - 'all' (any signed-in member) and 'owner' (the role, not a tick).
 */
export type Access = string;

/**
 * Every signed-in screen, by its file under src/app/(app), and the website
 * page it is - the app's copy of the website's ROUTE_ACCESS, so a member sees
 * the same pages in both. Absent means denied.
 *
 * Order matters: within a folder, the order its section chips show, then its
 * forms, then the screens opened on one record. firstReachable walks it to
 * pick where a menu tile or tab lands, and a navigator whose first screen is
 * refused falls back to the next one declared.
 *
 * The website's Buy SMS page has no screen: the app sells nothing (store
 * billing rules).
 */
export const ROUTE_ACCESS: Record<string, Access> = {
  index: 'page:dashboard.overview',

  'sales/index': 'page:sales.ledger',
  'sales/items': 'page:sales.history',
  'sales/drafts': 'page:sales.drafts',
  'sales/new': 'page:sales.new',
  'sales/edit/[id]': 'page:sales.ledger',

  inventory: 'page:inventory.stock',

  'customers/index': 'page:customers.dashboard',
  'customers/receipts': 'page:customers.due-received',
  'customers/ledger': 'page:customers.ledger',
  'customers/list': 'page:customers.list',
  'customers/receive': 'page:customers.due-received',
  'customers/edit-receipt/[id]': 'page:customers.due-received',
  // Spends the owner's SMS credits; every /sms route is the owner's.
  'customers/due-sms': 'owner',

  'more/index': 'all',
  'more/history': 'all',
  'more/cash-counter': 'all',

  'more/balance/index': 'page:balance.overview',
  'more/balance/transfers': 'page:balance.transfer',
  'more/balance/ledger': 'page:balance.ledger',
  'more/balance/wallet': 'page:balance.wallet',

  'more/shareholders/index': 'page:shareholders.dashboard',
  'more/shareholders/invest': 'page:shareholders.invest',
  'more/shareholders/profit': 'page:shareholders.profit',
  'more/shareholders/list': 'page:shareholders.list',

  'more/loans/index': 'page:loans.dashboard',
  'more/loans/people': 'page:loans.lenders',
  'more/loans/transactions': 'page:loans.transactions',
  'more/loans/statement': 'page:loans.ledger',

  'more/expenses/index': 'page:expenses.overview',
  'more/expenses/transactions': 'page:expenses.transactions',

  'more/products/index': 'page:products.list',
  'more/products/update-price': 'page:products.update-price',
  'more/products/form': 'page:products.list',

  'more/damage/index': 'page:damage.dashboard',
  'more/damage/entries': 'page:damage.entries',
  'more/damage/receive': 'page:damage.receive',
  'more/damage/transactions': 'page:damage.transactions',
  'more/damage/new': 'page:damage.entries',

  'more/supplier/index': 'page:supplier.dashboard',
  'more/supplier/payments': 'page:supplier.payments',
  'more/supplier/income': 'page:supplier.other-income',
  'more/supplier/list': 'page:supplier.list',
  'more/supplier/report': 'page:supplier.report',

  'more/purchase/index': 'page:purchase.ledger',
  'more/purchase/receive': 'page:purchase.received',
  'more/purchase/history': 'page:purchase.history',
  'more/purchase/drafts': 'page:purchase.drafts',
  'more/purchase/new': 'page:purchase.orders',
  'more/purchase/edit/[id]': 'page:purchase.ledger',

  'more/reports/index': 'page:reports.summary',
  'more/reports/yearly': 'page:reports.yearly',
  'more/reports/sales-target': 'page:reports.monthly-target',
  'more/reports/purchase-target': 'page:reports.purchase-target',

  // The website offers its Campaign page to a ticked member, whose every
  // request is then refused: every /sms route is the owner's.
  'more/marketing': 'owner',

  'more/employees/index': 'page:employees.dashboard',
  'more/employees/payments': 'page:employees.transactions',
  'more/employees/attendance': 'page:employees.attendance',
  'more/employees/list': 'page:employees.list',

  'more/support/index': 'all',
  'more/support/[id]': 'all',
  'more/billing': 'owner',
  'more/delete-account': 'all',
};

/**
 * Whether this user may open this screen. The website's canReach (Hatim/src/
 * lib/permissions.ts), keyed by screen file rather than URL and without its
 * super-admin pages: super_admin and owner pass, then 'all', then 'owner'
 * refuses everyone else - before the empty-list hatch, as a manager's role
 * does not reach the owner's pages - then an empty list passes, then the name
 * has to be held. An unknown screen is refused.
 */
export function canReach(role: string | undefined, granted: string[] | undefined, screen: string): boolean {
  if (role === 'super_admin' || role === 'owner') return true;
  const access = ROUTE_ACCESS[screen];
  if (access === undefined) return false;
  if (access === 'all') return true;
  if (access === 'owner') return false;
  const list = granted ?? [];
  if (list.length === 0) return true;
  return list.includes(access);
}

/** The screens in a folder of (app) - `sales`, `more/balance` - in ROUTE_ACCESS order. */
export function screensIn(folder: string): string[] {
  return Object.keys(ROUTE_ACCESS).filter((screen) => screen === folder || screen.startsWith(`${folder}/`));
}

/** The screen an href opens: `/more/balance` is `more/balance/index`, `/` is `index`. */
export function screenOf(href: string): string {
  const path = href.replace(/^\/+|\/+$/g, '');
  if (!path) return 'index';
  return `${path}/index` in ROUTE_ACCESS ? `${path}/index` : path;
}

/** The href that opens a screen: `more/balance/index` is `/more/balance`. */
export function hrefOf(screen: string): string {
  return `/${screen.replace(/(^|\/)index$/, '')}`;
}

/** The first screen of a folder this user may open - never one that needs a record's id - or null. */
export function firstReachable(role: string | undefined, granted: string[] | undefined, folder: string): string | null {
  return screensIn(folder).find((screen) => !screen.includes('[') && canReach(role, granted, screen)) ?? null;
}

export function canDo(role: UserRole | undefined, granted: string[] | undefined, action: Action): boolean {
  const gate = ACTIONS[action];
  if (!role || !(gate.roles as readonly UserRole[]).includes(role)) return false;
  if (!('permission' in gate)) return true;
  const any: readonly string[] = typeof gate.permission === 'string' ? [gate.permission] : gate.permission;
  return any.some((permission) => hasPermission(role, granted, permission));
}
