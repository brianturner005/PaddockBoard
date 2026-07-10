import Papa from "papaparse";
import type { ColumnResolution, ParsedSession } from "../types";
import { decodeBuffer, buildRow } from "../row-builder";
import { resolveColumn } from "./columns";

export function parseOrbitsCsv(buffer: ArrayBuffer): ParsedSession {
  const { text, encoding } = decodeBuffer(buffer);
  const warnings: ParsedSession["warnings"] = [];

  if (!text.trim()) {
    throw new Error("File is empty");
  }

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: "", // auto-detect: Orbits exports are documented as comma- or tab-delimited
  });

  if (!result.meta.fields || result.meta.fields.length === 0) {
    throw new Error("Could not read a header row from this file");
  }

  const columnMap = new Map<string, ColumnResolution>();
  const unrecognizedColumns: string[] = [];
  for (const header of result.meta.fields) {
    const resolution = resolveColumn(header);
    columnMap.set(header, resolution);
    if (resolution === null) {
      unrecognizedColumns.push(header);
    }
  }

  const rows = result.data.map((rawRow, index) => buildRow(rawRow, columnMap, index, warnings));

  return { rows, warnings, unrecognizedColumns, encoding };
}
