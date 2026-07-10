import { NextRequest, NextResponse } from "next/server";
import { createSeasonSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { seasons } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getClubById, hasClubAccess } from "@/lib/ownership";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSeasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const club = await getClubById(parsed.data.clubId);
  if (!club || !(await hasClubAccess(club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [season] = await db
    .insert(seasons)
    .values({ clubId: parsed.data.clubId, name: parsed.data.name, year: parsed.data.year })
    .returning();

  return NextResponse.json({ season }, { status: 201 });
}
