import type { Metadata } from "next";
import Link from "next/link";
import { getPublicClubData } from "@/lib/public-club";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicClubData(slug);

  if (result.status !== "ok") {
    return { title: "PaddockBoard" };
  }

  return {
    title: `${result.data.name} | PaddockBoard`,
    description: `Seasons, events, and results for ${result.data.name}`,
  };
}

export default async function ClubPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublicClubData(slug);

  if (result.status === "not_found") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Club not found</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This link doesn&apos;t match any club.
        </p>
      </div>
    );
  }

  const { data } = result;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm underline">
        ← PaddockBoard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-black dark:text-zinc-50">{data.name}</h1>

      {data.seasons.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">No results published yet.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {data.seasons.map((season) => (
            <section key={season.id}>
              <h2 className="text-lg font-medium text-black dark:text-zinc-50">
                {season.name} ({season.year})
                {season.status === "archived" && (
                  <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">archived</span>
                )}
              </h2>

              {season.classes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {season.classes.map((cls) => (
                    <Link key={cls.id} href={`/standings/${cls.id}`} className="underline">
                      {cls.name} standings
                    </Link>
                  ))}
                </div>
              )}

              {season.events.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No published results yet.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {season.events.map((event) => (
                    <li key={event.id}>
                      <p className="text-sm font-medium text-black dark:text-zinc-50">
                        {event.name}
                        <span className="font-normal text-zinc-500 dark:text-zinc-400">
                          {" "}
                          — {event.venue ? `${event.venue} · ` : ""}
                          {event.eventDate}
                        </span>
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {event.sessions.map((session) => (
                          <Link key={session.publicSlug} href={`/r/${session.publicSlug}`} className="underline">
                            {session.name}
                          </Link>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
        Powered by PaddockBoard
      </footer>
    </div>
  );
}
