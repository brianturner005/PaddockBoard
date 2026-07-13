import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@paddockboard/shared";
import { findUserByEmail, hashPassword, createSignupConfirmToken } from "@/lib/auth";
import { sendSignupConfirmEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try logging in instead." },
      { status: 409 }
    );
  }

  try {
    const passwordHash = await hashPassword(password);
    const token = await createSignupConfirmToken(email, passwordHash);
    await sendSignupConfirmEmail(email, token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to send signup-confirm email", err);
    return NextResponse.json({ error: "Could not send confirmation email" }, { status: 500 });
  }
}
