import { z } from "zod";

export const createSeasonSchema = z.object({
  clubId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  year: z.number().int().min(1990).max(2100),
});

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;
