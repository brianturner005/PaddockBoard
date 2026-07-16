import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { classes, events } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSeasonWithClub, hasClubAccess } from "@/lib/ownership";
import { CreateClassForm } from "@/components/CreateClassForm";
import { CreateEventForm } from "@/components/CreateEventForm";
import { SectionCard } from "@/components/SectionCard";
import { EditSeasonForm } from "@/components/EditSeasonForm";
import { ClassListItem } from "@/components/ClassListItem";

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
        <div className="mt-2">
          <EditSeasonForm season={season} clubId={club.id} />
        </div>
      </div>

      <SectionCard title="Classes">
        {seasonClasses.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No classes yet.</p>
        ) : (
          <ul className="-mx-2 mb-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {seasonClasses.map((cls) => (
              <ClassListItem key={cls.id} cls={cls} />
            ))}
          </ul>
        )}
        <CreateClassForm seasonId={season.id} />
      </SectionCard>

      <SectionCard title="Events">
        {seasonEvents.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No events yet.</p>
        ) : (
          <ul className="-mx-2 mb-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {seasonEvents.map((event) => (
              <li key={event.id}>
                <Link
                  className="flex items-center justify-between gap-2 rounded px-2 py-2 text-sm text-black transition hover:bg-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  href={`/admin/events/${event.id}`}
                >
                  <span className="underline">{event.name}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">{event.eventDate}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <CreateEventForm seasonId={season.id} />
      </SectionCard>
    </div>
  );
}
