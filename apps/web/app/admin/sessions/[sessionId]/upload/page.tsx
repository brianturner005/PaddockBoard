import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { classes } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSessionWithClub } from "@/lib/ownership";
import { SessionUploadPreview } from "@/components/SessionUploadPreview";

export default async function SessionUploadPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await getSessionWithClub(sessionId);
  if (!result || result.club.ownerUserId !== user.id) {
    notFound();
  }
  const { session, event, season } = result;

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
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {session.type} · {session.status}
        </p>
      </div>

      <SessionUploadPreview
        sessionId={session.id}
        source={session.source as "orbits_csv" | "manual"}
        classes={seasonClasses}
        publicSlug={session.publicSlug}
        initialStatus={session.status as "draft" | "published"}
      />
    </div>
  );
}
