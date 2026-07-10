import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { updateCsvColumnMappingSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { clubs } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getClubById } from "@/lib/ownership";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await getClubById(id);
  if (!club || club.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateCsvColumnMappingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(clubs)
    .set({ csvColumnMapping: parsed.data.columnMapping })
    .where(eq(clubs.id, id))
    .returning();

  return NextResponse.json({ club: updated });
}
