import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "@paddockboard/db";
import { users } from "@paddockboard/db/schema";

const scrypt = promisify(scryptCallback);

const SESSION_COOKIE = "pb_session";
const SHORT_TOKEN_TTL_SECONDS = 15 * 60;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

// scrypt (Node's built-in crypto), not a third-party hashing library --
// keeps this dependency-free, matching the project's general preference
// for built-ins over new packages where they're adequate. Stored as
// "salt:derivedKeyHex".
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, storedHex] = hash.split(":");
  if (!salt || !storedHex) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(storedHex, "hex");
  if (derivedKey.length !== storedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}

// The password hash travels inside the signed token itself rather than
// being written to `users` before confirmation -- otherwise someone could
// sign up with an email they don't control (say, an existing club owner's)
// and the row would already have a working password the moment they
// submit the form, before the real owner ever sees the confirm email. This
// way nothing is written to the DB until the link is clicked, which only
// the real inbox owner can do -- same proof-of-ownership model already
// used for driver claiming and subscription confirmation.
export async function createSignupConfirmToken(email: string, passwordHash: string): Promise<string> {
  return new SignJWT({ email, passwordHash, purpose: "confirm-signup" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SHORT_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySignupConfirmToken(
  token: string
): Promise<{ email: string; passwordHash: string }> {
  const { payload } = await jwtVerify(token, getSecretKey());
  if (
    payload.purpose !== "confirm-signup" ||
    typeof payload.email !== "string" ||
    typeof payload.passwordHash !== "string"
  ) {
    throw new Error("Invalid signup-confirm token");
  }
  return { email: payload.email, passwordHash: payload.passwordHash };
}

export async function createPasswordResetToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: "reset-password" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SHORT_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyPasswordResetToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecretKey());
  if (payload.purpose !== "reset-password" || typeof payload.email !== "string") {
    throw new Error("Invalid password-reset token");
  }
  return payload.email;
}

// Same shape as the reset-password token, but scoped to one driver: proves
// "I control this email address," not "I am this driver" -- the same
// low-friction trust model the driver-claim flow has always used. Unlike
// login, claiming is rare/one-time per driver, so it stays link-based
// rather than needing a password.
export async function createDriverClaimToken(email: string, driverId: string): Promise<string> {
  return new SignJWT({ email, driverId, purpose: "claim-driver" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SHORT_TOKEN_TTL_SECONDS}s`)
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

export async function findUserByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

// Still used by club-member invites and driver claiming, both of which
// need a users row to exist (or get created) without requiring a
// password -- password only gets set the first time that person signs up
// or resets it.
export async function findOrCreateUserByEmail(email: string): Promise<SessionUser> {
  const existing = await findUserByEmail(email);
  if (existing) {
    return { id: existing.id, email: existing.email };
  }

  const [created] = await db.insert(users).values({ email }).returning();
  return { id: created.id, email: created.email };
}
