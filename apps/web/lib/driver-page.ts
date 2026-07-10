import { cache } from "react";
import { eq, and } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { drivers, results, sessions, events, seasons, clubs, classes } from "@paddockboard/db/schema";

export interface DriverResultRow {
  sessionPublicSlug: string;
  sessionName: string;
  eventName: string;
  eventDate: string;
  seasonName: string;
  className: string;
  position: number | null;
  status: string;
  laps: number | null;
  bestLapMs: number | null;
}

export interface DriverPagePayload {
  driverName: string;
  driverNumber: string | null;
  clubName: string;
  clubSlug: string;
  results: DriverResultRow[];
  wins: number;
  podiums: number;
  bestFinish: number | null;
}

export type DriverPageResult = { status: "not_found" } | { status: "ok"; data: DriverPagePayload };

// cache() dedupes within a request, same pattern as public-session.ts / standings.ts.
export const getDriverPageData = cache(async (driverId: string): Promise<DriverPageResult> => {
  const driverRows = await db
    .select({ driver: drivers, club: clubs })
    .from(drivers)
    .innerJoin(clubs, eq(drivers.clubId, clubs.id))
    .where(eq(drivers.id, driverId))
    .limit(1);

  const found = driverRows[0];
  if (!found) {
    return { status: "not_found" };
  }

  // Only published sessions -- a driver's presence in a draft session
  // shouldn't be visible on their public page before the club publishes it.
  const rows = await db
    .select({
      sessionPublicSlug: sessions.publicSlug,
      sessionName: sessions.name,
      eventName: events.name,
      eventDate: events.eventDate,
      seasonName: seasons.name,
      seasonYear: seasons.year,
      className: classes.name,
      position: results.position,
      status: results.status,
      laps: results.laps,
      bestLapMs: results.bestLapMs,
    })
    .from(results)
    .innerJoin(sessions, eq(results.sessionId, sessions.id))
    .innerJoin(events, eq(sessions.eventId, events.id))
    .innerJoin(seasons, eq(events.seasonId, seasons.id))
    .innerJoin(classes, eq(results.classId, classes.id))
    .where(and(eq(results.driverId, driverId), eq(sessions.status, "published")));

  rows.sort((a, b) => (a.eventDate < b.eventDate ? 1 : a.eventDate > b.eventDate ? -1 : 0));

  const wins = rows.filter((r) => r.position === 1).length;
  const podiums = rows.filter((r) => r.position !== null && r.position <= 3).length;
  const finishedPositions = rows.map((r) => r.position).filter((p): p is number => p !== null);
  const bestFinish = finishedPositions.length > 0 ? Math.min(...finishedPositions) : null;

  return {
    status: "ok",
    data: {
      driverName: found.driver.displayName,
      driverNumber: found.driver.number,
      clubName: found.club.name,
      clubSlug: found.club.slug,
      results: rows.map((r) => ({
        sessionPublicSlug: r.sessionPublicSlug,
        sessionName: r.sessionName,
        eventName: r.eventName,
        eventDate: r.eventDate,
        seasonName: `${r.seasonName} (${r.seasonYear})`,
        className: r.className,
        position: r.position,
        status: r.status,
        laps: r.laps,
        bestLapMs: r.bestLapMs,
      })),
      wins,
      podiums,
      bestFinish,
    },
  };
});
