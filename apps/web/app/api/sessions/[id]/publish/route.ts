import { NextRequest, NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { sessions } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSessionWithClub, hasClubAccess } from "@/lib/ownership";
import { notifySubscribersOfPublish } from "@/lib/notify";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getSessionWithClub(id);
  if (!result || !(await hasClubAccess(result.club.id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [session] = await db
    .update(sessions)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(sessions.id, id))
    .returning();

  // after() (not a bare fire-and-forget promise) so this reliably runs to
  // completion on Vercel even though the response is already sent -- a
  // detached promise isn't guaranteed to finish once a serverless
  // function's response has flushed.
  after(() =>
    notifySubscribersOfPublish({
      sessionId: session.id,
      sessionName: session.name,
      publicSlug: session.publicSlug,
      eventName: result.event.name,
      clubName: result.club.name,
    }).catch((err) => console.error("Failed to notify subscribers", err))
  );

  return NextResponse.json({ session });
}
