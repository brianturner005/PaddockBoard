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

export const updateSessionSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    type: sessionTypeSchema.optional(),
    countsForStandings: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "No fields to update");

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
