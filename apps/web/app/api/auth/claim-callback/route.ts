import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { drivers } from "@paddockboard/db/schema";
import { verifyDriverClaimToken, findOrCreateUserByEmail, createSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  try {
    const { email, driverId } = await verifyDriverClaimToken(token);
    const user = await findOrCreateUserByEmail(email);

    const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
    if (!driver) {
      return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
    }

    // Already claimed by this same user (e.g. link clicked twice) is fine;
    // claimed by someone else means the race was lost between request and
    // click -- reject rather than silently overwrite another user's claim.
    if (driver.claimedUserId && driver.claimedUserId !== user.id) {
      return NextResponse.redirect(new URL(`/d/${driverId}?claim=taken`, request.url));
    }
    if (!driver.claimedUserId) {
      await db.update(drivers).set({ claimedUserId: user.id }).where(eq(drivers.id, driverId));
    }

    await createSession(user);
    return NextResponse.redirect(new URL(`/d/${driverId}?claim=success`, request.url));
  } catch (err) {
    console.error("Driver-claim verification failed", err);
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }
}
