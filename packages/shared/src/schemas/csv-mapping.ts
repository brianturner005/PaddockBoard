import { z } from "zod";

// Mirrors @paddockboard/parsers' CanonicalField union. Not imported directly
// to avoid a cross-package dependency for a handful of stable literals.
export const canonicalFieldSchema = z.enum([
  "position",
  "driverNumber",
  "driverName",
  "laps",
  "totalTimeMs",
  "bestLapMs",
  "gapMs",
]);

export const updateCsvColumnMappingSchema = z.object({
  columnMapping: z.record(z.string(), canonicalFieldSchema),
});

export type UpdateCsvColumnMappingInput = z.infer<typeof updateCsvColumnMappingSchema>;
