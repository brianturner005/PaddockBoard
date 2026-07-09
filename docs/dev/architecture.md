# Architecture notes

Internal dev notes — not part of the public site in `/docs`. See the
Phase 0 plan for full detail; this file tracks decisions and seams as the
codebase evolves.

## Why Neon + Vercel instead of Azure

The original brief specified an Azure stack (SWA, Functions, Azure SQL,
Blob, Entra) partly for consistency with a separate Azure-based product.
In practice this is an unfunded prototype and the builder already runs
other projects on Supabase, which hit its 2-free-project ceiling. Neon
(Postgres) + Vercel (hosting) is genuinely free at prototype scale, needs
no IaC/resource templates, and pairs naturally with Next.js. Parsing and
standings computation run **client-side** as pure TypeScript functions —
the API layer (Next.js route handlers) is a thin persistence boundary, not
a service layer, which also keeps the core logic trivially unit-testable
regardless of where it eventually runs.

## Phase 0 → Phase 1 seams

These are deliberately built into Phase 0's schema/code now so Phase 1
additions are additive, not migrations against live data:

- `points_schemes` table exists from chunk 2 onward (one default row per
  club) but its computation logic is entirely deferred — `position_points`
  is stored as JSONB with no reader yet.
- `results.penalties` (JSONB) and `results.points_override` columns exist
  but are unused in Phase 0.
- `drivers.claimed_user_id` exists but is always `NULL` until driver
  claiming ships (Phase 3 per the original brief).
- `standings` as a table does not exist yet — it's a pure-function-derived,
  cacheable projection (`computeStandings(results, scheme) → standings`),
  to be added as a `packages/standings` package once points schemes are
  real.
- Public results page caching is a simple `Cache-Control: max-age=60` on
  the API response — no active cache-busting on publish yet. If
  immediate-on-publish visibility becomes a hard requirement, revisit with
  either a purge call in the publish handler or a `published_at`-keyed
  cache key.

## Auth

Custom email magic-link, delivered via Resend. This is a real (not stubbed)
flow — see chunk 3 — but multi-user-per-club access (a `club_members` join
table) is a Phase 1+ concern; Phase 0 assumes a single owner per club.
