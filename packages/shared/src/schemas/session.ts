import { z } from "zod";

export const sessionTypeSchema = z.enum(["practice", "qualifying", "heat", "final", "feature"]);

// orbits_html is valid per the domain model but has no parser/UI yet.
export const sessionSourceSchema = z.enum(["orbits_csv", "generic_csv", "manual"]);

export const createSessionSchema = z.object({
  eventId: z.string().uuid(),
  type: sessionTypeSchema,
  name: z.string().trim().min(2).max(200),
  source: sessionSourceSchema,
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
