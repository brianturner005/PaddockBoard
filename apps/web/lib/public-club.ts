import { cache } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { clubs, seasons, classes, events, sessions } from "@paddockboard/db/schema";

export interface PublicSessionLink {
  publicSlug: string;
  name: string;
  type: string;
}

export interface PublicEventRow {
  id: string;
  name: string;
  venue: string | null;
  eventDate: string;
  sessions: PublicSessionLink[];
}

export interface PublicSeasonRow {
  id: string;
  name: string;
  year: number;
  status: "active" | "archived";
  classes: { id: string; name: string }[];
  events: PublicEventRow[];
}

export interface PublicClubPayload {
  name: string;
  slug: string;
  seasons: PublicSeasonRow[];
}

export type PublicClubResult = { status: "not_found" } | { status: "ok"; data: PublicClubPayload };

// cache() dedupes this within a single request — generateMetadata and the
// page component both need it, same pattern as public-session.ts.
export const getPublicClubData = cache(async (slug: string): Promise<PublicClubResult> => {
  const clubRows = await db.select().from(clubs).where(eq(clubs.slug, slug)).limit(1);
  const club = clubRows[0];
  if (!club) {
    return { status: "not_found" };
  }

  const seasonRows = await db.select().from(seasons).where(eq(seasons.clubId, club.id));
  const seasonIds = seasonRows.map((s) => s.id);

  const [classRows, eventRows] =
    seasonIds.length === 0
      ? [[], []]
      : await Promise.all([
          db.select().from(classes).where(inArray(classes.seasonId, seasonIds)),
          db.select().from(events).where(inArray(events.seasonId, seasonIds)),
        ]);

  const eventIds = eventRows.map((e) => e.id);
  const sessionRows =
    eventIds.length === 0
      ? []
      : await db
          .select({ eventId: sessions.eventId, publicSlug: sessions.publicSlug, name: sessions.name, type: sessions.type })
          .from(sessions)
          .where(and(inArray(sessions.eventId, eventIds), eq(sessions.status, "published")));

  const publishedSessionsByEvent = new Map<string, PublicSessionLink[]>();
  for (const row of sessionRows) {
    const list = publishedSessionsByEvent.get(row.eventId) ?? [];
    list.push({ publicSlug: row.publicSlug, name: row.name, type: row.type });
    publishedSessionsByEvent.set(row.eventId, list);
  }

  const eventsBySeason = new Map<string, PublicEventRow[]>();
  for (const event of eventRows) {
    const eventSessions = publishedSessionsByEvent.get(event.id) ?? [];
    if (eventSessions.length === 0) continue; // no public content for this event yet
    const list = eventsBySeason.get(event.seasonId) ?? [];
    list.push({
      id: event.id,
      name: event.name,
      venue: event.venue,
      eventDate: event.eventDate,
      sessions: eventSessions,
    });
    eventsBySeason.set(event.seasonId, list);
  }
  for (const list of eventsBySeason.values()) {
    list.sort((a, b) => (a.eventDate < b.eventDate ? 1 : a.eventDate > b.eventDate ? -1 : 0));
  }

  const classesBySeason = new Map<string, { id: string; name: string }[]>();
  for (const cls of classRows) {
    const list = classesBySeason.get(cls.seasonId) ?? [];
    list.push({ id: cls.id, name: cls.name });
    classesBySeason.set(cls.seasonId, list);
  }

  const seasonPayload: PublicSeasonRow[] = seasonRows
    .map((season) => ({
      id: season.id,
      name: season.name,
      year: season.year,
      status: season.status,
      classes: classesBySeason.get(season.id) ?? [],
      events: eventsBySeason.get(season.id) ?? [],
    }))
    .sort((a, b) => b.year - a.year);

  return {
    status: "ok",
    data: {
      name: club.name,
      slug: club.slug,
      seasons: seasonPayload,
    },
  };
});

export interface PublicClubDirectoryRow {
  name: string;
  slug: string;
}

export async function getPublicClubDirectory(): Promise<PublicClubDirectoryRow[]> {
  const rows = await db.select({ name: clubs.name, slug: clubs.slug }).from(clubs);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
