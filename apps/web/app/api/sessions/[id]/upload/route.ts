import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { sessions } from "@paddockboard/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSessionWithClub } from "@/lib/ownership";
import { storeRawUpload } from "@/lib/blob";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getSessionWithClub(id);
  if (!result || result.club.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  // Store the raw file before anything else touches it — it's the source
  // of truth, and this way a parse failure can never lose the upload.
  try {
    const { url } = await storeRawUpload(id, file);
    await db.update(sessions).set({ rawFileBlobUrl: url }).where(eq(sessions.id, id));
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Failed to store upload", err);
    return NextResponse.json({ error: "Could not store file" }, { status: 500 });
  }
}
