import Link from "next/link";
import { getPublicClubDirectory } from "@/lib/public-club";

// This now reads from the DB (club directory), so it can't be statically
// prerendered at build time the way the old marketing-only page was.
export const dynamic = "force-dynamic";

export default async function Home() {
  const clubDirectory = await getPublicClubDirectory();

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        PaddockBoard
      </h1>
      <p className="mt-3 max-w-md text-zinc-600 dark:text-zinc-400">
        Upload your timing file. Get a beautiful results site. Done before the next heat starts.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/login"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Club sign-in
        </Link>
        <Link
          href="/r/blue-ridge-demo"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
        >
          See a sample results page
        </Link>
      </div>

      {clubDirectory.length > 0 && (
        <div className="mt-16 w-full max-w-sm text-left">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Browse a club</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {clubDirectory.map((club) => (
              <li key={club.slug}>
                <Link href={`/c/${club.slug}`} className="underline">
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
