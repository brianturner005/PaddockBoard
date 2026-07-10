import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { classes, events } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSeasonWithClub, hasClubAccess } from "@/lib/ownership";
import { CreateClassForm } from "@/components/CreateClassForm";
import { CreateEventForm } from "@/components/CreateEventForm";

export default async function SeasonPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await getSeasonWithClub(seasonId);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    notFound();
  }
  const { season, club } = result;

  const [seasonClasses, seasonEvents] = await Promise.all([
    db.select().from(classes).where(eq(classes.seasonId, seasonId)),
    db.select().from(events).where(eq(events.seasonId, seasonId)),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/admin/clubs/${club.id}`} className="text-sm underline">
          ← {club.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">
          {season.name} ({season.year})
        </h1>
      </div>

      <section>
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">Classes</h2>
        {seasonClasses.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No classes yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1 text-sm text-zinc-800 dark:text-zinc-200">
            {seasonClasses.map((cls) => (
              <li key={cls.id}>
                {cls.name}{" "}
                <Link href={`/standings/${cls.id}`} className="underline" target="_blank" rel="noopener noreferrer">
                  standings
                </Link>
              </li>
            ))}
          </ul>
        )}
        <CreateClassForm seasonId={season.id} />
      </section>

      <section>
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">Events</h2>
        {seasonEvents.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No events yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {seasonEvents.map((event) => (
              <li key={event.id}>
                <Link className="underline" href={`/admin/events/${event.id}`}>
                  {event.name}
                </Link>{" "}
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{event.eventDate}</span>
              </li>
            ))}
          </ul>
        )}
        <CreateEventForm seasonId={season.id} />
      </section>
    </div>
  );
}
