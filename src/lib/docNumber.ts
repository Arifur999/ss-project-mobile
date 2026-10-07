/**
 * "INV-2610-4821", "PO-2610-4821": the website's generateInvoiceNo and
 * generateSINo - the prefix, the year and month, four random digits. The
 * server moves past a number already taken.
 */
export function docNumber(prefix: string, now = new Date()): string {
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${yy}${mm}-${rand}`;
}
