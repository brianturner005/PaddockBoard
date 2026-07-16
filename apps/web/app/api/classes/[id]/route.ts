import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { updateClassSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { classes } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getClassWithClub, hasClubAccess } from "@/lib/ownership";
import { getClassDeleteImpact, executeClassDelete } from "@/lib/cascade-delete";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getClassWithClub(id);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(classes)
    .set({ name: parsed.data.name })
    .where(eq(classes.id, id))
    .returning();

  return NextResponse.json({ class: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getClassWithClub(id);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const confirmed = request.nextUrl.searchParams.get("confirm") === "true";
  if (!confirmed) {
    const impact = await getClassDeleteImpact(id);
    return NextResponse.json({ requiresConfirmation: true, impact });
  }

  await executeClassDelete(id);
  return NextResponse.json({ deleted: true });
}
