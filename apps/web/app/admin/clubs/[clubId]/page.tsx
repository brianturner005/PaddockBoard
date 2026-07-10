import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { seasons } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getClubById } from "@/lib/ownership";
import { CreateSeasonForm } from "@/components/CreateSeasonForm";

export default async function ClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const club = await getClubById(clubId);
  if (!club || club.ownerUserId !== user.id) {
    notFound();
  }

  const clubSeasons = await db.select().from(seasons).where(eq(seasons.clubId, clubId));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin" className="text-sm underline">
          ← Your clubs
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">{club.name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">/{club.slug}</p>
        <Link href={`/admin/clubs/${club.id}/points-scheme`} className="mt-1 inline-block text-sm underline">
          Edit points scheme
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">Seasons</h2>
        {clubSeasons.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No seasons yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {clubSeasons.map((season) => (
              <li key={season.id}>
                <Link className="underline" href={`/admin/seasons/${season.id}`}>
                  {season.name} ({season.year})
                </Link>
              </li>
            ))}
          </ul>
        )}
        <CreateSeasonForm clubId={club.id} />
      </section>
    </div>
  );
}
