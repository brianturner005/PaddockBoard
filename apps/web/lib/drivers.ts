import { and, eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { drivers } from "@paddockboard/db/schema";

// Dedup key is (clubId, number) when a number is present, else
// (clubId, displayName) exact match. Transponder-based matching isn't
// available yet — the results export columns being parsed don't carry
// transponder IDs (that's the entry-list export, a different file).
export async function findOrCreateDriver(
  clubId: string,
  row: { driverName: string; driverNumber?: string }
): Promise<string> {
  const existing = row.driverNumber
    ? await db
        .select({ id: drivers.id })
        .from(drivers)
        .where(and(eq(drivers.clubId, clubId), eq(drivers.number, row.driverNumber)))
        .limit(1)
    : await db
        .select({ id: drivers.id })
        .from(drivers)
        .where(and(eq(drivers.clubId, clubId), eq(drivers.displayName, row.driverName)))
        .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const [created] = await db
    .insert(drivers)
    .values({ clubId, displayName: row.driverName, number: row.driverNumber ?? null })
    .returning();

  return created.id;
}
