import { NextRequest, NextResponse } from "next/server";
import { createEventSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { events } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSeasonWithClub, hasClubAccess } from "@/lib/ownership";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await getSeasonWithClub(parsed.data.seasonId);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [event] = await db
    .insert(events)
    .values({
      seasonId: parsed.data.seasonId,
      name: parsed.data.name,
      venue: parsed.data.venue,
      eventDate: parsed.data.eventDate,
      roundNumber: parsed.data.roundNumber,
    })
    .returning();

  return NextResponse.json({ event }, { status: 201 });
}
