import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requestLinkSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { drivers } from "@paddockboard/db/schema";
import { createDriverClaimToken } from "@/lib/auth";
import { sendDriverClaimEmail } from "@/lib/email";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = requestLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const [driver] = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  if (!driver) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (driver.claimedUserId) {
    return NextResponse.json({ error: "This driver has already been claimed" }, { status: 409 });
  }

  try {
    const token = await createDriverClaimToken(parsed.data.email, id);
    await sendDriverClaimEmail(parsed.data.email, token, driver.displayName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to send driver-claim email", err);
    return NextResponse.json({ error: "Could not send claim email" }, { status: 500 });
  }
}
