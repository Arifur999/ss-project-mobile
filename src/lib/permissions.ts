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
  // purchase.route.ts: POST /:id/receive and /:id/receive-all
  'purchase.receive': { roles: ['owner', 'manager'], permission: 'page:purchase.received' },
  // purchase.route.ts: DELETE /:id
  'purchase.delete': { roles: ['owner', 'manager'], permission: 'act:purchase.delete' },
  // customer.route.ts: POST / and PATCH /:id
  'customers.write': { roles: ['owner', 'manager', 'sales_staff'], permission: 'page:customers.list' },
  // customer.route.ts: DELETE /:id - refused while the customer has sales or payments
  'customers.delete': { roles: ['owner', 'manager'], permission: 'act:customers.delete' },
  // customerPayment.route.ts: POST /
  'customerPayment.create': { roles: ['owner', 'manager', 'sales_staff', 'accountant'], permission: 'page:customers.due-received' },
  // customerPayment.route.ts: DELETE /:id
  'customerPayment.delete': { roles: ['owner', 'manager'], permission: 'act:customers.delete' },
  // expense.route.ts: POST / - a due discount is written as an expense
  'expense.create': { roles: ['owner', 'manager', 'accountant'], permission: 'page:expenses.transactions' },
  // sms.route.ts: POST /send - the owner's credits, no permission beyond the role
  'sms.send': { roles: ['owner'] },
  // sale.route.ts: POST /
  'sale.create': { roles: ['owner', 'manager', 'sales_staff'], permission: 'page:sales.new' },
  // sale.route.ts: POST /:id/deliveries
  'sale.deliver': { roles: ['owner', 'manager', 'sales_staff'], permission: ['page:sales.ledger', 'page:sales.new'] },
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

export function canDo(role: UserRole | undefined, granted: string[] | undefined, action: Action): boolean {
  const gate = ACTIONS[action];
  if (!role || !(gate.roles as readonly UserRole[]).includes(role)) return false;
  if (!('permission' in gate)) return true;
  const any: readonly string[] = typeof gate.permission === 'string' ? [gate.permission] : gate.permission;
  return any.some((permission) => hasPermission(role, granted, permission));
}
