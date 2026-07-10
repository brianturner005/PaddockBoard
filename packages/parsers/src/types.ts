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
  // Free-text class name straight from the file, if the file has one (e.g.
  // Orbits' "Class" column). Not validated against a club's real classes --
  // that's an app-layer concern (a raw string like "Sportsman" has to be
  // matched to an actual class record), the parser just surfaces the hint.
  className?: string;
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
  | "gapMs"
  | "className";

export const CANONICAL_FIELDS: CanonicalField[] = [
  "position",
  "driverNumber",
  "driverName",
  "laps",
  "totalTimeMs",
  "bestLapMs",
  "gapMs",
  "className",
];

// A raw CSV header resolves to a canonical field, to "known but not modeled
// yet" (recognized, deliberately not surfaced as a warning), or to nothing.
export type ColumnResolution = CanonicalField | "known_unmodeled" | null;
