import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { updateEventSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { events } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getEventWithClub, hasClubAccess } from "@/lib/ownership";
import { getEventDeleteImpact, executeEventDelete } from "@/lib/cascade-delete";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getEventWithClub(id);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(events)
    .set({
      name: parsed.data.name,
      venue: parsed.data.venue,
      eventDate: parsed.data.eventDate,
      roundNumber: parsed.data.roundNumber,
    })
    .where(eq(events.id, id))
    .returning();

  return NextResponse.json({ event: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getEventWithClub(id);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const confirmed = request.nextUrl.searchParams.get("confirm") === "true";
  if (!confirmed) {
    const impact = await getEventDeleteImpact(id);
    return NextResponse.json({ requiresConfirmation: true, impact });
  }

  await executeEventDelete(id);
  return NextResponse.json({ deleted: true });
}
