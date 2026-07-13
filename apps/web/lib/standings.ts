import { cache } from "react";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { classes, seasons, clubs, pointsSchemes, events, sessions, results, drivers } from "@paddockboard/db/schema";
import { computeStandings, type RoundForStandings, type DriverStanding } from "@paddockboard/standings";

export interface StandingsRow extends DriverStanding {
  driverName: string;
  driverNumber: string | null;
  positionChange: number | null;
}

export interface ClassStandingsPayload {
  className: string;
  seasonName: string;
  clubName: string;
  clubSlug: string;
  rows: StandingsRow[];
}

export type ClassStandingsResult = { status: "not_found" } | { status: "ok"; data: ClassStandingsPayload };

// cache() dedupes within a request the same way lib/public-session.ts does.
export const getClassStandingsData = cache(async (classId: string): Promise<ClassStandingsResult> => {
  const classRows = await db
    .select({ cls: classes, season: seasons, club: clubs, scheme: pointsSchemes })
    .from(classes)
    .innerJoin(seasons, eq(classes.seasonId, seasons.id))
    .innerJoin(clubs, eq(seasons.clubId, clubs.id))
    .innerJoin(pointsSchemes, eq(classes.pointsSchemeId, pointsSchemes.id))
    .where(eq(classes.id, classId))
    .limit(1);

  const found = classRows[0];
  if (!found) {
    return { status: "not_found" };
  }

  const seasonEvents = await db
    .select()
    .from(events)
    .where(eq(events.seasonId, found.season.id))
    .orderBy(asc(events.roundNumber));

  const rounds: RoundForStandings[] = [];
  const driverInfo = new Map<string, { name: string; number: string | null }>();

  for (const event of seasonEvents) {
    const [scoringSession] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.eventId, event.id),
          eq(sessions.countsForStandings, true),
          eq(sessions.status, "published")
        )
      )
      .limit(1);

    if (!scoringSession) continue;

    const sessionResults = await db
      .select({
        driverId: results.driverId,
        classId: results.classId,
        position: results.position,
        status: results.status,
        bestLapMs: results.bestLapMs,
        pointsOverride: results.pointsOverride,
        penalties: results.penalties,
        driverName: drivers.displayName,
        driverNumber: drivers.number,
      })
      .from(results)
      .innerJoin(drivers, eq(results.driverId, drivers.id))
      .where(eq(results.sessionId, scoringSession.id));

    for (const r of sessionResults) {
      driverInfo.set(r.driverId, { name: r.driverName, number: r.driverNumber });
    }

    rounds.push({
      eventId: event.id,
      roundNumber: event.roundNumber,
      results: sessionResults.map((r) => ({
        driverId: r.driverId,
        classId: r.classId,
        position: r.position,
        status: r.status,
        bestLapMs: r.bestLapMs,
        pointsOverride: r.pointsOverride,
        penaltyPoints: r.penalties.reduce((sum, p) => sum + p.pointsDelta, 0),
      })),
    });
  }

  const scheme = {
    positionPoints: found.scheme.positionPoints,
    poleBonus: found.scheme.poleBonus,
    fastestLapBonus: found.scheme.fastestLapBonus,
    dropRounds: found.scheme.dropRounds,
  };

  const currentStandings = computeStandings(rounds, scheme, classId);

  // "Since last round" = compare against standings computed with the most
  // recent scored round left out. Only meaningful once there's more than one.
  let previousPositionByDriver = new Map<string, number>();
  if (rounds.length > 1) {
    const previousStandings = computeStandings(rounds.slice(0, -1), scheme, classId);
    previousPositionByDriver = new Map(previousStandings.map((s) => [s.driverId, s.position]));
  }

  const rowsOut: StandingsRow[] = currentStandings.map((s) => {
    const prevPos = previousPositionByDriver.get(s.driverId);
    const info = driverInfo.get(s.driverId);
    return {
      ...s,
      driverName: info?.name ?? "Unknown driver",
      driverNumber: info?.number ?? null,
      positionChange: prevPos !== undefined ? prevPos - s.position : null,
    };
  });

  return {
    status: "ok",
    data: {
      className: found.cls.name,
      seasonName: `${found.season.name} (${found.season.year})`,
      clubName: found.club.name,
      clubSlug: found.club.slug,
      rows: rowsOut,
    },
  };
});
