import { isAxiosError } from 'axios';

import { errorMessage, http } from '@/lib/httpClient';

/** Sends one message to one or more numbers from the workspace's SMS credits (owner only). */
export const sendSms = (recipients: string[], message: string) =>
  http.post<{ sent: number }>('/sms/send', { recipients, message });

const trimStop = (text: string) => text.trim().replace(/[.\s]+$/, '');

/**
 * Why an SMS did not go out, as Hatim/src/lib/smsPermission.ts words it: the
 * three failures that each have a different fix - not the owner, out of
 * credits, the gateway refused (credits returned) - then whatever the server said.
 */
export function smsFailureReason(error: unknown): string {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  const detail = trimStop(errorMessage(error, ''));
  if (status === 403 || /forbidden|permission/i.test(detail)) return 'only the owner can send SMS';
  if (status === 402 || /not enough sms credits/i.test(detail)) return 'not enough SMS credits - buy more from Marketing > Buy SMS';
  if (status === 502 || /gateway/i.test(detail)) {
    return detail ? `the SMS gateway refused it (${detail}) and no credits were used` : 'the SMS gateway refused it and no credits were used';
  }
  return detail || 'the message could not be sent';
}

/** "<what did succeed>. SMS not sent - <why>." */
export function smsFailureMessage(error: unknown, saved?: string): string {
  return `${saved ? `${saved}. ` : ''}SMS not sent - ${smsFailureReason(error)}.`;
}
