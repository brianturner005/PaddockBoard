import type { ParsedSession, SupportedFormat } from "./types";
import { parseOrbitsCsv } from "./orbits-csv/parse";

export function parse(buffer: ArrayBuffer, format: SupportedFormat): ParsedSession {
  switch (format) {
    case "orbits_csv":
      return parseOrbitsCsv(buffer);
    default: {
      const exhaustiveCheck: never = format;
      throw new Error(`Unsupported format: ${exhaustiveCheck}`);
    }
  }
}

export * from "./types";
