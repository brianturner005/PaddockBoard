import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { users } from "@paddockboard/db/schema";

const SESSION_COOKIE = "pb_session";
const MAGIC_LINK_TTL_SECONDS = 15 * 60;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createMagicLinkToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: "magic-link" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAGIC_LINK_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyMagicLinkToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecretKey());
  if (payload.purpose !== "magic-link" || typeof payload.email !== "string") {
    throw new Error("Invalid magic-link token");
  }
  return payload.email;
}

// Same shape as the sign-in magic link, but scoped to one driver: proves
// "I control this email address," not "I am this driver" -- the same
// low-friction trust model as the rest of auth, just claim-flavored.
export async function createDriverClaimToken(email: string, driverId: string): Promise<string> {
  return new SignJWT({ email, driverId, purpose: "claim-driver" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAGIC_LINK_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyDriverClaimToken(token: string): Promise<{ email: string; driverId: string }> {
  const { payload } = await jwtVerify(token, getSecretKey());
  if (
    payload.purpose !== "claim-driver" ||
    typeof payload.email !== "string" ||
    typeof payload.driverId !== "string"
  ) {
    throw new Error("Invalid claim token");
  }
  return { email: payload.email, driverId: payload.driverId };
}

export interface SessionUser {
  id: string;
  email: string;
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export async function findOrCreateUserByEmail(email: string): Promise<SessionUser> {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    return { id: existing[0].id, email: existing[0].email };
  }

  const [created] = await db.insert(users).values({ email }).returning();
  return { id: created.id, email: created.email };
}
