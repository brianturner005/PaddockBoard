import { z } from "zod";

// "unknown" is a parser-only concept (low-confidence row, needs human
// review) — it's never a valid persisted result status. Rows must be
// resolved to a real status in the preview before they can be committed.
export const committableStatusSchema = z.enum(["finished", "dnf", "dns", "dsq"]);

export const commitRowSchema = z.object({
  position: z.number().int().positive().nullable(),
  driverName: z.string().trim().min(1),
  driverNumber: z.string().trim().min(1).optional(),
  laps: z.number().int().min(0).optional(),
  bestLapMs: z.number().int().positive().optional(),
  totalTimeMs: z.number().int().positive().optional(),
  gapMs: z.number().int().optional(),
  status: committableStatusSchema,
});

export const commitRowsSchema = z.object({
  classId: z.string().uuid(),
  rows: z.array(commitRowSchema).min(1),
});

export type CommitRow = z.infer<typeof commitRowSchema>;
export type CommitRowsInput = z.infer<typeof commitRowsSchema>;
