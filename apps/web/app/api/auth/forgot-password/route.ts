import { NextRequest, NextResponse } from "next/server";
import { emailOnlySchema } from "@paddockboard/shared";
import { findUserByEmail, createPasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = emailOnlySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Always respond ok regardless of whether the account exists, so this
  // endpoint can't be used to enumerate registered emails.
  const user = await findUserByEmail(parsed.data.email);
  if (user) {
    try {
      const token = await createPasswordResetToken(parsed.data.email);
      await sendPasswordResetEmail(parsed.data.email, token);
    } catch (err) {
      console.error("Failed to send password-reset email", err);
    }
  }

  return NextResponse.json({ ok: true });
}
