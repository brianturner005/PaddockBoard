import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { updateClubSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { clubs } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getClubById, hasClubAccess, getClubMembership } from "@/lib/ownership";
import { getClubDeleteImpact, executeClubDelete } from "@/lib/cascade-delete";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await getClubById(id);
  if (!club || !(await hasClubAccess(club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(clubs)
    .set({ name: parsed.data.name, timezone: parsed.data.timezone })
    .where(eq(clubs.id, id))
    .returning();

  return NextResponse.json({ club: updated });
}

// Deleting a whole club is bigger than any other delete in the app --
// gated to owners only, unlike edit/PATCH which any member can do.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await getClubById(id);
  const membership = club ? await getClubMembership(id, user.id) : null;
  if (!club || !membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const confirmed = request.nextUrl.searchParams.get("confirm") === "true";
  if (!confirmed) {
    const impact = await getClubDeleteImpact(id);
    return NextResponse.json({ requiresConfirmation: true, impact });
  }

  await executeClubDelete(id);
  return NextResponse.json({ deleted: true });
}
