import type { Metadata } from "next";
import Link from "next/link";
import { getClassStandingsData } from "@/lib/standings";

interface PageProps {
  params: Promise<{ classId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { classId } = await params;
  const result = await getClassStandingsData(classId);

  if (result.status !== "ok") {
    return { title: "PaddockBoard" };
  }

  return {
    title: `${result.data.className} Standings — ${result.data.clubName} | PaddockBoard`,
    description: `${result.data.seasonName} championship standings, ${result.data.clubName}`,
  };
}

function PositionChange({ change }: { change: number | null }) {
  if (change === null) {
    return <span className="text-zinc-400 dark:text-zinc-600">—</span>;
  }
  if (change === 0) {
    return <span className="text-zinc-500 dark:text-zinc-400">–</span>;
  }
  if (change > 0) {
    return <span className="text-green-700 dark:text-green-400">↑{change}</span>;
  }
  return <span className="text-red-600 dark:text-red-400">↓{Math.abs(change)}</span>;
}

export default async function StandingsPage({ params }: PageProps) {
  const { classId } = await params;
  const result = await getClassStandingsData(classId);

  if (result.status === "not_found") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Standings not found</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This link doesn&apos;t match any class.
        </p>
      </div>
    );
  }

  const { data } = result;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {data.clubName} · {data.seasonName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">{data.className} Standings</h1>
      </header>

      {data.rows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No scored rounds yet — standings will appear once a session marked as counting toward the
          championship is published.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-300 dark:border-zinc-700">
                <th className="py-2 pr-2">Pos</th>
                <th className="py-2 pr-2"></th>
                <th className="py-2 pr-2">Driver</th>
                <th className="py-2 pr-2">Points</th>
                <th className="py-2 pr-2">Rounds</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.driverId} className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 pr-2 font-medium">{row.position}</td>
                  <td className="py-2 pr-2">
                    <PositionChange change={row.positionChange} />
                  </td>
                  <td className="py-2 pr-2">
                    <Link href={`/d/${row.driverId}`} className="underline">
                      {row.driverName}
                    </Link>
                    {row.driverNumber ? (
                      <span className="text-zinc-500 dark:text-zinc-400"> #{row.driverNumber}</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-2 font-medium">{row.totalPoints}</td>
                  <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-400">
                    {row.roundsCounted}
                    {row.roundsDropped > 0 ? ` (+${row.roundsDropped} dropped)` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
        Powered by PaddockBoard
      </footer>
    </div>
  );
}
