import { NextResponse } from "next/server";
import { getClassStandingsData } from "@/lib/standings";
import { toCsv, safeFilename } from "@/lib/csv";

export async function GET(_request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const result = await getClassStandingsData(classId);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data } = result;
  const csv = toCsv(
    ["Pos", "Driver", "#", "Points", "Rounds counted", "Rounds dropped"],
    data.rows.map((row) => [
      row.position,
      row.driverName,
      row.driverNumber ?? "",
      row.totalPoints,
      row.roundsCounted,
      row.roundsDropped,
    ])
  );

  const filename = `${safeFilename(`${data.className}-standings`)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
