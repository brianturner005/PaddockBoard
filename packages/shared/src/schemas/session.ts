import { z } from "zod";

export const sessionTypeSchema = z.enum(["practice", "qualifying", "heat", "final", "feature"]);

// Only the sources with a working entry path in Phase 0. orbits_html and
// generic_csv are valid per the domain model but have no parser/UI yet.
export const sessionSourceSchema = z.enum(["orbits_csv", "manual"]);

export const createSessionSchema = z.object({
  eventId: z.string().uuid(),
  type: sessionTypeSchema,
  name: z.string().trim().min(2).max(200),
  source: sessionSourceSchema,
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
