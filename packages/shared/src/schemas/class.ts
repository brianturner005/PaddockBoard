import { z } from "zod";

export const createClassSchema = z.object({
  seasonId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
