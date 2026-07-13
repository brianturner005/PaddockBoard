import { NextResponse } from "next/server";
import { getPublicSessionData } from "@/lib/public-session";
import { formatMs, formatGap } from "@/lib/format";
import { toCsv, safeFilename } from "@/lib/csv";

const STATUS_LABELS: Record<string, string> = {
  dnf: "DNF",
  dns: "DNS",
  dsq: "DSQ",
};

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublicSessionData(slug);

  if (result.status !== "ok") {
    return NextResponse.json({ error: result.status }, { status: 404 });
  }

  const { data } = result;
  const rows = data.classes.flatMap((cls) =>
    cls.rows.map((row) => [
      cls.className,
      row.position ?? STATUS_LABELS[row.status] ?? "",
      row.driverName,
      row.driverNumber ?? "",
      row.laps ?? "",
      formatMs(row.bestLapMs),
      row.position === 1 ? "" : formatGap(row.gapMs),
    ])
  );

  const csv = toCsv(["Class", "Pos", "Driver", "#", "Laps", "Best lap", "Gap"], rows);

  const filename = `${safeFilename(`${data.sessionName}-results`)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
