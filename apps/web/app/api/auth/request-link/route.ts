import { NextRequest, NextResponse } from "next/server";
import { requestLinkSchema } from "@paddockboard/shared";
import { createMagicLinkToken } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const token = await createMagicLinkToken(parsed.data.email);
    await sendMagicLinkEmail(parsed.data.email, token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to send magic-link email", err);
    return NextResponse.json({ error: "Could not send sign-in email" }, { status: 500 });
  }
}
