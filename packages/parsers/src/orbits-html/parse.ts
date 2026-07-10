import type { ColumnResolution, ParsedSession } from "../types";
import { decodeBuffer, buildRow } from "../row-builder";
import { resolveColumn } from "../orbits-csv/columns";

// No real Orbits HTML export sample was found during research (see
// docs/dev/formats.md) -- native HTML export isn't clearly documented at
// all, only that older/Standard installs commonly "Print"/"Save As" the
// results grid to HTML. The working assumption is that this produces the
// same tabular data as the documented CSV export, just wrapped in a
// <table> instead of comma-separated lines -- so this parser reuses the
// CSV parser's exact column alias table (`resolveColumn`) rather than
// inventing a separate one.

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function cellText(cellHtml: string): string {
  return decodeEntities(stripTags(cellHtml)).replace(/\s+/g, " ").trim();
}

// Deliberately a narrow regex-based extractor, not a full HTML parser --
// mirrors the CSV parser's iconv-lite-avoidance reasoning (see
// docs/dev/architecture.md): no DOMParser dependency means this stays
// zero-dependency and bundles into the client the same way as everything
// else in this package, and Orbits' output is assumed to be a single flat
// table with no colspan/rowspan/nesting.
function extractTableRows(html: string): string[][] {
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    throw new Error("Could not find a results table in this file");
  }

  const rowMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  return rowMatches
    .map((rowMatch) => [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => cellText(c[1])))
    .filter((row) => row.length > 0);
}

export function parseOrbitsHtml(buffer: ArrayBuffer): ParsedSession {
  const { text, encoding } = decodeBuffer(buffer);
  const warnings: ParsedSession["warnings"] = [];

  if (!text.trim()) {
    throw new Error("File is empty");
  }

  const [headerRow, ...dataRows] = extractTableRows(text);
  if (!headerRow) {
    throw new Error("Could not read a header row from this file");
  }

  const columnMap = new Map<string, ColumnResolution>();
  const unrecognizedColumns: string[] = [];
  for (const header of headerRow) {
    const resolution = resolveColumn(header);
    columnMap.set(header, resolution);
    if (resolution === null) {
      unrecognizedColumns.push(header);
    }
  }

  const rows = dataRows.map((cells, index) => {
    const rawRow: Record<string, string> = {};
    headerRow.forEach((header, i) => {
      rawRow[header] = cells[i] ?? "";
    });
    return buildRow(rawRow, columnMap, index, warnings);
  });

  return { rows, warnings, unrecognizedColumns, encoding };
}
