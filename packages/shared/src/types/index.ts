// Domain types, inferred directly from the Drizzle schema (db/schema.ts) so
// there is one source of truth for the data model instead of a hand-maintained
// parallel copy. String-literal unions for the enum-like text columns live
// here since Drizzle's $type<>() annotations aren't visible to InferSelectModel.
import type { InferSelectModel } from "drizzle-orm";
import type {
  users,
  clubs,
  pointsSchemes,
  seasons,
  classes,
  events,
  sessions,
  drivers,
  results,
} from "@paddockboard/db/schema";

export type SessionType = "practice" | "qualifying" | "heat" | "final" | "feature";
export type SessionSource = "orbits_csv" | "orbits_html" | "generic_csv" | "manual";
export type SessionStatus = "draft" | "published";
export type ResultStatus = "finished" | "dnf" | "dns" | "dsq";
export type SeasonStatus = "active" | "archived";

export type User = InferSelectModel<typeof users>;
export type Club = InferSelectModel<typeof clubs>;
export type PointsScheme = InferSelectModel<typeof pointsSchemes>;
export type Season = InferSelectModel<typeof seasons>;
export type Class = InferSelectModel<typeof classes>;
export type Event = InferSelectModel<typeof events>;
export type Session = InferSelectModel<typeof sessions>;
export type Driver = InferSelectModel<typeof drivers>;
export type Result = InferSelectModel<typeof results>;
