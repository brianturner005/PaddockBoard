import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { subscriptions } from "@paddockboard/db/schema";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [subscription] = await db
    .update(subscriptions)
    .set({ confirmedAt: new Date() })
    .where(eq(subscriptions.id, id))
    .returning();

  if (!subscription) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const target = subscription.classId
    ? `/standings/${subscription.classId}`
    : `/d/${subscription.driverId}`;

  return NextResponse.redirect(new URL(`${target}?subscribed=confirmed`, request.url));
}
