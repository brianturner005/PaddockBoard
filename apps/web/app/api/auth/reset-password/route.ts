import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { resetPasswordSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { users } from "@paddockboard/db/schema";
import { verifyPasswordResetToken, findUserByEmail, hashPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let email: string;
  try {
    email = await verifyPasswordResetToken(parsed.data.token);
  } catch {
    return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  await createSession({ id: user.id, email: user.email });

  return NextResponse.json({ ok: true });
}
