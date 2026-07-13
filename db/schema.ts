import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  jsonb,
  date,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Schema has grown well past its Phase 0 skeleton -- see
// docs/dev/architecture.md for the running log of design decisions and
// deliberate seams as each phase landed.

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // Nullable: rows created before Phase 9 (magic-link era), or created by
  // findOrCreateUserByEmail via a club-member invite or driver claim, have
  // no password yet -- they set one via the forgot-password flow the same
  // way a truly forgotten password is recovered.
  passwordHash: text("password_hash"),
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
  // Last-used header -> canonical field mapping for this club's generic CSV
  // exports (source=generic_csv sessions), so the mapping only needs
  // entering once per timing-software format, not on every upload. Null
  // until the club's first generic CSV upload.
  csvColumnMapping: jsonb("csv_column_mapping").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Who besides the club's original creator can manage it. `clubs.owner_user_id`
// stays as-is (the account the club was created under); this table is the
// actual access-control source of truth going forward, seeded with an
// "owner" row for every existing club's owner (see the migration). Only
// "owner" members can manage other members; "editor" can do everything
// else a club admin can (seasons/classes/events/sessions/results).
export const clubMembers = pgTable(
  "club_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").$type<"owner" | "editor">().notNull().default("editor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_club_members_club_user").on(table.clubId, table.userId),
    index("idx_club_members_user").on(table.userId),
  ]
);

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
    // Which session in an event counts toward championship points -- not
    // every published session should score (practice/qualifying usually
    // shouldn't). Defaults are set by application code at session-creation
    // time (true for final/feature, false otherwise) rather than a DB
    // default, since the right default depends on `type`.
    countsForStandings: boolean("counts_for_standings").notNull().default(false),
    publicSlug: text("public_slug").notNull().unique(),
    rawFileBlobUrl: text("raw_file_blob_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_sessions_event").on(table.eventId)]
);

export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id),
    displayName: text("display_name").notNull(),
    number: text("number"),
    transponderIds: jsonb("transponder_ids").$type<string[]>().notNull().default([]),
    claimedUserId: uuid("claimed_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_drivers_claimed_user").on(table.claimedUserId)]
);

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
    // Structured penalties (Phase 6) -- previously typed string[] and
    // unused since Phase 0. Same jsonb column, default [] unchanged, so no
    // migration is needed for this type-level change.
    penalties: jsonb("penalties").$type<{ description: string; pointsDelta: number }[]>().notNull().default([]),
    pointsOverride: integer("points_override"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_results_session").on(table.sessionId)]
);

// Audit trail for edits to already-committed results (penalties applied
// post-session, steward decisions, etc). Written before the results row is
// updated -- no transaction wrapper (neon-http doesn't support one), so a
// crash mid-edit leaves an audit record with no matching update rather than
// silently losing the record of what changed.
export const resultEdits = pgTable(
  "result_edits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resultId: uuid("result_id")
      .notNull()
      .references(() => results.id),
    editedByUserId: uuid("edited_by_user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    previousValues: jsonb("previous_values").notNull(),
    newValues: jsonb("new_values").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_result_edits_result").on(table.resultId)]
);

// Email notification subscriptions. Exactly one of classId/driverId is set
// per row (enforced at the app layer via Zod, not a DB check constraint --
// consistent with how this schema handles other invariants). No login
// required to subscribe -- confirmedAt gates whether it's live, the same
// unguessable-UUID-as-auth-boundary pattern used for sessions.public_slug.
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    classId: uuid("class_id").references(() => classes.id),
    driverId: uuid("driver_id").references(() => drivers.id),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_subscriptions_class").on(table.classId),
    index("idx_subscriptions_driver").on(table.driverId),
  ]
);
