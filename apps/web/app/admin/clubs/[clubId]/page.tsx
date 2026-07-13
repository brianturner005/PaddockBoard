import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { seasons } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getClubById, getClubMembership } from "@/lib/ownership";
import { CreateSeasonForm } from "@/components/CreateSeasonForm";
import { ClubMembersPanel } from "@/components/ClubMembersPanel";
import { SectionCard } from "@/components/SectionCard";

export default async function ClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const club = await getClubById(clubId);
  const membership = club ? await getClubMembership(clubId, user.id) : null;
  if (!club || !membership) {
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

      <SectionCard title="Seasons">
        {clubSeasons.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No seasons yet.</p>
        ) : (
          <ul className="-mx-2 mb-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {clubSeasons.map((season) => (
              <li key={season.id}>
                <Link
                  className="block rounded px-2 py-2 text-sm text-black transition hover:bg-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  href={`/admin/seasons/${season.id}`}
                >
                  {season.name} ({season.year})
                </Link>
              </li>
            ))}
          </ul>
        )}
        <CreateSeasonForm clubId={club.id} />
      </SectionCard>

      <SectionCard title="Members">
        <ClubMembersPanel clubId={club.id} isOwner={membership.role === "owner"} currentUserId={user.id} />
      </SectionCard>
    </div>
  );
}
