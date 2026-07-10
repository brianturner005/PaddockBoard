import { z } from "zod";
import { committableStatusSchema } from "./result";

export const editResultSchema = z.object({
  position: z.number().int().positive().nullable().optional(),
  status: committableStatusSchema.optional(),
  laps: z.number().int().min(0).nullable().optional(),
  bestLapMs: z.number().int().positive().nullable().optional(),
  totalTimeMs: z.number().int().positive().nullable().optional(),
  gapMs: z.number().int().nullable().optional(),
  pointsOverride: z.number().int().nullable().optional(),
  reason: z.string().trim().min(1).max(500),
});

export type EditResultInput = z.infer<typeof editResultSchema>;
