import { z } from "zod";

const emailField = z.string().trim().toLowerCase().email();
// NIST-style guidance: length over composition rules -- no forced
// mix of upper/lower/digit/symbol, just a reasonable minimum.
const passwordField = z.string().min(8).max(200);

// Reused wherever only an email is needed to kick off a flow (driver
// claiming, forgot-password) -- same shape, no reason for two schemas.
export const emailOnlySchema = z.object({
  email: emailField,
});

export const signupSchema = z.object({
  email: emailField,
  password: passwordField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(200),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordField,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
