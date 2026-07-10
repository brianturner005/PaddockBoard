import Link from "next/link";
import { getPublicClubDirectory } from "@/lib/public-club";

// This now reads from the DB (club directory), so it can't be statically
// prerendered at build time the way the old marketing-only page was.
export const dynamic = "force-dynamic";

export default async function Home() {
  const clubDirectory = await getPublicClubDirectory();

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-20 text-center dark:bg-black">
      <span aria-hidden className="h-2 w-2 rounded-full bg-orange-600 dark:bg-orange-400" />
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
        PaddockBoard
      </h1>
      <p className="mt-3 max-w-md text-zinc-600 dark:text-zinc-400">
        Upload your timing file. Get a beautiful results site. Done before the next heat starts.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700 dark:bg-orange-500 dark:text-black dark:hover:bg-orange-400"
        >
          Club sign-in
        </Link>
        <Link
          href="/r/blue-ridge-demo"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-black transition hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-600"
        >
          See a sample results page
        </Link>
      </div>

      {clubDirectory.length > 0 && (
        <div className="mt-20 w-full max-w-sm text-left">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Browse a club</h2>
          <ul className="mt-3 flex flex-col gap-2 divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {clubDirectory.map((club) => (
              <li key={club.slug}>
                <Link
                  href={`/c/${club.slug}`}
                  className="block px-4 py-3 text-sm text-black transition hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  {club.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
