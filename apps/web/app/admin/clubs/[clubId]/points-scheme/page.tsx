import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { pointsSchemes } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getClubById, hasClubAccess } from "@/lib/ownership";
import { PointsSchemeForm } from "@/components/PointsSchemeForm";
import { SectionCard } from "@/components/SectionCard";

export default async function PointsSchemePage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const club = await getClubById(clubId);
  if (!club || !(await hasClubAccess(clubId, user.id))) {
    notFound();
  }

  const [scheme] = await db.select().from(pointsSchemes).where(eq(pointsSchemes.clubId, clubId)).limit(1);
  if (!scheme) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/clubs/${clubId}`} className="text-sm underline">
          ← {club.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">Points scheme</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          All of {club.name}&apos;s classes currently share this one scheme.
        </p>
      </div>

      <SectionCard title="Scheme settings">
        <PointsSchemeForm
          schemeId={scheme.id}
          initialName={scheme.name}
          initialPositionPoints={scheme.positionPoints}
          initialPoleBonus={scheme.poleBonus}
          initialFastestLapBonus={scheme.fastestLapBonus}
          initialDropRounds={scheme.dropRounds}
          initialCountbackRule={scheme.countbackRule}
        />
      </SectionCard>
    </div>
  );
}
