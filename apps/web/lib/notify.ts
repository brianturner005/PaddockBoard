import { and, eq, inArray, isNotNull, or } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { results, subscriptions } from "@paddockboard/db/schema";
import { sendResultsNotificationEmail } from "./email";

// Best-effort: a failed notification send should never block or fail the
// publish action itself, so every email is sent via allSettled and errors
// are only logged.
export async function notifySubscribersOfPublish(info: {
  sessionId: string;
  sessionName: string;
  publicSlug: string;
  eventName: string;
  clubName: string;
}): Promise<void> {
  const sessionResults = await db
    .select({ classId: results.classId, driverId: results.driverId })
    .from(results)
    .where(eq(results.sessionId, info.sessionId));

  if (sessionResults.length === 0) return;

  const classIds = [...new Set(sessionResults.map((r) => r.classId))];
  const driverIds = [...new Set(sessionResults.map((r) => r.driverId))];

  const matched = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        isNotNull(subscriptions.confirmedAt),
        or(inArray(subscriptions.classId, classIds), inArray(subscriptions.driverId, driverIds))
      )
    );

  // One email per subscriber, not per matched subscription -- someone
  // subscribed to both a class and a driver that show up in the same
  // session shouldn't get duplicate emails. The unsubscribe link only
  // covers whichever subscription happened to be picked first in that
  // case; a documented simplification, not a correctness bug.
  const byEmail = new Map<string, (typeof matched)[number]>();
  for (const sub of matched) {
    if (!byEmail.has(sub.email)) byEmail.set(sub.email, sub);
  }

  await Promise.allSettled(
    Array.from(byEmail.values()).map(async (sub) => {
      try {
        await sendResultsNotificationEmail(sub.email, sub.id, {
          sessionName: info.sessionName,
          eventName: info.eventName,
          clubName: info.clubName,
          publicSlug: info.publicSlug,
        });
      } catch (err) {
        console.error(`Failed to send results notification to subscription ${sub.id}`, err);
      }
    })
  );
}
