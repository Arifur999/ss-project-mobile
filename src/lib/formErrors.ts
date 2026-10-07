/**
 * Whether a form's errors hold anything: a flag set, or an entry in one of
 * its per-line maps (lines, payment rows) - the shape every app form reports.
 */
export function hasErrors(errors: object): boolean {
  return Object.values(errors).some((value) => (value && typeof value === 'object' ? Object.keys(value).length > 0 : Boolean(value)));
}
