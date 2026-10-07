/**
 * Whether a form's errors hold anything: its own flags, or a line in the
 * per-line map - the shape the damage and purchase forms both report.
 */
export function hasErrors(errors: { lines: Record<string, object> }): boolean {
  return Object.entries(errors).some(([key, value]) => (key === 'lines' ? Object.keys(value).length > 0 : Boolean(value)));
}
