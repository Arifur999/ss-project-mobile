import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { http } from '@/lib/httpClient';
import { supportNumberOrFallback } from '@/lib/support';

/**
 * The support number the super admin set, or the built-in one - read once and
 * kept, since it changes about never. A failure is no matter: the fallback is
 * a real number.
 */
export function useSupportNumber(): string {
  const query = useQuery({
    queryKey: ['support-number'],
    queryFn: async () => (await http.get<{ support_number?: string | null }>('/platform-settings/payment-info'))?.support_number ?? null,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  return supportNumberOrFallback(query.data);
}

/** Where a ticket stands, set by the server from who spoke last: a customer writing on a solved one opens it again. */
export type TicketStatus = 'open' | 'answered' | 'solved';

export type TicketMessage = { id: string; body: string; from_admin: boolean; author_name: string; created_at: string };

export type SupportTicket = {
  id: string;
  subject: string;
  status: TicketStatus;
  created_at: string;
  last_message_at: string;
  solved_at: string | null;
  messages: TicketMessage[];
  /** Whether support is typing on it right now. */
  other_typing?: boolean;
};

export const TICKETS_KEY = ['support-tickets'] as const;

/**
 * The workspace's own tickets, newest conversation first. The website listens
 * on a live stream; the app asks again every few seconds while a screen that
 * shows them is open, which brings replies and the typing mark just the same.
 */
export function useMyTickets(live: boolean) {
  return useQuery({
    queryKey: TICKETS_KEY,
    queryFn: async () =>
      [...((await http.get<SupportTicket[]>('/support-tickets/my')) ?? [])].sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
      ),
    refetchInterval: live ? 5000 : false,
  });
}

export const createTicket = (input: { subject?: string; message: string }) => http.post<SupportTicket>('/support-tickets', input);
export const replyToTicket = (id: string, message: string) => http.post<SupportTicket>(`/support-tickets/${id}/reply`, { message });
/** A keystroke heartbeat, so support sees the typing mark. Fire and forget - a lost one costs a bubble. */
export const noteTyping = (id: string) => http.post(`/support-tickets/${id}/typing`).catch(() => {});

/** Puts the ticket the server answered with into the list at once, instead of waiting for the next poll. */
export function useTicketWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    (ticket: SupportTicket) =>
      queryClient.setQueryData<SupportTicket[]>(TICKETS_KEY, (old) => [ticket, ...(old ?? []).filter((t) => t.id !== ticket.id)]),
    [queryClient],
  );
}
