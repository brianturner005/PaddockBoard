import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../client";
import {
  users,
  clubs,
  pointsSchemes,
  seasons,
  classes,
  events,
  sessions,
  drivers,
  results,
} from "../schema";

const CLUB_SLUG = "blue-ridge-kart-club";
const SESSION_SLUG = "blue-ridge-demo";

interface SeedRow {
  name: string;
  number: string;
  position: number | null;
  laps?: number;
  totalTimeMs?: number;
  bestLapMs?: number;
  gapMs?: number;
  status: "finished" | "dnf" | "dns" | "dsq";
}

// A 15-lap Briggs 206 Senior feature final: 11 clean finishers, one lapped
// car, two DNFs (one early, one mid-race) so the public page shows the
// full range of states, not just a clean top-to-bottom list.
const DRIVER_ROWS: SeedRow[] = [
  { name: "Ethan Brooks", number: "14", position: 1, laps: 15, totalTimeMs: 754201, bestLapMs: 49102, status: "finished" },
  { name: "Maya Chen", number: "7", position: 2, laps: 15, totalTimeMs: 756738, bestLapMs: 49210, gapMs: 2537, status: "finished" },
  { name: "Liam Foster", number: "22", position: 3, laps: 15, totalTimeMs: 760085, bestLapMs: 49355, gapMs: 5884, status: "finished" },
  { name: "Ava Rodriguez", number: "3", position: 4, laps: 15, totalTimeMs: 763402, bestLapMs: 49501, gapMs: 9201, status: "finished" },
  { name: "Noah Bennett", number: "91", position: 5, laps: 15, totalTimeMs: 768864, bestLapMs: 49820, gapMs: 14663, status: "finished" },
  { name: "Sophia Kim", number: "18", position: 6, laps: 15, totalTimeMs: 772491, bestLapMs: 50012, gapMs: 18290, status: "finished" },
  { name: "Mason Clarke", number: "5", position: 7, laps: 15, totalTimeMs: 777760, bestLapMs: 50188, gapMs: 23559, status: "finished" },
  { name: "Isabella Torres", number: "27", position: 8, laps: 15, totalTimeMs: 784088, bestLapMs: 50401, gapMs: 29887, status: "finished" },
  { name: "Lucas Reed", number: "12", position: 9, laps: 15, totalTimeMs: 788413, bestLapMs: 50599, gapMs: 34212, status: "finished" },
  { name: "Chloe Nguyen", number: "9", position: 10, laps: 15, totalTimeMs: 795951, bestLapMs: 50877, gapMs: 41750, status: "finished" },
  { name: "Owen Walsh", number: "33", position: 11, laps: 15, totalTimeMs: 802501, bestLapMs: 51102, gapMs: 48300, status: "finished" },
  { name: "Mia Patel", number: "45", position: 12, laps: 14, bestLapMs: 51890, status: "finished" },
  { name: "Jack Sullivan", number: "16", position: null, laps: 8, bestLapMs: 52104, status: "dnf" },
  { name: "Ella Morgan", number: "21", position: null, laps: 3, bestLapMs: 53980, status: "dnf" },
];

async function findOrCreateUser(email: string) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(users).values({ email }).returning();
  return created;
}

// Idempotent: re-running replaces the demo club's data from scratch rather
// than accumulating duplicates or silently skipping.
async function deleteExistingClub(slug: string) {
  const [club] = await db.select().from(clubs).where(eq(clubs.slug, slug)).limit(1);
  if (!club) return;

  const clubSeasons = await db.select().from(seasons).where(eq(seasons.clubId, club.id));
  for (const season of clubSeasons) {
    const seasonEvents = await db.select().from(events).where(eq(events.seasonId, season.id));
    for (const event of seasonEvents) {
      const eventSessions = await db.select().from(sessions).where(eq(sessions.eventId, event.id));
      for (const session of eventSessions) {
        await db.delete(results).where(eq(results.sessionId, session.id));
      }
      await db.delete(sessions).where(eq(sessions.eventId, event.id));
    }
    await db.delete(events).where(eq(events.seasonId, season.id));
    await db.delete(classes).where(eq(classes.seasonId, season.id));
  }
  await db.delete(seasons).where(eq(seasons.clubId, club.id));
  await db.delete(drivers).where(eq(drivers.clubId, club.id));
  await db.delete(pointsSchemes).where(eq(pointsSchemes.clubId, club.id));
  await db.delete(clubs).where(eq(clubs.id, club.id));
}

async function seed() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  if (!ownerEmail) {
    throw new Error("SEED_OWNER_EMAIL is not set — who should own the demo club?");
  }

  const owner = await findOrCreateUser(ownerEmail);
  await deleteExistingClub(CLUB_SLUG);

  const [club] = await db
    .insert(clubs)
    .values({
      name: "Blue Ridge Kart Club",
      slug: CLUB_SLUG,
      timezone: "America/New_York",
      ownerUserId: owner.id,
    })
    .returning();

  const [scheme] = await db
    .insert(pointsSchemes)
    .values({ clubId: club.id, name: "Default" })
    .returning();

  const [season] = await db
    .insert(seasons)
    .values({ clubId: club.id, name: "2026 Spring Sprint Series", year: 2026, status: "active" })
    .returning();

  const [seniorClass] = await db
    .insert(classes)
    .values({ seasonId: season.id, name: "Briggs 206 Senior", pointsSchemeId: scheme.id })
    .returning();

  await db.insert(classes).values({ seasonId: season.id, name: "Kid Kart", pointsSchemeId: scheme.id });

  const [event] = await db
    .insert(events)
    .values({
      seasonId: season.id,
      name: "Round 3 — Sunday Sprint Night",
      venue: "Blue Ridge Motorsports Park",
      eventDate: "2026-06-14",
      roundNumber: 3,
    })
    .returning();

  const [session] = await db
    .insert(sessions)
    .values({
      eventId: event.id,
      type: "final",
      name: "Feature Final",
      source: "manual",
      status: "published",
      publicSlug: SESSION_SLUG,
      publishedAt: new Date(),
    })
    .returning();

  for (const row of DRIVER_ROWS) {
    const [driver] = await db
      .insert(drivers)
      .values({ clubId: club.id, displayName: row.name, number: row.number })
      .returning();

    await db.insert(results).values({
      sessionId: session.id,
      driverId: driver.id,
      classId: seniorClass.id,
      position: row.position,
      status: row.status,
      laps: row.laps,
      bestLapMs: row.bestLapMs,
      totalTimeMs: row.totalTimeMs,
      gapMs: row.gapMs,
    });
  }

  console.log(`Seeded Blue Ridge Kart Club. Public results: /r/${SESSION_SLUG}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
