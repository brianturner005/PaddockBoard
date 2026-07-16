import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { updateSeasonSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { seasons } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSeasonWithClub, hasClubAccess } from "@/lib/ownership";
import { getSeasonDeleteImpact, executeSeasonDelete } from "@/lib/cascade-delete";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getSeasonWithClub(id);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSeasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(seasons)
    .set({ name: parsed.data.name, year: parsed.data.year })
    .where(eq(seasons.id, id))
    .returning();

  return NextResponse.json({ season: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getSeasonWithClub(id);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const confirmed = request.nextUrl.searchParams.get("confirm") === "true";
  if (!confirmed) {
    const impact = await getSeasonDeleteImpact(id);
    return NextResponse.json({ requiresConfirmation: true, impact });
  }

  await executeSeasonDelete(id);
  return NextResponse.json({ deleted: true });
}
