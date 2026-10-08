import { useQuery } from '@tanstack/react-query';

import { billingRows, type BillingRow } from '@/lib/billingHistory';
import { http } from '@/lib/httpClient';

/**
 * The owner's plan payments and SMS purchases. Either list may fail on its own
 * - an account that never bought SMS - without blanking the other, as the
 * website's Billing History loads them.
 */
export async function loadBillingHistory(): Promise<BillingRow[]> {
  const [plans, sms] = await Promise.allSettled([http.get<unknown[]>('/subscriptions/my-payments'), http.get<unknown[]>('/sms/purchases')]);
  const rows = (result: PromiseSettledResult<unknown[]>) => (result.status === 'fulfilled' && Array.isArray(result.value) ? (result.value as Record<string, any>[]) : []);
  return billingRows(rows(plans), rows(sms));
}

export function useBillingHistory(enabled: boolean) {
  return useQuery({ queryKey: ['billing-history'], queryFn: loadBillingHistory, enabled });
}
