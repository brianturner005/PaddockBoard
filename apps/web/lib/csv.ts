// Minimal RFC 4180-ish CSV writer -- quotes a field only when it contains a
// comma, quote, or newline, doubling any internal quotes. No library needed
// for output this simple.
function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  return lines.join("\r\n") + "\r\n";
}

// Strips characters that are awkward or unsafe in a downloaded filename,
// keeping the export's name recognizable without needing full RFC 5987
// encoding for the common case.
export function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "export";
}
