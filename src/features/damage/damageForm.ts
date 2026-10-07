import { needsSupplier, type DamageAction, type DamageSource } from '@/lib/damageRules';
import { parseAmount } from '@/lib/money';
import type { DamageEntryInput } from '@/services/damage.services';

// The new-damage form as typed, and the checks POST /damage makes
// (hatim_Backend damage.validation.ts): a date, at least one product, each
// with a whole quantity above zero and an optional unit cost not below zero,
// and a supplier wherever needsSupplier says one is needed. Pure, so testable.

/** One product on the entry. Lines are added by picking a product, so each has one. */
export type DamageLine = { product_id: string; product_code: string; product_name: string; qty: string; unit_cost: string };

export type DamageForm = {
  date: string;
  source: DamageSource;
  action: DamageAction;
  supplier_id: string;
  notes: string;
  lines: DamageLine[];
};

export type DamageFormErrors = {
  supplier?: true;
  items?: true;
  /** By product id: which of a line's two figures is wrong. */
  lines: Record<string, { qty?: true; cost?: true }>;
};

export function damageFormErrors(form: DamageForm): DamageFormErrors {
  const errors: DamageFormErrors = { lines: {} };
  if (needsSupplier(form.source, form.action) && !form.supplier_id) errors.supplier = true;
  if (form.lines.length === 0) errors.items = true;
  for (const line of form.lines) {
    const qty = parseAmount(line.qty);
    const cost = line.unit_cost.trim() === '' ? 0 : parseAmount(line.unit_cost);
    const wrong: { qty?: true; cost?: true } = {};
    if (!Number.isInteger(qty) || qty <= 0) wrong.qty = true;
    if (Number.isNaN(cost)) wrong.cost = true;
    if (wrong.qty || wrong.cost) errors.lines[line.product_id] = wrong;
  }
  return errors;
}

/**
 * The payload. A blank or zero unit cost is left out, so the server draws the
 * real FIFO cost off the batches - the normal case; a typed one wins, and is
 * the only figure there is when the batches hold nothing. A supplier is sent
 * only where one is needed, as the website's form sends it.
 */
export function damageInput(form: DamageForm, supplierName: (id: string) => string): DamageEntryInput {
  const supplierId = needsSupplier(form.source, form.action) || form.supplier_id ? form.supplier_id || null : null;
  return {
    date: form.date,
    source: form.source,
    action: form.action,
    supplier_id: supplierId,
    supplier_name: supplierId ? supplierName(supplierId) : '',
    notes: form.notes.trim(),
    items: form.lines.map((line) => {
      const cost = line.unit_cost.trim() === '' ? 0 : parseAmount(line.unit_cost);
      return {
        product_id: line.product_id,
        product_code: line.product_code,
        product_name: line.product_name,
        qty: parseAmount(line.qty),
        ...(cost > 0 ? { unit_cost: cost } : {}),
      };
    }),
  };
}
