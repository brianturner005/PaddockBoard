import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSessionData } from "@/lib/public-session";
import { formatMs, formatGap } from "@/lib/format";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PositionCell } from "@/components/PositionCell";
import { PrintButton } from "@/components/PrintButton";

const STATUS_LABELS: Record<string, string> = {
  dnf: "DNF",
  dns: "DNS",
  dsq: "DSQ",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicSessionData(slug);

  if (result.status !== "ok") {
    return { title: "PaddockBoard" };
  }

  return {
    title: `${result.data.sessionName} — ${result.data.clubName} | PaddockBoard`,
    description: `${result.data.eventName} results, ${result.data.clubName}`,
  };
}

export default async function PublicResultsPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublicSessionData(slug);

  if (result.status === "not_found") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Results not found</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This link doesn&apos;t match any published results.
        </p>
      </div>
    );
  }

  if (result.status === "not_published") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Not published yet</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This session&apos;s results haven&apos;t been published. Check back soon.
        </p>
      </div>
    );
  }

  const { data } = result;

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link href={`/c/${data.clubSlug}`} className="underline">
              {data.clubName}
            </Link>{" "}
            · {data.seasonName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">{data.sessionName}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {data.eventName}
            {data.venue ? ` · ${data.venue}` : ""} · {data.eventDate}
          </p>
          <div className="mt-2 flex gap-3 print:hidden">
            <a href={`/api/public/sessions/${slug}/csv`} className="text-sm underline">
              Download CSV
            </a>
            <PrintButton />
          </div>
        </header>

        {data.classes.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No results recorded for this session.</p>
        ) : (
          data.classes.map((cls) => (
            <section key={cls.classId} className="mb-10">
              <h2 className="mb-3 text-lg font-medium text-black dark:text-zinc-50">{cls.className}</h2>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                      <th className="py-2 pr-2 pl-4">Pos</th>
                      <th className="py-2 pr-2">Driver</th>
                      <th className="py-2 pr-2">Laps</th>
                      <th className="py-2 pr-2">Best lap</th>
                      <th className="py-2 pr-4">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cls.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                      >
                        <td className="py-2 pr-2 pl-4">
                          <PositionCell position={row.position} fallback={STATUS_LABELS[row.status] ?? "—"} />
                        </td>
                        <td className="py-2 pr-2">
                          <Link href={`/d/${row.driverId}`} className="underline">
                            {row.driverName}
                          </Link>
                          {row.driverNumber ? (
                            <span className="text-zinc-500 dark:text-zinc-400"> #{row.driverNumber}</span>
                          ) : null}
                          {row.penalties.length > 0 && (
                            <span
                              className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400"
                              title={row.penalties.map((p) => `${p.pointsDelta} pts — ${p.description}`).join("; ")}
                            >
                              penalty
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-400">{row.laps ?? "—"}</td>
                        <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-400">{formatMs(row.bestLapMs)}</td>
                        <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                          {row.position === 1 ? "—" : formatGap(row.gapMs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}

        <PublicFooter />
      </div>
    </div>
  );
}
