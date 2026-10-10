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

/**
 * Starts the owner's 7-day free trial, with the contact details the website's
 * trial popup asks for (kept for the super admin's follow-up). Free, so it may
 * be offered in the app; a paid plan is never chosen here.
 */
export async function startFreeTrial(input: { full_name: string; phone: string; address: string }): Promise<void> {
  await http.post('/subscriptions/choose-plan', { plan_type: 'free_trial', ...input });
}

export function useBillingHistory(enabled: boolean) {
  return useQuery({ queryKey: ['billing-history'], queryFn: loadBillingHistory, enabled });
}
