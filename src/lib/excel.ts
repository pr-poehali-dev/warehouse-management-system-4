import * as XLSX from 'xlsx';

export interface ImportRow {
  name: string;
  barcode: string;
}

export async function parseExcel(file: File): Promise<ImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const rows: ImportRow[] = [];
  for (const r of json) {
    const keys = Object.keys(r);
    const nameKey = keys.find((k) => /наимен|товар|name|продукт/i.test(k));
    const barcodeKey = keys.find((k) => /штрих|barcode|код|ean/i.test(k));
    const name = String(r[nameKey || keys[0]] || '').trim();
    const barcode = String(r[barcodeKey || keys[1]] || '').trim();
    if (name && barcode) rows.push({ name, barcode });
  }
  return rows;
}
