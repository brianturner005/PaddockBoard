// Shared between orbits-csv and generic-csv: decoding a raw file buffer and
// turning one already-column-mapped CSV record into a ParsedRow. The two
// formats differ only in *how* a header resolves to a canonical field
// (alias table vs. an admin-picked mapping) -- everything after that is
// identical parsing/validation logic.
import type { ColumnResolution, ParsedRow, ParseWarning, ResultStatus } from "./types";
import { parseDurationMs, parseGapMs } from "./duration";

const STATUS_TOKENS: Record<string, ResultStatus> = {
  dnf: "dnf",
  dns: "dns",
  dsq: "dsq",
  dq: "dsq",
};

function detectStatusToken(value: string | undefined): ResultStatus | null {
  if (!value) return null;
  return STATUS_TOKENS[value.trim().toLowerCase()] ?? null;
}

export function decodeBuffer(buffer: ArrayBuffer): { text: string; encoding: string } {
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buffer), encoding: "utf-8" };
  } catch {
    // Orbits exports have historically shipped as Windows-1252 (not
    // confirmed in MYLAPS docs directly — see docs/dev/formats.md). Applied
    // as a general fallback since other clubs' timing software is often
    // similarly aged Windows desktop tooling.
    return { text: new TextDecoder("windows-1252").decode(buffer), encoding: "windows-1252" };
  }
}

export function buildRow(
  rawRow: Record<string, string>,
  columnMap: Map<string, ColumnResolution>,
  rowIndex: number,
  warnings: ParseWarning[]
): ParsedRow {
  const values: Partial<Record<string, string>> = {};
  for (const [header, value] of Object.entries(rawRow)) {
    const field = columnMap.get(header);
    if (field && field !== "known_unmodeled") {
      values[field] = value;
    }
  }

  const statusToken =
    detectStatusToken(values.position) ??
    detectStatusToken(values.laps) ??
    detectStatusToken(values.totalTimeMs);

  const driverName = (values.driverName ?? "").trim();
  if (!driverName) {
    warnings.push({
      code: "missing_driver_name",
      message: `Row ${rowIndex + 1} has no driver name`,
      rowIndex,
    });
  }

  let position: number | null = null;
  if (!statusToken && values.position) {
    const parsed = Number(values.position);
    if (Number.isInteger(parsed) && parsed > 0) {
      position = parsed;
    } else {
      warnings.push({
        code: "unparseable_position",
        message: `Row ${rowIndex + 1}: could not parse position "${values.position}"`,
        rowIndex,
      });
    }
  }

  let laps: number | undefined;
  if (!statusToken && values.laps) {
    const parsed = Number(values.laps);
    if (Number.isInteger(parsed) && parsed >= 0) {
      laps = parsed;
    } else {
      warnings.push({
        code: "unparseable_laps",
        message: `Row ${rowIndex + 1}: could not parse laps "${values.laps}"`,
        rowIndex,
      });
    }
  }

  let totalTimeMs: number | undefined;
  if (!statusToken && values.totalTimeMs) {
    const parsed = parseDurationMs(values.totalTimeMs);
    if (parsed !== null) {
      totalTimeMs = parsed;
    } else {
      warnings.push({
        code: "unparseable_total_time",
        message: `Row ${rowIndex + 1}: could not parse total time "${values.totalTimeMs}"`,
        rowIndex,
      });
    }
  }

  let bestLapMs: number | undefined;
  if (values.bestLapMs) {
    const parsed = parseDurationMs(values.bestLapMs);
    if (parsed !== null) {
      bestLapMs = parsed;
    } else {
      warnings.push({
        code: "unparseable_best_lap",
        message: `Row ${rowIndex + 1}: could not parse best lap "${values.bestLapMs}"`,
        rowIndex,
      });
    }
  }

  let gapMs: number | undefined;
  if (values.gapMs) {
    const parsed = parseGapMs(values.gapMs);
    if (parsed !== null) {
      gapMs = parsed;
    } else {
      warnings.push({
        code: "unparseable_gap",
        message: `Row ${rowIndex + 1}: could not parse gap "${values.gapMs}"`,
        rowIndex,
      });
    }
  }

  let status: ResultStatus;
  if (statusToken) {
    status = statusToken;
  } else if (position !== null) {
    status = "finished";
  } else {
    status = "unknown";
    warnings.push({
      code: "unknown_status",
      message: `Row ${rowIndex + 1}: could not determine finish status`,
      rowIndex,
    });
  }

  return {
    position,
    driverName,
    driverNumber: values.driverNumber?.trim() || undefined,
    laps,
    bestLapMs,
    totalTimeMs,
    gapMs,
    status,
    className: values.className?.trim() || undefined,
    rawRow,
  };
}
