import { parseAmount } from '@/lib/money';
import type { Product, ProductInput } from '@/services/products.services';

// The product form as typed, and the rules that turn it into what POST and
// PATCH /products accept (hatim_Backend product.validation.ts): code and name
// required, a supplier required (as the website's form requires it), prices
// and quantity never negative, quantity whole. Pure, so it can be tested.

export type ProductForm = {
  product_code: string;
  name: string;
  category: string;
  supplier_id: string;
  cost_price: string;
  dp_discount: string;
  selling_price: string;
  mrp_discount: string;
  opening_qty: string;
  size: string;
  weight: string;
};

export type ProductFormField = keyof ProductForm;
export type ProductFormErrors = Partial<Record<ProductFormField, 'required' | 'amount' | 'percent' | 'qty'>>;

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value));
/** A stored figure as the field shows it: blank for nothing, the number otherwise. */
const figure = (value: unknown) => (Number(value) ? String(Number(value)) : '');

export function formFromProduct(product: Product | null): ProductForm {
  return {
    product_code: text(product?.product_code),
    name: text(product?.name),
    category: text(product?.category),
    supplier_id: text(product?.supplier_id ?? product?.suppliers?.id),
    cost_price: figure(product?.cost_price),
    dp_discount: figure(product?.dp_discount),
    selling_price: figure(product?.selling_price),
    mrp_discount: figure(product?.mrp_discount),
    opening_qty: figure(product?.opening_qty),
    size: text(product?.size),
    weight: text(product?.weight),
  };
}

/** A typed figure: blank is 0, anything else has to be a number. */
const amountOf = (value: string) => (value.trim() === '' ? 0 : parseAmount(value));

export function productFormErrors(form: ProductForm): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (!form.product_code.trim()) errors.product_code = 'required';
  if (!form.name.trim()) errors.name = 'required';
  if (!form.supplier_id) errors.supplier_id = 'required';
  for (const field of ['cost_price', 'selling_price'] as const) {
    if (Number.isNaN(amountOf(form[field]))) errors[field] = 'amount';
  }
  for (const field of ['dp_discount', 'mrp_discount'] as const) {
    const pct = amountOf(form[field]);
    if (Number.isNaN(pct) || pct > 100) errors[field] = 'percent';
  }
  const qty = amountOf(form.opening_qty);
  if (!Number.isInteger(qty)) errors.opening_qty = 'qty';
  return errors;
}

/**
 * The payload. Blank figures go as 0 rather than null: the server reads null
 * as "leave it", so a price cleared on an edit would otherwise silently stay.
 */
export function productInput(form: ProductForm, imageUrl: string | null): ProductInput {
  const optional = (value: string) => value.trim() || null;
  return {
    product_code: form.product_code.trim(),
    name: form.name.trim(),
    image_url: imageUrl,
    category: optional(form.category),
    supplier_id: form.supplier_id,
    cost_price: amountOf(form.cost_price),
    selling_price: amountOf(form.selling_price),
    dp_discount: amountOf(form.dp_discount),
    mrp_discount: amountOf(form.mrp_discount),
    opening_qty: amountOf(form.opening_qty),
    size: optional(form.size),
    weight: optional(form.weight),
  };
}
