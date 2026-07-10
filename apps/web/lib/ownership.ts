import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { clubs, seasons, events, sessions } from "@paddockboard/db/schema";

export async function getClubById(clubId: string) {
  const rows = await db.select().from(clubs).where(eq(clubs.id, clubId)).limit(1);
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
