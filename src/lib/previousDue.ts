import type { CustomerData } from '@/services/customers.services';

import { customerCurrentDue } from './customerDue';

/**
 * What a customer owes before today's collection or sale - the dashboard's
 * rule, never shown below zero, as the website's Due Received modal and its
 * sale form both read it. An invoice or a collection being edited is left
 * out of what is owed besides it, as the website's forms leave it.
 */
export function previousDueFor(customerId: string, data: CustomerData | undefined, except: { saleId?: string; paymentId?: string } = {}): number {
  const customer = data?.customers.find((c) => c.id === customerId);
  if (!customer || !data) return 0;
  return Math.max(
    0,
    customerCurrentDue(
      customer.opening_due,
      data.sales.filter((sale) => sale.customer_id === customerId && sale.id !== except.saleId),
      data.payments.filter((payment) => payment.customer_id === customerId && payment.id !== except.paymentId),
    ),
  );
}
