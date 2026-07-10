import { z } from "zod";

export const sessionTypeSchema = z.enum(["practice", "qualifying", "heat", "final", "feature"]);

export const sessionSourceSchema = z.enum(["orbits_csv", "orbits_html", "generic_csv", "manual"]);

export const createSessionSchema = z.object({
  eventId: z.string().uuid(),
  type: sessionTypeSchema,
  name: z.string().trim().min(2).max(200),
  source: sessionSourceSchema,
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
