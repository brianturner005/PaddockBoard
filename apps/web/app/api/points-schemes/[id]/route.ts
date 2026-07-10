import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { updatePointsSchemeSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { pointsSchemes, clubs } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePointsSchemeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [existing] = await db
    .select({ scheme: pointsSchemes, club: clubs })
    .from(pointsSchemes)
    .innerJoin(clubs, eq(pointsSchemes.clubId, clubs.id))
    .where(eq(pointsSchemes.id, id))
    .limit(1);

  if (!existing || existing.club.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(pointsSchemes)
    .set({
      name: parsed.data.name ?? existing.scheme.name,
      positionPoints: parsed.data.positionPoints,
      poleBonus: parsed.data.poleBonus,
      fastestLapBonus: parsed.data.fastestLapBonus,
      dropRounds: parsed.data.dropRounds,
      countbackRule: parsed.data.countbackRule ?? null,
    })
    .where(eq(pointsSchemes.id, id))
    .returning();

  return NextResponse.json({ pointsScheme: updated });
}
