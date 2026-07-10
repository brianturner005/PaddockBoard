import type { Metadata } from "next";
import Link from "next/link";
import { getDriverPageData } from "@/lib/driver-page";
import { formatMs } from "@/lib/format";

interface PageProps {
  params: Promise<{ driverId: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  dnf: "DNF",
  dns: "DNS",
  dsq: "DSQ",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { driverId } = await params;
  const result = await getDriverPageData(driverId);

  if (result.status !== "ok") {
    return { title: "PaddockBoard" };
  }

  return {
    title: `${result.data.driverName} | PaddockBoard`,
    description: `${result.data.driverName}'s race results at ${result.data.clubName}`,
  };
}

export default async function DriverPage({ params }: PageProps) {
  const { driverId } = await params;
  const result = await getDriverPageData(driverId);

  if (result.status === "not_found") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Driver not found</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This link doesn&apos;t match any driver.
        </p>
      </div>
    );
  }

  const { data } = result;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{data.clubName}</p>
        <h1 className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">
          {data.driverName}
          {data.driverNumber ? (
            <span className="text-zinc-500 dark:text-zinc-400"> #{data.driverNumber}</span>
          ) : null}
        </h1>
        <div className="mt-3 flex gap-6 text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            <strong className="text-black dark:text-zinc-50">{data.wins}</strong> wins
          </span>
          <span>
            <strong className="text-black dark:text-zinc-50">{data.podiums}</strong> podiums
          </span>
          <span>
            Best finish:{" "}
            <strong className="text-black dark:text-zinc-50">{data.bestFinish ?? "—"}</strong>
          </span>
        </div>
      </header>

      {data.results.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No published results yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-300 dark:border-zinc-700">
                <th className="py-2 pr-2">Event</th>
                <th className="py-2 pr-2">Session</th>
                <th className="py-2 pr-2">Class</th>
                <th className="py-2 pr-2">Pos</th>
                <th className="py-2 pr-2">Best lap</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r, i) => (
                <tr key={i} className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 pr-2">
                    {r.eventName}
                    <span className="text-zinc-500 dark:text-zinc-400"> · {r.eventDate}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <Link href={`/r/${r.sessionPublicSlug}`} className="underline">
                      {r.sessionName}
                    </Link>
                  </td>
                  <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-400">{r.className}</td>
                  <td className="py-2 pr-2 font-medium">{r.position ?? STATUS_LABELS[r.status] ?? "—"}</td>
                  <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-400">{formatMs(r.bestLapMs)}</td>
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
