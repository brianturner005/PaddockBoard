import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createClubSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { clubs, clubMembers, pointsSchemes } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureUniqueClubSlug } from "@/lib/slug";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({ club: clubs })
    .from(clubMembers)
    .innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
    .where(eq(clubMembers.userId, user.id));
  return NextResponse.json({ clubs: rows.map((r) => r.club) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const slug = await ensureUniqueClubSlug(parsed.data.name);

  const [club] = await db
    .insert(clubs)
    .values({
      name: parsed.data.name,
      slug,
      timezone: parsed.data.timezone,
      ownerUserId: user.id,
    })
    .returning();

  // Every club gets one default points scheme so Classes always have
  // something to reference. Real scheme editing is Phase 1.
  await db.insert(pointsSchemes).values({
    clubId: club.id,
    name: "Default",
  });

  // club_members is the actual access-control source of truth (see
  // lib/ownership.ts) — the creator is always seeded in as owner.
  await db.insert(clubMembers).values({
    clubId: club.id,
    userId: user.id,
    role: "owner",
  });

  return NextResponse.json({ club }, { status: 201 });
}
