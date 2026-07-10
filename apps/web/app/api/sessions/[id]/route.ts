import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { sessions } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSessionWithClub } from "@/lib/ownership";

const patchSessionSchema = z.object({
  countsForStandings: z.boolean(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getSessionWithClub(id);
  if (!result || result.club.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [session] = await db
    .update(sessions)
    .set({ countsForStandings: parsed.data.countsForStandings })
    .where(eq(sessions.id, id))
    .returning();

  return NextResponse.json({ session });
}
