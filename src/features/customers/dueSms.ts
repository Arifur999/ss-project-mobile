import type { CustomerDashboardRow } from '@/lib/customerDue';
import { isValidBdPhone, phoneDigits } from '@/lib/phone';
import { buildDueSms, segmentsFor, type SmsBusiness } from '@/lib/smsTexts';

// The due reminder as the website's Customer Dashboard sends it
// (CustomerDashboard.tsx: dueSmsFor, smsTargets, estimatedCredits): one text
// per customer naming their own due, to those who owe and can be texted.

/** One customer's reminder, word for word the website's. */
export const dueReminderText = (business: SmsBusiness, customer: Pick<CustomerDashboardRow, 'name' | 'currentDue'>) =>
  buildDueSms({ ...business, customerName: customer.name || 'গ্রাহক', due: Number(customer.currentDue || 0) });

/**
 * Who a reminder can go to: someone who owes, with a real number. The website
 * skips anyone with no phone; a number that is not a Bangladeshi mobile is
 * skipped too, as it would only cost a credit for a text that never arrives.
 */
export const canRemind = (customer: Pick<CustomerDashboardRow, 'currentDue' | 'phone'>) => Number(customer.currentDue) > 0 && isValidBdPhone(customer.phone || '');

/** What sending each of them their reminder costs, in credits. */
export const remindersCost = (business: SmsBusiness, customers: CustomerDashboardRow[]) =>
  customers.reduce((sum, customer) => sum + segmentsFor(dueReminderText(business, customer)), 0);

/** The number a reminder goes to, as the gateway takes it. */
export const reminderNumber = (customer: Pick<CustomerDashboardRow, 'phone'>) => phoneDigits(customer.phone || '');
