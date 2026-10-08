// What every parked form shares, as the website's Hatim/src/lib/draftPayload.ts
// and draft.validation.ts define it: the request that parks one, and the
// careful reading a snapshot needs - the server keeps it without looking
// inside, so a reopened draft may hold anything.

export type DraftKind = 'sale' | 'purchase_order';

export type DraftBody = {
  kind: DraftKind;
  /** Whom it is for - the customer or supplier - for the drafts list. */
  title: string;
  /** The invoice or SI number. */
  subtitle: string;
  amount: number;
  payload_version: number;
  data: Record<string, unknown>;
};

/** The server's limit for a draft's list columns. */
export const DRAFT_LINE_MAX = 200;

// The website's isUuid: only a real product id reaches a line.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type Snapshot = Record<string, unknown>;

export const isSnapshot = (value: unknown): value is Snapshot => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A stored value as text; nothing is ''. */
export const snapshotText = (value: unknown) => (value === null || value === undefined ? '' : String(value));

/** A stored value as a figure; anything unreadable is 0. */
export const snapshotNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const isProductId = (value: string) => UUID.test(value);

/** A stored date when it is one, else the fallback. */
export const snapshotDate = (value: unknown, fallback: string) => {
  const date = snapshotText(value);
  return /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : fallback;
};
