import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createSessionSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { sessions } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getEventWithClub } from "@/lib/ownership";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await getEventWithClub(parsed.data.eventId);
  if (!result || result.club.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [session] = await db
    .insert(sessions)
    .values({
      eventId: parsed.data.eventId,
      type: parsed.data.type,
      name: parsed.data.name,
      source: parsed.data.source,
      publicSlug: nanoid(10),
      countsForStandings: parsed.data.type === "final" || parsed.data.type === "feature",
    })
    .returning();

  return NextResponse.json({ session }, { status: 201 });
}
