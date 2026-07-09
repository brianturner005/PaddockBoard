import { eq } from "drizzle-orm";
import { db } from "@paddockboard/db";
import { clubs } from "@paddockboard/db/schema";

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "club";
}

export async function ensureUniqueClubSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;

  // Small clubs, low collision rate — a loop is simpler than a clever
  // single-query approach and this only runs on club creation.
  for (let suffix = 2; ; suffix++) {
    const existing = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.slug, candidate)).limit(1);
    if (existing.length === 0) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
  }
}
