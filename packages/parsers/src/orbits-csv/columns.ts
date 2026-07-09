// Column names sourced from documented MyLaps Orbits results-export fields
// (ORBITS5 manual, MyRacePass's Orbits integration docs) — see
// docs/dev/formats.md for the full research writeup and sources.

export type CanonicalField =
  | "position"
  | "driverNumber"
  | "driverName"
  | "laps"
  | "totalTimeMs"
  | "bestLapMs"
  | "gapMs";

const ALIASES: Record<CanonicalField, string[]> = {
  position: ["pos", "pos.", "position"],
  driverNumber: ["car", "no", "no.", "number", "kart #", "car #"],
  driverName: ["combined name", "name", "driver", "driver name"],
  laps: ["laps", "lap"],
  totalTimeMs: ["total time", "time", "total"],
  bestLapMs: ["best lap", "best lap-time", "best lap time", "fast lap"],
  gapMs: ["difference", "diff", "gap"],
};

// Documented columns we understand but don't model in Phase 0 — recognized,
// not flagged as unrecognized/unexpected.
const KNOWN_UNMODELED = new Set(["last lap time", "last speed", "best speed", "class"]);

export type ColumnResolution = CanonicalField | "known_unmodeled" | null;

export function resolveColumn(header: string): ColumnResolution {
  const normalized = header.trim().toLowerCase();

  for (const [field, aliases] of Object.entries(ALIASES) as [CanonicalField, string[]][]) {
    if (aliases.includes(normalized)) {
      return field;
    }
  }

  if (KNOWN_UNMODELED.has(normalized)) {
    return "known_unmodeled";
  }

  return null;
}
