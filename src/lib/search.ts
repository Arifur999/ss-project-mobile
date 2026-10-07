/**
 * The website's in-page search (Hatim/src/lib/searchRows.ts): a case-insensitive
 * "contains" over any of the texts; an empty search matches everything.
 */
export const matches = (q: string, ...texts: (string | null | undefined)[]) => {
  const term = q.trim().toLowerCase();
  return !term || texts.some((text) => String(text || '').toLowerCase().includes(term));
};
