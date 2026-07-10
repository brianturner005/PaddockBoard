import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { sessions, events, seasons, clubs, results, drivers, classes } from "@paddockboard/db/schema";

export interface PublicResultRow {
  position: number | null;
  driverName: string;
  driverNumber: string | null;
  laps: number | null;
  bestLapMs: number | null;
  totalTimeMs: number | null;
  gapMs: number | null;
  status: string;
}

export interface PublicClassResults {
  classId: string;
  className: string;
  rows: PublicResultRow[];
}

export interface PublicSessionPayload {
  sessionName: string;
  sessionType: string;
  publishedAt: string | null;
  eventName: string;
  venue: string | null;
  eventDate: string;
  seasonName: string;
  clubName: string;
  clubSlug: string;
  classes: PublicClassResults[];
}

export type PublicSessionResult =
  | { status: "not_found" }
  | { status: "not_published" }
  | { status: "ok"; data: PublicSessionPayload };

// cache() dedupes this within a single request — generateMetadata and the
// page component both need it, and this way that's one DB round trip, not two.
export const getPublicSessionData = cache(async (slug: string): Promise<PublicSessionResult> => {
  const rows = await db
    .select({ session: sessions, event: events, season: seasons, club: clubs })
    .from(sessions)
    .innerJoin(events, eq(sessions.eventId, events.id))
    .innerJoin(seasons, eq(events.seasonId, seasons.id))
    .innerJoin(clubs, eq(seasons.clubId, clubs.id))
    .where(eq(sessions.publicSlug, slug))
    .limit(1);

  const found = rows[0];
  if (!found) {
    return { status: "not_found" };
  }
  if (found.session.status !== "published") {
    return { status: "not_published" };
  }

  const resultRows = await db
    .select({
      classId: classes.id,
      className: classes.name,
      position: results.position,
      status: results.status,
      laps: results.laps,
      bestLapMs: results.bestLapMs,
      totalTimeMs: results.totalTimeMs,
      gapMs: results.gapMs,
      driverName: drivers.displayName,
      driverNumber: drivers.number,
    })
    .from(results)
    .innerJoin(drivers, eq(results.driverId, drivers.id))
    .innerJoin(classes, eq(results.classId, classes.id))
    .where(eq(results.sessionId, found.session.id));

  const classMap = new Map<string, PublicClassResults>();
  for (const row of resultRows) {
    let entry = classMap.get(row.classId);
    if (!entry) {
      entry = { classId: row.classId, className: row.className, rows: [] };
      classMap.set(row.classId, entry);
    }
    entry.rows.push({
      position: row.position,
      driverName: row.driverName,
      driverNumber: row.driverNumber,
      laps: row.laps,
      bestLapMs: row.bestLapMs,
      totalTimeMs: row.totalTimeMs,
      gapMs: row.gapMs,
      status: row.status,
    });
  }

  // Finishers by position, then everyone else (DNF/DNS/DSQ) after.
  for (const entry of classMap.values()) {
    entry.rows.sort((a, b) => {
      if (a.position === null && b.position === null) return 0;
      if (a.position === null) return 1;
      if (b.position === null) return -1;
      return a.position - b.position;
    });
  }

  return {
    status: "ok",
    data: {
      sessionName: found.session.name,
      sessionType: found.session.type,
      publishedAt: found.session.publishedAt ? found.session.publishedAt.toISOString() : null,
      eventName: found.event.name,
      venue: found.event.venue,
      eventDate: found.event.eventDate,
      seasonName: found.season.name,
      clubName: found.club.name,
      clubSlug: found.club.slug,
      classes: Array.from(classMap.values()),
    },
  };
});
