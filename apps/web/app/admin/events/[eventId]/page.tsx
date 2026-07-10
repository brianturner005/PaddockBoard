import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { sessions } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getEventWithClub, hasClubAccess } from "@/lib/ownership";
import { CreateSessionForm } from "@/components/CreateSessionForm";

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await getEventWithClub(eventId);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    notFound();
  }
  const { event, season } = result;

  const eventSessions = await db.select().from(sessions).where(eq(sessions.eventId, eventId));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/admin/seasons/${season.id}`} className="text-sm underline">
          ← {season.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">{event.name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {event.venue ? `${event.venue} · ` : ""}
          {event.eventDate}
        </p>
      </div>

      <section>
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">Sessions</h2>
        {eventSessions.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No sessions yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1 text-sm text-zinc-800 dark:text-zinc-200">
            {eventSessions.map((session) => (
              <li key={session.id}>
                <Link className="underline" href={`/admin/sessions/${session.id}/upload`}>
                  {session.name}
                </Link>{" "}
                — {session.type} — {session.status}
              </li>
            ))}
          </ul>
        )}
        <CreateSessionForm eventId={event.id} />
      </section>
    </div>
  );
}
