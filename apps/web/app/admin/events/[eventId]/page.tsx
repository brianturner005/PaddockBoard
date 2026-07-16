import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { sessions } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getEventWithClub, hasClubAccess } from "@/lib/ownership";
import { CreateSessionForm } from "@/components/CreateSessionForm";
import { SectionCard } from "@/components/SectionCard";
import { EditEventForm } from "@/components/EditEventForm";

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
        <div className="mt-2">
          <EditEventForm event={event} />
        </div>
      </div>

      <SectionCard title="Sessions">
        {eventSessions.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No sessions yet.</p>
        ) : (
          <ul className="-mx-2 mb-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {eventSessions.map((session) => (
              <li key={session.id}>
                <Link
                  className="flex items-center justify-between gap-2 rounded px-2 py-2 text-sm text-black transition hover:bg-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  href={`/admin/sessions/${session.id}/upload`}
                >
                  <span className="underline">
                    {session.name} <span className="text-zinc-500 dark:text-zinc-400">— {session.type}</span>
                  </span>
                  <span
                    className={
                      session.status === "published"
                        ? "rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400"
                        : "rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }
                  >
                    {session.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <CreateSessionForm eventId={event.id} />
      </SectionCard>
    </div>
  );
}
