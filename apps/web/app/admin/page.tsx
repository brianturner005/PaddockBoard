import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { clubs, clubMembers } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { CreateClubForm } from "@/components/CreateClubForm";

export default async function AdminHomePage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already redirects unauthenticated visitors

  const myClubs = await db
    .select({ id: clubs.id, name: clubs.name, slug: clubs.slug })
    .from(clubMembers)
    .innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
    .where(eq(clubMembers.userId, user.id));

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Your clubs</h1>
        {myClubs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No clubs yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {myClubs.map((club) => (
              <li key={club.id}>
                <Link className="underline" href={`/admin/clubs/${club.id}`}>
                  {club.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">Create a club</h2>
        <CreateClubForm />
      </section>
      <section>
        <Link href="/my/drivers" className="text-sm underline">
          Your driver profiles
        </Link>
      </section>
    </div>
  );
}
