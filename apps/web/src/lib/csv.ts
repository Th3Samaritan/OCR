/**
 * Minimal, robust-enough CSV parser for onboarding registers.
 * Handles quoted fields, escaped quotes ("") and commas/newlines inside quotes.
 * The first non-empty row is treated as the header.
 */

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // flush last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Ensure header names are unique so they're safe as record keys / React keys. */
function dedupeHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((name, i) => {
    const base = name || `column_${i + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

export function parseCsv(text: string): ParsedCsv {
  const raw = parseRows(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (raw.length === 0) return { headers: [], rows: [] };

  const headers = dedupeHeaders(raw[0].map((h) => h.trim()));
  const rows: Record<string, string>[] = raw.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (cells[i] ?? "").trim();
    });
    return record;
  });

  return { headers, rows };
}
