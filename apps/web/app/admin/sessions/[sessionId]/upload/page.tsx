import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { classes } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSessionWithClub, hasClubAccess } from "@/lib/ownership";
import { SessionUploadPreview } from "@/components/SessionUploadPreview";
import { CountsForStandingsToggle } from "@/components/CountsForStandingsToggle";
import { PublishedResultsEditor } from "@/components/PublishedResultsEditor";
import { SectionCard } from "@/components/SectionCard";

export default async function SessionUploadPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await getSessionWithClub(sessionId);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    notFound();
  }
  const { session, event, season, club } = result;

  const seasonClasses = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(eq(classes.seasonId, season.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/events/${event.id}`} className="text-sm underline">
          ← {event.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">{session.name}</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span>{session.type}</span>
          <span
            className={
              session.status === "published"
                ? "rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400"
                : "rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }
          >
            {session.status}
          </span>
        </div>
        <div className="mt-2">
          <CountsForStandingsToggle sessionId={session.id} initialValue={session.countsForStandings} />
        </div>
      </div>

      {session.status === "published" && (
        <SectionCard title="Edit published results">
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Changes here are logged with a reason and visible in each row&rsquo;s history.
          </p>
          <PublishedResultsEditor sessionId={session.id} />
        </SectionCard>
      )}

      <SectionCard title={session.status === "published" ? "Re-upload / edit source" : "Upload results"}>
        <SessionUploadPreview
          sessionId={session.id}
          source={session.source as "orbits_csv" | "orbits_html" | "generic_csv" | "manual"}
          classes={seasonClasses}
          publicSlug={session.publicSlug}
          initialStatus={session.status as "draft" | "published"}
          clubId={club.id}
          initialColumnMapping={club.csvColumnMapping}
        />
      </SectionCard>
    </div>
  );
}
