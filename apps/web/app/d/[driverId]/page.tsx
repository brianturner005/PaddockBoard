import type { Metadata } from "next";
import Link from "next/link";
import { getDriverPageData } from "@/lib/driver-page";
import { formatMs } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { ClaimDriverForm } from "@/components/ClaimDriverForm";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PositionCell } from "@/components/PositionCell";
import { SubscribeForm } from "@/components/SubscribeForm";

interface PageProps {
  params: Promise<{ driverId: string }>;
  searchParams: Promise<{ claim?: string; subscribed?: string }>;
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

export default async function DriverPage({ params, searchParams }: PageProps) {
  const { driverId } = await params;
  const { claim, subscribed } = await searchParams;
  const [result, currentUser] = await Promise.all([getDriverPageData(driverId), getCurrentUser()]);

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
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link href={`/c/${data.clubSlug}`} className="underline">
              {data.clubName}
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">
            {data.driverName}
            {data.driverNumber ? (
              <span className="text-zinc-500 dark:text-zinc-400"> #{data.driverNumber}</span>
            ) : null}
          </h1>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-200 px-3 py-2 text-center dark:border-zinc-800">
              <p className="text-xl font-semibold text-black dark:text-zinc-50">{data.wins}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">wins</p>
            </div>
            <div className="rounded-lg border border-zinc-200 px-3 py-2 text-center dark:border-zinc-800">
              <p className="text-xl font-semibold text-black dark:text-zinc-50">{data.podiums}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">podiums</p>
            </div>
            <div className="rounded-lg border border-zinc-200 px-3 py-2 text-center dark:border-zinc-800">
              <p className="text-xl font-semibold text-black dark:text-zinc-50">{data.bestFinish ?? "—"}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">best finish</p>
            </div>
          </div>
        </header>

        {claim === "success" && data.claimedUserId === currentUser?.id && (
          <p className="mb-6 text-sm text-green-700 dark:text-green-400">
            This profile is now linked to your account.
          </p>
        )}
        {claim === "taken" && (
          <p className="mb-6 text-sm text-red-600">
            This profile was already claimed before your confirmation went through.
          </p>
        )}

        {data.claimedUserId && data.claimedUserId === currentUser?.id ? (
          <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
            This is your profile.{" "}
            <Link href="/my/drivers" className="underline">
              See all your claimed profiles
            </Link>
            .
          </p>
        ) : !data.claimedUserId ? (
          <div className="mb-8">
            <ClaimDriverForm driverId={data.driverId} />
          </div>
        ) : null}

        {data.results.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No published results yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="py-2 pr-2 pl-4">Event</th>
                  <th className="py-2 pr-2">Session</th>
                  <th className="py-2 pr-2">Class</th>
                  <th className="py-2 pr-2">Pos</th>
                  <th className="py-2 pr-4">Best lap</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="py-2 pr-2 pl-4">
                      {r.eventName}
                      <span className="text-zinc-500 dark:text-zinc-400"> · {r.eventDate}</span>
                    </td>
                    <td className="py-2 pr-2">
                      <Link href={`/r/${r.sessionPublicSlug}`} className="underline">
                        {r.sessionName}
                      </Link>
                    </td>
                    <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-400">{r.className}</td>
                    <td className="py-2 pr-2">
                      <PositionCell position={r.position} fallback={STATUS_LABELS[r.status] ?? "—"} />
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{formatMs(r.bestLapMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8">
          <SubscribeForm target={{ driverId: data.driverId }} subscribed={subscribed} />
        </div>

        <PublicFooter />
      </div>
    </div>
  );
}
