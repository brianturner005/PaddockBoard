import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLinkToken, findOrCreateUserByEmail, createSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  try {
    const email = await verifyMagicLinkToken(token);
    const user = await findOrCreateUserByEmail(email);
    await createSession(user);
    return NextResponse.redirect(new URL("/admin", request.url));
  } catch (err) {
    console.error("Magic-link verification failed", err);
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }
}
