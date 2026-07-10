import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | undefined;

// Lazy on purpose: Next.js's build-time page-data collection imports every
// route module just to inspect it, without executing anything. Throwing at
// module scope (the previous version did `neon(databaseUrl)` eagerly) broke
// `next build` whenever DATABASE_URL wasn't set in that environment — which
// includes CI. Deferring construction to first actual use means import
// alone never requires the env var; only running a real query does.
function getDb(): Db {
  if (cached) return cached;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  cached = drizzle(neon(databaseUrl), { schema });
  return cached;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
