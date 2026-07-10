import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { editResultSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { results, resultEdits } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getResultWithClub } from "@/lib/ownership";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = editResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const found = await getResultWithClub(id);
  if (!found || found.club.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { reason, ...changes } = parsed.data;

  const previousValues = {
    position: found.result.position,
    status: found.result.status,
    laps: found.result.laps,
    bestLapMs: found.result.bestLapMs,
    totalTimeMs: found.result.totalTimeMs,
    gapMs: found.result.gapMs,
    pointsOverride: found.result.pointsOverride,
  };
  const newValues = { ...previousValues, ...changes };

  // Write the audit row before updating -- see docs/dev/architecture.md
  // for why (no transaction support under neon-http).
  await db.insert(resultEdits).values({
    resultId: id,
    editedByUserId: user.id,
    reason,
    previousValues,
    newValues,
  });

  const [updated] = await db.update(results).set(changes).where(eq(results.id, id)).returning();

  return NextResponse.json({ result: updated });
}
