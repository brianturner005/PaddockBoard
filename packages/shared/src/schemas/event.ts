import { z } from "zod";

export const createEventSchema = z.object({
  seasonId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  venue: z.string().trim().max(200).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  roundNumber: z.number().int().min(1).max(999).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z.object({
  name: z.string().trim().min(2).max(200),
  // Nullable (not just optional) so an edit form can explicitly clear a
  // previously-set venue/round number instead of only ever adding one.
  venue: z.string().trim().max(200).nullable(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  roundNumber: z.number().int().min(1).max(999).nullable(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;
