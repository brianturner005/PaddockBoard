import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@paddockboard/shared";
import { findUserByEmail, verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);

  if (user && !user.passwordHash) {
    return NextResponse.json(
      { error: "This account doesn't have a password set yet. Use “Forgot password” to set one." },
      { status: 401 }
    );
  }

  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession({ id: user.id, email: user.email });
  return NextResponse.json({ ok: true });
}
