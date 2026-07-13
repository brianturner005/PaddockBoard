import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { clubs, clubMembers } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { CreateClubForm } from "@/components/CreateClubForm";
import { SectionCard } from "@/components/SectionCard";

export default async function AdminHomePage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already redirects unauthenticated visitors

  const myClubs = await db
    .select({ id: clubs.id, name: clubs.name, slug: clubs.slug })
    .from(clubMembers)
    .innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
    .where(eq(clubMembers.userId, user.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Your clubs</h1>
        <Link href="/my/drivers" className="mt-1 inline-block text-sm underline">
          Your driver profiles
        </Link>
      </div>

      <SectionCard title="Clubs">
        {myClubs.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No clubs yet.</p>
        ) : (
          <ul className="-mx-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {myClubs.map((club) => (
              <li key={club.id}>
                <Link
                  className="block rounded px-2 py-2 text-sm text-black transition hover:bg-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  href={`/admin/clubs/${club.id}`}
                >
                  {club.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Create a club">
        <CreateClubForm />
      </SectionCard>
    </div>
  );
}
