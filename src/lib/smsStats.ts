import type { SmsMessage } from '@/services/sms.services';

// The Marketing page's three figures and its failures panel, lifted from
// Hatim/src/pages/Marketing.tsx: read from the server's log of every batch,
// not a device's own memory, so every phone and the website agree.

export function smsStats(messages: SmsMessage[], today: string) {
  const sentToday = messages
    .filter((row) => String(row.created_at).startsWith(today) && row.status === 'sent')
    .reduce((sum, row) => sum + Number(row.recipient_count || 0), 0);
  const campaignsThisMonth = messages.filter((row) => String(row.created_at).slice(0, 7) === today.slice(0, 7)).length;
  const attempted = messages.reduce((sum, row) => sum + Number(row.recipient_count || 0), 0);
  const delivered = messages.filter((row) => row.status === 'sent').reduce((sum, row) => sum + Number(row.recipient_count || 0), 0);
  // A batch the gateway refused is logged as failed with no credits used.
  return { sentToday, campaignsThisMonth, deliveryRate: attempted > 0 ? (delivered / attempted) * 100 : 100 };
}

/** What the gateway refused, newest first. */
export const failedSends = (messages: SmsMessage[]) =>
  messages.filter((row) => row.status === 'failed').sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
