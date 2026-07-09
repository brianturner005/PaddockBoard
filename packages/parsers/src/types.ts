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

export type SupportedFormat = "orbits_csv";
