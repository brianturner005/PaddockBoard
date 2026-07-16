import { z } from "zod";

export const createClubSchema = z.object({
  name: z.string().trim().min(2).max(200),
  timezone: z.string().trim().min(1).max(100).default("UTC"),
});

export type CreateClubInput = z.infer<typeof createClubSchema>;

export const updateClubSchema = z.object({
  name: z.string().trim().min(2).max(200),
  timezone: z.string().trim().min(1).max(100),
});

export type UpdateClubInput = z.infer<typeof updateClubSchema>;
