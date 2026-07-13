import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createSubscriptionSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { subscriptions, classes, drivers } from "@paddockboard/db/schema";
import { sendSubscriptionConfirmEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, classId, driverId } = parsed.data;

  let label: string;
  if (classId) {
    const [cls] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
    if (!cls) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    label = `${cls.name} standings`;
  } else {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId!)).limit(1);
    if (!driver) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    label = driver.displayName;
  }

  const targetFilter = classId ? eq(subscriptions.classId, classId) : eq(subscriptions.driverId, driverId!);
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.email, email), targetFilter))
    .limit(1);

  const subscription =
    existing ??
    (
      await db
        .insert(subscriptions)
        .values({ email, classId, driverId })
        .returning()
    )[0];

  if (!subscription.confirmedAt) {
    try {
      await sendSubscriptionConfirmEmail(email, subscription.id, label);
    } catch (err) {
      console.error("Failed to send subscription-confirm email", err);
      return NextResponse.json({ error: "Could not send confirmation email" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
