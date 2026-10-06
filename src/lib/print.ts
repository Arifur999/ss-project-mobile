import * as Print from 'expo-print';

// A printable table, the app's version of Hatim/src/lib/printTable.ts: the
// system print sheet, where "Save as PDF" is one of the printers. Bangla text
// prints in the device's Bangla font.

type Align = 'left' | 'right';

const escape = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function printTable({
  title,
  subtitle,
  heading,
  columns,
  rows,
  footer,
}: {
  title: string;
  subtitle?: string;
  /** The business name across the top, as the website's printouts carry it. */
  heading?: string;
  columns: { label: string; align?: Align }[];
  rows: (string | number)[][];
  /** Label/value pairs under the table - totals, closing balance. */
  footer?: [string, string][];
}) {
  const cell = (value: unknown, align: Align = 'left', tag = 'td') =>
    `<${tag} style="text-align:${align}">${escape(value)}</${tag}>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, 'Noto Sans Bengali', 'Hind Siliguri', Roboto, sans-serif; color: #000; padding: 8mm; }
    h1 { margin: 0 0 4px; font-size: 17px; }
    .heading { margin: 0 0 10px; padding-bottom: 8px; border-bottom: 2px solid #000; font-size: 18px; font-weight: 700; }
    .sub { margin: 0 0 14px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { padding: 6px 4px; border-bottom: 1.5px solid #000; }
    td { padding: 5px 4px; border-bottom: 1px solid #ddd; }
    .footer td { border: none; font-size: 12px; font-weight: 700; padding-top: 6px; }
  </style></head><body>
    ${heading ? `<p class="heading">${escape(heading)}</p>` : ''}
    <h1>${escape(title)}</h1>
    ${subtitle ? `<p class="sub">${escape(subtitle)}</p>` : ''}
    <table>
      <thead><tr>${columns.map((c) => cell(c.label, c.align, 'th')).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((v, i) => cell(v, columns[i]?.align)).join('')}</tr>`).join('')}</tbody>
    </table>
    ${footer?.length ? `<table class="footer" style="margin-top:16px">${footer.map(([k, v]) => `<tr>${cell(k)}${cell(v, 'right')}</tr>`).join('')}</table>` : ''}
  </body></html>`;
  await Print.printAsync({ html });
}
