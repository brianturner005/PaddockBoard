export type ResultStatus = "finished" | "dnf" | "dns" | "dsq" | "unknown";

export interface ParsedRow {
  position: number | null;
  driverName: string;
  driverNumber?: string;
  laps?: number;
  bestLapMs?: number;
  totalTimeMs?: number;
  gapMs?: number;
  status: ResultStatus;
  rawRow: Record<string, string>;
}

export interface ParseWarning {
  code: string;
  message: string;
  rowIndex?: number;
}

export interface ParsedSession {
  rows: ParsedRow[];
  warnings: ParseWarning[];
  unrecognizedColumns: string[];
  encoding: string;
}

export type SupportedFormat = "orbits_csv" | "orbits_html" | "generic_csv";

export type CanonicalField =
  | "position"
  | "driverNumber"
  | "driverName"
  | "laps"
  | "totalTimeMs"
  | "bestLapMs"
  | "gapMs";

export const CANONICAL_FIELDS: CanonicalField[] = [
  "position",
  "driverNumber",
  "driverName",
  "laps",
  "totalTimeMs",
  "bestLapMs",
  "gapMs",
];

// A raw CSV header resolves to a canonical field, to "known but not modeled
// yet" (recognized, deliberately not surfaced as a warning), or to nothing.
export type ColumnResolution = CanonicalField | "known_unmodeled" | null;
