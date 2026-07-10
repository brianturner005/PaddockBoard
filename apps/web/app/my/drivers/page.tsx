import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getClaimedDrivers } from "@/lib/driver-page";

export default async function MyDriversPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const driverRows = await getClaimedDrivers(user.id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/admin" className="text-sm underline">
        ← PaddockBoard
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">Your driver profiles</h1>
      {driverRows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          You haven&apos;t claimed any driver profiles yet. Find yourself on a results page and claim it
          from there.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {driverRows.map((d) => (
            <li key={d.driverId}>
              <Link href={`/d/${d.driverId}`} className="underline">
                {d.driverName}
                {d.driverNumber ? ` #${d.driverNumber}` : ""}
              </Link>{" "}
              <span className="text-sm text-zinc-600 dark:text-zinc-400">— {d.clubName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
