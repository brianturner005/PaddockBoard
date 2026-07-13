import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { users } from "@paddockboard/db/schema";
import { verifySignupConfirmToken, findUserByEmail, createSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/signup?error=missing_token", request.url));
  }

  try {
    const { email, passwordHash } = await verifySignupConfirmToken(token);

    const existing = await findUserByEmail(email);
    // Re-check at confirm time, not just at signup time -- someone else
    // could have confirmed a signup or reset a password for this email in
    // the window between this link being sent and clicked.
    if (existing?.passwordHash) {
      return NextResponse.redirect(new URL("/login?error=already_registered", request.url));
    }

    const user = existing
      ? (await db.update(users).set({ passwordHash }).where(eq(users.id, existing.id)).returning())[0]
      : (await db.insert(users).values({ email, passwordHash }).returning())[0];

    await createSession({ id: user.id, email: user.email });
    return NextResponse.redirect(new URL("/admin", request.url));
  } catch (err) {
    console.error("Signup confirmation failed", err);
    return NextResponse.redirect(new URL("/signup?error=invalid_token", request.url));
  }
}
