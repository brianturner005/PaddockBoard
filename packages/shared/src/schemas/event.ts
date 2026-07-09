import { z } from "zod";

export const createEventSchema = z.object({
  seasonId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  venue: z.string().trim().max(200).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  roundNumber: z.number().int().min(1).max(999).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
