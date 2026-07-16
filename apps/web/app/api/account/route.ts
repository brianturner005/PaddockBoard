import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { updateAccountSchema } from "@paddockboard/shared";
import { db } from "@paddockboard/db";
import { users } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ name: parsed.data.name })
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json({ user: { id: updated.id, email: updated.email, name: updated.name } });
}
