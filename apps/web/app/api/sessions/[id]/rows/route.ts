import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { commitRowsSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { classes, results } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSessionWithClub, hasClubAccess } from "@/lib/ownership";
import { findOrCreateDriver } from "@/lib/drivers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getSessionWithClub(id);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = commitRowsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const distinctClassIds = [...new Set(parsed.data.rows.map((r) => r.classId))];
  const matchingClasses = await db
    .select()
    .from(classes)
    .where(inArray(classes.id, distinctClassIds));
  const validClassIds = new Set(
    matchingClasses.filter((c) => c.seasonId === result.season.id).map((c) => c.id)
  );
  if (validClassIds.size !== distinctClassIds.length) {
    return NextResponse.json(
      { error: "One or more rows have a class that doesn't belong to this session's season" },
      { status: 400 }
    );
  }

  // Replace-on-commit: re-saving after edits shouldn't accumulate
  // duplicate rows. No transaction wrapper — the neon-http driver doesn't
  // support one, so delete-then-insert is the only option under it, not
  // just a simplification.
  await db.delete(results).where(eq(results.sessionId, id));

  // Sequential (not Promise.all) so each row's dedup lookup sees drivers
  // created by earlier rows in this same commit.
  const rowsToInsert = [];
  for (const row of parsed.data.rows) {
    const driverId = await findOrCreateDriver(result.club.id, {
      driverName: row.driverName,
      driverNumber: row.driverNumber,
    });
    rowsToInsert.push({
      sessionId: id,
      driverId,
      classId: row.classId,
      position: row.position,
      status: row.status,
      laps: row.laps,
      bestLapMs: row.bestLapMs,
      totalTimeMs: row.totalTimeMs,
      gapMs: row.gapMs,
    });
  }

  if (rowsToInsert.length > 0) {
    await db.insert(results).values(rowsToInsert);
  }

  return NextResponse.json({ ok: true, count: rowsToInsert.length });
}
