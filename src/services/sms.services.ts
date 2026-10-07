import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { errorMessage, http } from '@/lib/httpClient';

/** One batch the server logged: how many it went to, what it cost, and whether the gateway took it. */
export type SmsMessage = {
  id: string;
  recipient_count: number;
  segments: number;
  credits_used: number;
  message: string;
  status: 'sent' | 'failed';
  /** The gateway's own words - the only record of why a batch was refused. */
  response: string;
  created_at: string;
};

export type SmsSendResult = { recipients: number; segments: number; credits_used: number; balance: number };

/** Sends one message to one or more numbers from the workspace's SMS credits (owner only). */
export const sendSms = (recipients: string[], message: string) => http.post<SmsSendResult>('/sms/send', { recipients, message });

export const SMS_KEY = ['sms'] as const;

/** The credits left - the owner's alone, so nobody else asks. */
export function useSmsWallet(enabled: boolean) {
  return useQuery({ queryKey: [...SMS_KEY, 'wallet'], queryFn: () => http.get<{ balance: number }>('/sms/wallet'), enabled });
}

/** Every batch the account has sent, from the server's log. */
export function useSmsMessages(enabled: boolean) {
  return useQuery({ queryKey: [...SMS_KEY, 'messages'], queryFn: async () => (await http.get<SmsMessage[]>('/sms/messages')) ?? [], enabled });
}

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
