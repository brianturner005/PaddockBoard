// Deleting an entity that has real race data means deleting everything
// underneath it too -- every FK in db/schema.ts is "no action", so the DB
// itself refuses a delete that would orphan a row. Each entity gets a
// "plan" (the id lists of everything underneath it) computed once, then
// reused both to report an impact summary (so the UI can warn "this
// removes 3 events, 12 sessions, 140 results" before the admin confirms)
// and to actually execute the cascade.
//
// Deletes run leaf-first (audit trail -> results -> sessions/classes ->
// events -> seasons -> club) so that if a request is interrupted partway
// (neon-http has no transactions -- see resultEdits' own comment in
// db/schema.ts for the same caveat elsewhere), what's left is always a
// smaller-but-still-valid tree, never a dangling foreign key. Re-running
// the same delete finishes the job.
import { eq, inArray } from "drizzle-orm";
import { db } from "@paddockboard/db";
import {
  clubs,
  clubMembers,
  pointsSchemes,
  seasons,
  classes,
  events,
  sessions,
  drivers,
  results,
  resultEdits,
  subscriptions,
} from "@paddockboard/db/schema";

async function idsWhere(query: Promise<{ id: string }[]>): Promise<string[]> {
  return (await query).map((row) => row.id);
}

async function deleteResultsAndEdits(resultIds: string[]) {
  if (resultIds.length === 0) return;
  await db.delete(resultEdits).where(inArray(resultEdits.resultId, resultIds));
  await db.delete(results).where(inArray(results.id, resultIds));
}

// ---------- session ----------

async function planSessionDelete(sessionId: string) {
  const resultIds = await idsWhere(
    db.select({ id: results.id }).from(results).where(eq(results.sessionId, sessionId))
  );
  return { resultIds };
}

export async function getSessionDeleteImpact(sessionId: string) {
  const plan = await planSessionDelete(sessionId);
  return { results: plan.resultIds.length };
}

export async function executeSessionDelete(sessionId: string) {
  const plan = await planSessionDelete(sessionId);
  await deleteResultsAndEdits(plan.resultIds);
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// ---------- event ----------

async function planEventDelete(eventId: string) {
  const sessionIds = await idsWhere(
    db.select({ id: sessions.id }).from(sessions).where(eq(sessions.eventId, eventId))
  );
  const resultIds =
    sessionIds.length === 0
      ? []
      : await idsWhere(db.select({ id: results.id }).from(results).where(inArray(results.sessionId, sessionIds)));
  return { sessionIds, resultIds };
}

export async function getEventDeleteImpact(eventId: string) {
  const plan = await planEventDelete(eventId);
  return { sessions: plan.sessionIds.length, results: plan.resultIds.length };
}

export async function executeEventDelete(eventId: string) {
  const plan = await planEventDelete(eventId);
  await deleteResultsAndEdits(plan.resultIds);
  await db.delete(sessions).where(eq(sessions.eventId, eventId));
  await db.delete(events).where(eq(events.id, eventId));
}

// ---------- class ----------

async function planClassDelete(classId: string) {
  const resultIds = await idsWhere(
    db.select({ id: results.id }).from(results).where(eq(results.classId, classId))
  );
  return { resultIds };
}

export async function getClassDeleteImpact(classId: string) {
  const plan = await planClassDelete(classId);
  return { results: plan.resultIds.length };
}

export async function executeClassDelete(classId: string) {
  const plan = await planClassDelete(classId);
  await deleteResultsAndEdits(plan.resultIds);
  await db.delete(subscriptions).where(eq(subscriptions.classId, classId));
  await db.delete(classes).where(eq(classes.id, classId));
}

// ---------- season ----------

async function planSeasonDelete(seasonId: string) {
  const eventIds = await idsWhere(
    db.select({ id: events.id }).from(events).where(eq(events.seasonId, seasonId))
  );
  const sessionIds =
    eventIds.length === 0
      ? []
      : await idsWhere(db.select({ id: sessions.id }).from(sessions).where(inArray(sessions.eventId, eventIds)));
  const resultIds =
    sessionIds.length === 0
      ? []
      : await idsWhere(db.select({ id: results.id }).from(results).where(inArray(results.sessionId, sessionIds)));
  const classIds = await idsWhere(
    db.select({ id: classes.id }).from(classes).where(eq(classes.seasonId, seasonId))
  );
  return { eventIds, sessionIds, resultIds, classIds };
}

export async function getSeasonDeleteImpact(seasonId: string) {
  const plan = await planSeasonDelete(seasonId);
  return {
    events: plan.eventIds.length,
    sessions: plan.sessionIds.length,
    results: plan.resultIds.length,
    classes: plan.classIds.length,
  };
}

export async function executeSeasonDelete(seasonId: string) {
  const plan = await planSeasonDelete(seasonId);
  // Results-by-sessionId is already a superset of results-by-classId here
  // -- a session only ever offers its own season's classes to pick from --
  // so deleting results once (by session) covers both.
  await deleteResultsAndEdits(plan.resultIds);
  if (plan.classIds.length > 0) {
    await db.delete(subscriptions).where(inArray(subscriptions.classId, plan.classIds));
  }
  if (plan.eventIds.length > 0) {
    await db.delete(sessions).where(inArray(sessions.eventId, plan.eventIds));
  }
  await db.delete(events).where(eq(events.seasonId, seasonId));
  await db.delete(classes).where(eq(classes.seasonId, seasonId));
  await db.delete(seasons).where(eq(seasons.id, seasonId));
}

// ---------- club ----------

async function planClubDelete(clubId: string) {
  const seasonIds = await idsWhere(
    db.select({ id: seasons.id }).from(seasons).where(eq(seasons.clubId, clubId))
  );
  const eventIds =
    seasonIds.length === 0
      ? []
      : await idsWhere(db.select({ id: events.id }).from(events).where(inArray(events.seasonId, seasonIds)));
  const sessionIds =
    eventIds.length === 0
      ? []
      : await idsWhere(db.select({ id: sessions.id }).from(sessions).where(inArray(sessions.eventId, eventIds)));
  const resultIds =
    sessionIds.length === 0
      ? []
      : await idsWhere(db.select({ id: results.id }).from(results).where(inArray(results.sessionId, sessionIds)));
  const classIds =
    seasonIds.length === 0
      ? []
      : await idsWhere(db.select({ id: classes.id }).from(classes).where(inArray(classes.seasonId, seasonIds)));
  const driverIds = await idsWhere(
    db.select({ id: drivers.id }).from(drivers).where(eq(drivers.clubId, clubId))
  );
  return { seasonIds, eventIds, sessionIds, resultIds, classIds, driverIds };
}

export async function getClubDeleteImpact(clubId: string) {
  const plan = await planClubDelete(clubId);
  return {
    seasons: plan.seasonIds.length,
    events: plan.eventIds.length,
    sessions: plan.sessionIds.length,
    results: plan.resultIds.length,
    classes: plan.classIds.length,
    drivers: plan.driverIds.length,
  };
}

export async function executeClubDelete(clubId: string) {
  const plan = await planClubDelete(clubId);
  await deleteResultsAndEdits(plan.resultIds);
  if (plan.classIds.length > 0) {
    await db.delete(subscriptions).where(inArray(subscriptions.classId, plan.classIds));
  }
  if (plan.driverIds.length > 0) {
    await db.delete(subscriptions).where(inArray(subscriptions.driverId, plan.driverIds));
  }
  if (plan.eventIds.length > 0) {
    await db.delete(sessions).where(inArray(sessions.eventId, plan.eventIds));
  }
  if (plan.seasonIds.length > 0) {
    await db.delete(events).where(inArray(events.seasonId, plan.seasonIds));
    await db.delete(classes).where(inArray(classes.seasonId, plan.seasonIds));
  }
  await db.delete(seasons).where(eq(seasons.clubId, clubId));
  await db.delete(pointsSchemes).where(eq(pointsSchemes.clubId, clubId));
  await db.delete(drivers).where(eq(drivers.clubId, clubId));
  await db.delete(clubMembers).where(eq(clubMembers.clubId, clubId));
  await db.delete(clubs).where(eq(clubs.id, clubId));
}
