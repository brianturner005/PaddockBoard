// Parses "H:MM:SS.mmm", "MM:SS.mmm", or plain "SS.mmm" into milliseconds.
// Exact real-world Orbits time formatting isn't documented anywhere found
// (see docs/dev/formats.md) — this covers the conventions typical of timing
// software and is exercised against synthetic fixtures.
export function parseDurationMs(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":");
  if (parts.length > 3 || parts.some((p) => p.trim() === "")) {
    return null;
  }

  const secondsPart = parts[parts.length - 1];
  if (!/^\d+(\.\d+)?$/.test(secondsPart)) {
    return null;
  }

  const seconds = Number(secondsPart);
  const minutes = parts.length >= 2 ? Number(parts[parts.length - 2]) : 0;
  const hours = parts.length === 3 ? Number(parts[0]) : 0;

  if (![minutes, hours].every((n) => Number.isInteger(n) && n >= 0)) {
    return null;
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return Math.round(totalSeconds * 1000);
}

// Gap/difference fields are typically a signed plain-seconds value ("+1.234")
// rather than clock format, but fall back to parseDurationMs for safety.
export function parseGapMs(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\+/, "");
  if (!trimmed) return null;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Math.round(Number(trimmed) * 1000);
  }

  return parseDurationMs(trimmed);
}
