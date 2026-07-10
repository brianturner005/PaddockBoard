import { z } from "zod";

export const updatePointsSchemeSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  positionPoints: z.record(z.string(), z.number().int()),
  poleBonus: z.number().int().min(0),
  fastestLapBonus: z.number().int().min(0),
  dropRounds: z.number().int().min(0),
  countbackRule: z.string().trim().max(200).optional(),
});

export type UpdatePointsSchemeInput = z.infer<typeof updatePointsSchemeSchema>;
