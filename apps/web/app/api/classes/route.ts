import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createClassSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { classes, pointsSchemes } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSeasonWithClub } from "@/lib/ownership";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await getSeasonWithClub(parsed.data.seasonId);
  if (!result || result.club.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [scheme] = await db
    .select()
    .from(pointsSchemes)
    .where(eq(pointsSchemes.clubId, result.club.id))
    .limit(1);

  if (!scheme) {
    // Shouldn't happen — every club gets a default scheme at creation.
    return NextResponse.json({ error: "Club has no points scheme" }, { status: 500 });
  }

  const [cls] = await db
    .insert(classes)
    .values({ seasonId: parsed.data.seasonId, name: parsed.data.name, pointsSchemeId: scheme.id })
    .returning();

  return NextResponse.json({ class: cls }, { status: 201 });
}
