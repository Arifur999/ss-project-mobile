import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useCallback } from 'react';

import { http } from '@/lib/httpClient';
import type { SaleDraftBody } from '@/features/sales/saleDraft';

// Parked invoices, shared with the website's Draft Sales: one list per
// workspace, whoever parked them. A draft reaches no stock, due or account
// until it is opened and saved as a sale.

export type Draft = {
  id: string;
  kind: 'sale' | 'purchase_order';
  /** The customer. */
  title: string;
  /** The invoice number. */
  subtitle: string;
  amount: number;
  payload_version: number;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
};

export type DraftWithData = Draft & { data: Record<string, unknown> };

export const DRAFTS_KEY = ['drafts'] as const;

/** The parked sales, last touched first. The list leaves each snapshot out. */
export function useSaleDrafts() {
  return useQuery({ queryKey: [...DRAFTS_KEY, 'sale'], queryFn: () => http.get<Draft[]>('/drafts?kind=sale') });
}

/** One parked sale with its snapshot; fetched fresh each time, as another till may have changed it. */
export function useDraft(id: string | null) {
  return useQuery({ queryKey: [...DRAFTS_KEY, 'one', id], queryFn: () => http.get<DraftWithData>(`/drafts/${id}`), enabled: !!id, staleTime: 0, gcTime: 0 });
}

export const createDraft = (body: SaleDraftBody) => http.post<DraftWithData>('/drafts', body);
export const updateDraft = (id: string, body: SaleDraftBody) => http.patch<DraftWithData>(`/drafts/${id}`, body);
export const deleteDraft = (id: string) => http.delete(`/drafts/${id}`);

/**
 * A published draft is no longer wanted. Gone already (404) is the same
 * outcome; any other failure is reported, never turned into a failed sale -
 * the sale is saved, and calling it failed would have it entered twice.
 */
export async function clearDraft(id: string): Promise<boolean> {
  try {
    await deleteDraft(id);
    return true;
  } catch (error) {
    return isAxiosError(error) && error.response?.status === 404;
  }
}

/** Runs a draft write, then refetches the drafts list. */
export function useDraftWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await queryClient.invalidateQueries({ queryKey: DRAFTS_KEY });
      return result;
    },
    [queryClient],
  );
}
