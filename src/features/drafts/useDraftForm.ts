import { isAxiosError } from 'axios';
import { useState } from 'react';

import { useCopy } from '@/context/LanguageContext';
import { DRAFT_COPY } from '@/features/drafts/copy';
import type { DraftBody, DraftKind } from '@/lib/draftPayload';
import { errorMessage } from '@/lib/httpClient';
import { clearDraft, createDraft, updateDraft, useDraft, useDraftWrite } from '@/services/drafts.services';

const isGone = (error: unknown) => isAxiosError(error) && error.response?.status === 404;

/**
 * The draft a form was opened on, read once: publishing deletes it, so the
 * form keeps the copy it opened rather than following the server. `read` is
 * null until whatever it checks the snapshot against has loaded, and returns
 * null for a shape the app does not know.
 */
export function useOpenedDraft<T>(draftId: string | undefined, read: ((data: unknown) => T | null) | null) {
  const d = useCopy(DRAFT_COPY);
  const draft = useDraft(draftId ?? null);
  // undefined until the draft is in; null when it is in a shape this app does not know.
  const [opened, setOpened] = useState<T | null | undefined>(undefined);
  if (draftId && opened === undefined && draft.data && read) setOpened(read(draft.data.data));

  const missing = draft.isError && opened === undefined;
  const notice = !draftId ? null : opened === null ? d.stale : missing ? (isGone(draft.error) ? d.gone : errorMessage(draft.error)) : null;
  return { opened: opened ?? null, notice, waiting: !!draftId && opened === undefined && !missing };
}

/** Parking a form as a draft, over the one it came from, and clearing it once the form is published. */
export function useParking(kind: DraftKind, fromId: string | null) {
  const write = useDraftWrite(kind);
  const [draftId, setDraftId] = useState(fromId);
  const [parking, setParking] = useState(false);

  /** Parks it - afresh if the draft was deleted meanwhile, on another till or the website. Throws what the server said. */
  const park = async (body: DraftBody) => {
    setParking(true);
    try {
      const saved = await write(async () => {
        if (!draftId) return createDraft(body);
        try {
          return await updateDraft(draftId, body);
        } catch (e) {
          if (isGone(e)) return createDraft(body);
          throw e;
        }
      });
      setDraftId(String(saved.id));
    } finally {
      setParking(false);
    }
  };

  /** After publishing: whether the draft is gone - or there was none. A failure is the caller's to report, never the publish's. */
  const clear = async () => (draftId ? write(() => clearDraft(draftId)) : true);

  return { draftId, parking, park, clear };
}
