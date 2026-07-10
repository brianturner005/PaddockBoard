import type { CanonicalField, ParsedSession, SupportedFormat } from "./types";
import { parseOrbitsCsv } from "./orbits-csv/parse";
import { parseGenericCsv } from "./generic-csv/parse";

export function parse(
  buffer: ArrayBuffer,
  format: SupportedFormat,
  options?: { columnMapping?: Record<string, CanonicalField> }
): ParsedSession {
  switch (format) {
    case "orbits_csv":
      return parseOrbitsCsv(buffer);
    case "generic_csv":
      if (!options?.columnMapping) {
        throw new Error("generic_csv requires a columnMapping");
      }
      return parseGenericCsv(buffer, options.columnMapping);
    default: {
      const exhaustiveCheck: never = format;
      throw new Error(`Unsupported format: ${exhaustiveCheck}`);
    }
  }
}

export { readCsvHeaders } from "./generic-csv/parse";
export * from "./types";
