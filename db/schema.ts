import { pgTable, uuid, text, timestamp, integer, bigint, jsonb, date, index } from "drizzle-orm/pg-core";

// Phase 0 schema. `standings` (a Phase 1+ cache table) intentionally does not
// exist yet. `points_schemes`, `results.penalties`, and `results.points_override`
// exist now but are unused until Phase 1's standings computation lands — see
// docs/dev/architecture.md for the full list of deliberate Phase 1 seams.

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  timezone: text("timezone").notNull().default("UTC"),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pointsSchemes = pgTable("points_schemes", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id),
  name: text("name").notNull(),
  positionPoints: jsonb("position_points").$type<Record<string, number>>().notNull().default({}),
  poleBonus: integer("pole_bonus").notNull().default(0),
  fastestLapBonus: integer("fastest_lap_bonus").notNull().default(0),
  dropRounds: integer("drop_rounds").notNull().default(0),
  countbackRule: text("countback_rule"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  status: text("status").$type<"active" | "archived">().notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id),
  name: text("name").notNull(),
  pointsSchemeId: uuid("points_scheme_id")
    .notNull()
    .references(() => pointsSchemes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id),
  name: text("name").notNull(),
  venue: text("venue"),
  eventDate: date("event_date").notNull(),
  roundNumber: integer("round_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    type: text("type").$type<"practice" | "qualifying" | "heat" | "final" | "feature">().notNull(),
    name: text("name").notNull(),
    source: text("source").$type<"orbits_csv" | "orbits_html" | "generic_csv" | "manual">().notNull(),
    status: text("status").$type<"draft" | "published">().notNull().default("draft"),
    publicSlug: text("public_slug").notNull().unique(),
    rawFileBlobUrl: text("raw_file_blob_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_sessions_event").on(table.eventId)]
);

export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id),
  displayName: text("display_name").notNull(),
  number: text("number"),
  transponderIds: jsonb("transponder_ids").$type<string[]>().notNull().default([]),
  claimedUserId: uuid("claimed_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const results = pgTable(
  "results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id),
    position: integer("position"),
    status: text("status").$type<"finished" | "dnf" | "dns" | "dsq">().notNull().default("finished"),
    laps: integer("laps"),
    bestLapMs: integer("best_lap_ms"),
    totalTimeMs: bigint("total_time_ms", { mode: "number" }),
    gapMs: bigint("gap_ms", { mode: "number" }),
    penalties: jsonb("penalties").$type<string[]>().notNull().default([]),
    pointsOverride: integer("points_override"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_results_session").on(table.sessionId)]
);
