import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { resultEdits } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getResultWithClub, hasClubAccess } from "@/lib/ownership";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const found = await getResultWithClub(id);
  if (!found || !(await hasClubAccess(found.club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const edits = await db
    .select()
    .from(resultEdits)
    .where(eq(resultEdits.resultId, id))
    .orderBy(desc(resultEdits.createdAt));

  return NextResponse.json({ edits });
}
