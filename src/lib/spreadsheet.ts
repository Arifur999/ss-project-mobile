// The parts of Hatim/src/lib/spreadsheet.ts a price file is read with, copied
// verbatim so the phone accepts and rejects the same files the website does.
// Its browser-only reading and downloading are src/lib/spreadsheetFiles.ts.
// Re-copy rather than edit.

export const CODE_HEADER_KEYS = ['code', 'productcode', 'prodcode', 'sku', 'skunumber', 'itemcode']

/** Normalises a header cell so "DP Rate (Cost)" and "dp_rate_cost" match. */
export function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

/**
 * The same number, but `undefined` for an empty cell rather than 0.
 *
 * A blank cell in a price file means "this price is not changing". Reading it
 * as 0 would quietly set the price to zero across every row the supplier left
 * out, which is the worst thing this feature could do.
 */
export function parseOptionalNumber(value: string): number | undefined {
  if (value == null) return undefined
  const trimmed = String(value).trim()
  if (trimmed === '') return undefined
  const normalized = trimmed.replace(/,/g, '').replace(/[^\d.-]/g, '').trim()
  if (normalized === '' || normalized === '-') return undefined
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell)
      if (row.some(value => value.trim() !== '')) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell)
  if (row.some(value => value.trim() !== '')) rows.push(row)
  return rows
}

/**
 * The layout can have two columns both titled "Discount" - the first belongs to
 * DP, the second to MRP. Explicit "DP Discount"/"MRP Discount" headers win;
 * plain "Discount" columns are then assigned in order (1st -> DP, 2nd -> MRP).
 */
export function resolveDiscountColumns(headers: string[]) {
  const discountCols = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => header.includes('discount'))

  let dp = discountCols.find(({ header }) => header.includes('dp'))?.index ?? -1
  let mrp = discountCols.find(({ header }) => header.includes('mrp'))?.index ?? -1
  const generic = discountCols
    .filter(({ header }) => !header.includes('dp') && !header.includes('mrp'))
    .map(({ index }) => index)

  if (dp < 0) dp = generic[0] ?? -1
  if (mrp < 0) mrp = generic.filter(index => index !== dp)[0] ?? -1
  return { dp, mrp }
}
