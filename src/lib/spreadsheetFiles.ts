import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { parseCsv } from './spreadsheet';

// A spreadsheet chosen on the phone read into rows, and one written out for
// the owner to keep - the app's side of Hatim/src/lib/spreadsheet.ts's
// readSpreadsheet and downloadXlsx, with the same SheetJS and the same choice
// of sheet, so a workbook reads here exactly as it does on the website.

/** A file picked on the phone: where it was copied to, and what it was called. */
export type PickedFile = { uri: string; name: string };

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * The file's rows as text. A workbook's first sheet whose header row the
 * caller recognises is read - product-ish sheet names first, so a cover tab is
 * skipped - else its first sheet; anything else is read as CSV.
 */
export async function readSpreadsheet(file: PickedFile, detectHeader: (rows: string[][]) => number): Promise<string[][]> {
  const name = file.name.toLowerCase();
  const source = new File(file.uri);
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const workbook = XLSX.read(await source.base64(), { type: 'base64' });
    const toRows = (sheetName: string): string[][] => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return [];
      return XLSX.utils
        .sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: '' })
        .map((row) => (row || []).map((cell) => (cell == null ? '' : String(cell))));
    };
    const names = workbook.SheetNames;
    const preferred = names.filter((n) => /furniture|product|price|item|list|stock/i.test(n));
    const ordered = [...preferred, ...names.filter((n) => !preferred.includes(n))];
    for (const sheetName of ordered) {
      const rows = toRows(sheetName);
      if (detectHeader(rows) >= 0) return rows;
    }
    return names[0] ? toRows(names[0]) : [];
  }
  return parseCsv(await source.text());
}

/**
 * A one-sheet workbook kept in the app's documents - where the system never
 * clears it - and offered to the share sheet, to save to Files or send on.
 * Kept whether or not it is shared, so it is there to come back to.
 */
export async function saveAndShareXlsx(filename: string, headers: string[], rows: unknown[][], sheetName = 'Products'): Promise<string> {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  const file = new File(Paths.document, filename);
  file.create({ overwrite: true });
  file.write(XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }), { encoding: 'base64' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: XLSX_TYPE, UTI: 'org.openxmlformats.spreadsheetml.sheet', dialogTitle: filename });
  }
  return file.uri;
}
