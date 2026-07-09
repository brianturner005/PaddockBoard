// Domain types shared between the web app and other packages.
// These are hand-written stubs for Phase 0 scaffolding; chunk 2 (Neon + Drizzle
// schema) will regenerate/align these to match the actual database schema exactly.

export type SessionType = "practice" | "qualifying" | "heat" | "final" | "feature";
export type SessionSource = "orbits_csv" | "orbits_html" | "generic_csv" | "manual";
export type SessionStatus = "draft" | "published";
export type ResultStatus = "finished" | "dnf" | "dns" | "dsq";
export type SeasonStatus = "active" | "archived";

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  timezone: string;
  ownerUserId: string;
  createdAt: string;
}

export interface PointsScheme {
  id: string;
  clubId: string;
  name: string;
  positionPoints: Record<string, number>;
  poleBonus: number;
  fastestLapBonus: number;
  dropRounds: number;
  countbackRule: string | null;
  createdAt: string;
}

export interface Season {
  id: string;
  clubId: string;
  name: string;
  year: number;
  status: SeasonStatus;
  createdAt: string;
}

export interface Class {
  id: string;
  seasonId: string;
  name: string;
  pointsSchemeId: string;
  createdAt: string;
}

export interface Event {
  id: string;
  seasonId: string;
  name: string;
  venue: string | null;
  eventDate: string;
  roundNumber: number | null;
  createdAt: string;
}

export interface Session {
  id: string;
  eventId: string;
  type: SessionType;
  name: string;
  source: SessionSource;
  status: SessionStatus;
  publicSlug: string;
  rawFileBlobUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface Driver {
  id: string;
  clubId: string;
  displayName: string;
  number: string | null;
  transponderIds: string[];
  claimedUserId: string | null;
  createdAt: string;
}

export interface Result {
  id: string;
  sessionId: string;
  driverId: string;
  classId: string;
  position: number | null;
  status: ResultStatus;
  laps: number | null;
  bestLapMs: number | null;
  totalTimeMs: number | null;
  gapMs: number | null;
  penalties: string[];
  pointsOverride: number | null;
  createdAt: string;
}
