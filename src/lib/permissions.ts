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
 * permission requirePermission asks for. Both have to pass.
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
} as const satisfies Record<string, { roles: readonly UserRole[]; permission: string }>;

export type Action = keyof typeof ACTIONS;

export function canDo(role: UserRole | undefined, granted: string[] | undefined, action: Action): boolean {
  const gate = ACTIONS[action];
  if (!role || !(gate.roles as readonly UserRole[]).includes(role)) return false;
  return hasPermission(role, granted, gate.permission);
}
