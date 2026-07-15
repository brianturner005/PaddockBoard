import { and, eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { clubs, clubMembers, seasons, classes, events, sessions, results } from "@paddockboard/db/schema";

export async function getClubById(clubId: string) {
  const rows = await db.select().from(clubs).where(eq(clubs.id, clubId)).limit(1);
  return rows[0] ?? null;
}

// The access-control check every route/page should use once it has a
// clubId in hand — any member (owner or editor) can manage the club's
// data. See `getClubMembership` for call sites that also need to know
// *which* role, e.g. to gate member management to owners.
export async function hasClubAccess(clubId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: clubMembers.id })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function getClubMembership(clubId: string, userId: string) {
  const rows = await db
    .select()
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSeasonWithClub(seasonId: string) {
  const rows = await db
    .select({ season: seasons, club: clubs })
    .from(seasons)
    .innerJoin(clubs, eq(seasons.clubId, clubs.id))
    .where(eq(seasons.id, seasonId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getClassWithClub(classId: string) {
  const rows = await db
    .select({ class: classes, season: seasons, club: clubs })
    .from(classes)
    .innerJoin(seasons, eq(classes.seasonId, seasons.id))
    .innerJoin(clubs, eq(seasons.clubId, clubs.id))
    .where(eq(classes.id, classId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEventWithClub(eventId: string) {
  const rows = await db
    .select({ event: events, season: seasons, club: clubs })
    .from(events)
    .innerJoin(seasons, eq(events.seasonId, seasons.id))
    .innerJoin(clubs, eq(seasons.clubId, clubs.id))
    .where(eq(events.id, eventId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSessionWithClub(sessionId: string) {
  const rows = await db
    .select({ session: sessions, event: events, season: seasons, club: clubs })
    .from(sessions)
    .innerJoin(events, eq(sessions.eventId, events.id))
    .innerJoin(seasons, eq(events.seasonId, seasons.id))
    .innerJoin(clubs, eq(seasons.clubId, clubs.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getResultWithClub(resultId: string) {
  const rows = await db
    .select({ result: results, session: sessions, club: clubs })
    .from(results)
    .innerJoin(sessions, eq(results.sessionId, sessions.id))
    .innerJoin(events, eq(sessions.eventId, events.id))
    .innerJoin(seasons, eq(events.seasonId, seasons.id))
    .innerJoin(clubs, eq(seasons.clubId, clubs.id))
    .where(eq(results.id, resultId))
    .limit(1);
  return rows[0] ?? null;
}
