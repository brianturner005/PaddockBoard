import { z } from "zod";

export const clubMemberRoleSchema = z.enum(["owner", "editor"]);

export const addClubMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: clubMemberRoleSchema.default("editor"),
});

export type AddClubMemberInput = z.infer<typeof addClubMemberSchema>;
