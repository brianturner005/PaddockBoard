import Papa from "papaparse";
import type { CanonicalField, ColumnResolution, ParsedSession } from "../types";
import { decodeBuffer, buildRow } from "../row-builder";

// Unlike orbits-csv, a generic export has no known alias table -- the club
// (or whoever's uploading) picks the mapping by hand once, and it's saved
// per-club so it doesn't need re-entering on every upload of the same
// format. See `apps/web/components/GenericCsvColumnMapper.tsx`.

export function readCsvHeaders(buffer: ArrayBuffer): { headers: string[]; encoding: string } {
  const { text, encoding } = decodeBuffer(buffer);
  if (!text.trim()) {
    throw new Error("File is empty");
  }

  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
    delimiter: "",
    preview: 1,
  });

  const headerRow = result.data[0];
  if (!headerRow || headerRow.length === 0) {
    throw new Error("Could not read a header row from this file");
  }

  return { headers: headerRow, encoding };
}

export function parseGenericCsv(
  buffer: ArrayBuffer,
  columnMapping: Record<string, CanonicalField>
): ParsedSession {
  const { text, encoding } = decodeBuffer(buffer);
  const warnings: ParsedSession["warnings"] = [];

  if (!text.trim()) {
    throw new Error("File is empty");
  }

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: "",
  });

  if (!result.meta.fields || result.meta.fields.length === 0) {
    throw new Error("Could not read a header row from this file");
  }

  const columnMap = new Map<string, ColumnResolution>();
  const unrecognizedColumns: string[] = [];
  for (const header of result.meta.fields) {
    const field = columnMapping[header] ?? null;
    columnMap.set(header, field);
    if (field === null) {
      unrecognizedColumns.push(header);
    }
  }

  const rows = result.data.map((rawRow, index) => buildRow(rawRow, columnMap, index, warnings));

  return { rows, warnings, unrecognizedColumns, encoding };
}
