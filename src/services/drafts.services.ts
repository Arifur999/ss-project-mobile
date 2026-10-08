import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useCallback } from 'react';

import { http } from '@/lib/httpClient';
import type { DraftBody, DraftKind } from '@/lib/draftPayload';

// Parked invoices and purchase orders, shared with the website's Draft Sales
// and Draft Purchase: one list of each kind per workspace, whoever parked
// them. A draft reaches no stock, due or account until it is opened and saved
// as a sale or an order.

export type Draft = {
  id: string;
  kind: DraftKind;
  /** The customer or supplier. */
  title: string;
  /** The invoice or SI number. */
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
const listKey = (kind: DraftKind) => [...DRAFTS_KEY, 'list', kind] as const;

/** One kind's parked forms, last touched first. The list leaves each snapshot out. */
export function useDrafts(kind: DraftKind) {
  return useQuery({ queryKey: listKey(kind), queryFn: () => http.get<Draft[]>(`/drafts?kind=${kind}`) });
}

/** One parked form with its snapshot; fetched fresh each time, as another till may have changed it. */
export function useDraft(id: string | null) {
  return useQuery({ queryKey: [...DRAFTS_KEY, 'one', id], queryFn: () => http.get<DraftWithData>(`/drafts/${id}`), enabled: !!id, staleTime: 0, gcTime: 0 });
}

export const createDraft = (body: DraftBody) => http.post<DraftWithData>('/drafts', body);
export const updateDraft = (id: string, body: DraftBody) => http.patch<DraftWithData>(`/drafts/${id}`, body);
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

/**
 * Runs a draft write, then refetches that kind's list - only the list: a form
 * open on a draft keeps the copy it opened, even once publishing deletes it.
 */
export function useDraftWrite(kind: DraftKind) {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await queryClient.invalidateQueries({ queryKey: listKey(kind) });
      return result;
    },
    [queryClient, kind],
  );
}
