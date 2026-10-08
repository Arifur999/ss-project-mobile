import { CODE_HEADER_KEYS, headerKey, parseOptionalNumber, resolveDiscountColumns } from './spreadsheet';

// A price file's rows, lifted from Hatim/src/pages/products/UpdatePrice.tsx
// (detectPriceHeaderRow, handleFile and apply's rollback sheet): which row is
// the header, which column is the code and which the four prices, and each
// row as only the prices it names - a blank cell is left out, never read as 0,
// which would make a product free. Pure, so testable.

/** The columns the sample carries, and the ones a rollback file is written back in - uploading what came out undoes it. */
export const PRICE_SHEET_HEADERS = ['Code', 'DP', 'DP Discount', 'MRP', 'MRP Discount'];

/** The website's sample rows. */
export const PRICE_SAMPLE_ROWS = [
  ['P-1001', 12000, 5, 15000, 0],
  ['P-1002', 8500, 0, 11000, 10],
];

/** Rows sent at a time: the API refuses a body over 2 MB, and a few thousand rows pass it. */
export const PRICE_SAVE_CHUNK = 100;

const DP_KEYS = ['dp', 'dprate', 'dpratecost', 'costprice', 'cost', 'purchaseprice', 'buyingprice'];
const MRP_KEYS = ['mrp', 'mrpselling', 'sellingprice', 'sp', 'retail', 'price', 'saleprice'];

export type PriceRow = {
  product_code: string;
  cost_price?: number;
  selling_price?: number;
  dp_discount?: number;
  mrp_discount?: number;
};

export type PriceField = 'cost_price' | 'dp_discount' | 'selling_price' | 'mrp_discount';
export const PRICE_FIELDS: PriceField[] = ['cost_price', 'dp_discount', 'selling_price', 'mrp_discount'];

export type PriceMatch = { product_code: string; name: string; before: Record<string, number>; after: Record<string, number> };

export type PriceUpdateResult = {
  dry_run: boolean;
  matched: PriceMatch[];
  unchanged: string[];
  notFound: string[];
};

/** The header row: a Code column and at least one price column, within the first 30 rows; -1 when there is none. */
export function detectPriceHeaderRow(rows: string[][]): number {
  const limit = Math.min(rows.length, 30);
  for (let i = 0; i < limit; i += 1) {
    const keys = (rows[i] || []).map(headerKey);
    const hasCode = keys.some((key) => CODE_HEADER_KEYS.includes(key));
    const hasPrice = keys.some((key) => DP_KEYS.includes(key) || MRP_KEYS.includes(key)) || keys.some((key) => key.includes('discount'));
    if (hasCode && hasPrice) return i;
  }
  return -1;
}

/** Every row with a code and at least one price, carrying only the prices it names; or why there are none. */
export function priceRowsFrom(allRows: string[][]): { rows: PriceRow[] } | { problem: 'noHeader' | 'noRows' } {
  const headerRowIndex = detectPriceHeaderRow(allRows);
  if (headerRowIndex < 0) return { problem: 'noHeader' };

  const headers = allRows[headerRowIndex].map(headerKey);
  const columnIndex = (names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const discounts = resolveDiscountColumns(headers);
  const indexes = { code: columnIndex(CODE_HEADER_KEYS), dp: columnIndex(DP_KEYS), mrp: columnIndex(MRP_KEYS), dpDiscount: discounts.dp, mrpDiscount: discounts.mrp };
  const cell = (row: string[], index: number) => (index >= 0 ? (row[index] ?? '') : '');

  const rows: PriceRow[] = [];
  for (const row of allRows.slice(headerRowIndex + 1)) {
    const code = cell(row, indexes.code).trim();
    if (!code) continue;
    const priced: PriceRow = {
      product_code: code,
      cost_price: parseOptionalNumber(cell(row, indexes.dp)),
      selling_price: parseOptionalNumber(cell(row, indexes.mrp)),
      dp_discount: parseOptionalNumber(cell(row, indexes.dpDiscount)),
      mrp_discount: parseOptionalNumber(cell(row, indexes.mrpDiscount)),
    };
    // The prices left out never reach the wire.
    const cleaned: PriceRow = { product_code: code };
    for (const field of PRICE_FIELDS) if (priced[field] !== undefined) cleaned[field] = priced[field];
    if (Object.keys(cleaned).length > 1) rows.push(cleaned);
  }
  return rows.length === 0 ? { problem: 'noRows' } : { rows };
}

/**
 * The rollback sheet: every product about to change, each price as it stands
 * now. `before` carries only the fields changing and `after` the whole result,
 * so one falling back to the other is every field as it is today.
 */
export function rollbackRows(matched: PriceMatch[]): (string | number)[][] {
  const asItStands = (row: PriceMatch, field: PriceField) => row.before[field] ?? row.after[field] ?? '';
  return matched.map((row) => [row.product_code, asItStands(row, 'cost_price'), asItStands(row, 'dp_discount'), asItStands(row, 'selling_price'), asItStands(row, 'mrp_discount')]);
}
