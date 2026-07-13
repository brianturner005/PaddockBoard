import { z } from "zod";

export const createSubscriptionSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    classId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
  })
  .refine((data) => Boolean(data.classId) !== Boolean(data.driverId), {
    message: "Provide exactly one of classId or driverId",
  });

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
