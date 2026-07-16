import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { changePasswordSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { users } from "@paddockboard/db/schema";
import { getCurrentUser, findUserById, verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await findUserById(sessionUser.id);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accounts created via a club-member invite or driver claim (and never
  // logged in since) have no password yet -- there's nothing to check
  // against, so this has to be a "set your first password" flow instead,
  // same as an existing pre-Phase-9 account. Forgot-password already
  // handles that.
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "Your account doesn't have a password yet. Use \"Forgot password\" from the login page to set one." },
      { status: 400 }
    );
  }

  const isCorrect = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!isCorrect) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
