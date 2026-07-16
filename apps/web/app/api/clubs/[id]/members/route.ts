import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { addClubMemberSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { clubMembers, users } from "@paddockboard/db/schema";
import { findOrCreateUserByEmail, getCurrentUser } from "@/lib/auth";
import { getClubMembership } from "@/lib/ownership";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getClubMembership(id, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const members = await db
    .select({
      id: clubMembers.id,
      userId: clubMembers.userId,
      email: users.email,
      name: users.name,
      role: clubMembers.role,
    })
    .from(clubMembers)
    .innerJoin(users, eq(clubMembers.userId, users.id))
    .where(eq(clubMembers.clubId, id));

  return NextResponse.json({ members });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getClubMembership(id, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (membership.role !== "owner") {
    return NextResponse.json({ error: "Only owners can add members" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addClubMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await findOrCreateUserByEmail(parsed.data.email);

  const [existing] = await db
    .select()
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, member.id)))
    .limit(1);

  const [saved] = existing
    ? await db
        .update(clubMembers)
        .set({ role: parsed.data.role })
        .where(eq(clubMembers.id, existing.id))
        .returning()
    : await db
        .insert(clubMembers)
        .values({ clubId: id, userId: member.id, role: parsed.data.role })
        .returning();

  return NextResponse.json({ member: { ...saved, email: member.email } }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getClubMembership(id, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (membership.role !== "owner") {
    return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 });
  }

  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!memberId) {
    return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
  }

  const [target] = await db
    .select()
    .from(clubMembers)
    .where(and(eq(clubMembers.id, memberId), eq(clubMembers.clubId, id)))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.role === "owner") {
    const otherOwners = await db
      .select({ id: clubMembers.id })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.role, "owner"), ne(clubMembers.id, memberId)));
    if (otherOwners.length === 0) {
      return NextResponse.json({ error: "A club must keep at least one owner" }, { status: 400 });
    }
  }

  await db.delete(clubMembers).where(eq(clubMembers.id, memberId));

  return NextResponse.json({ ok: true });
}
