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

## Parser package browser-bundling

`packages/parsers` has to run client-side, which ruled out `iconv-lite`
for the Windows-1252 fallback despite being the original plan — it depends
on Node's `Buffer`, which Next 15+ no longer auto-polyfills for the client
bundle. Node's/the browser's built-in `TextDecoder` supports
`windows-1252` natively (verified), so encoding detection uses that
instead with zero extra dependency. `papaparse` (CSV tokenization) is
browser-first by design, so no similar concern there. Confirmed in chunk 5:
`SessionUploadPreview` (a client component) imports `parse()` from
`@paddockboard/parsers` directly and `next build` bundles it with no
Node-core-module errors.

`apps/web/lib/blob.ts` (Vercel Blob wrapper) is now wired into
`POST /api/sessions/[id]/upload` (chunk 5) — needs `BLOB_READ_WRITE_TOKEN`
to actually store a file, not required for anything before that.

## Committing results (chunk 6)

`POST /api/sessions/[id]/rows` requires a single `classId` for the whole
session commit — the brief calls out "class splits within one session"
(multiple classes on track together, common in karting) as real-world
messiness, but Phase 0 doesn't attempt to parse or assign per-row classes.
The parser treats the CSV's `Class` column as recognized-but-unmodeled
(see `docs/dev/formats.md`). **Phase 1 seam**: if per-row class assignment
is needed, map that column in `packages/parsers` and replace the single
`classId` field in `commitRowsSchema` with a per-row one — the schema
already has a `results.class_id` FK per row, not per session, so this is
additive.

Committing is delete-then-insert per session (no transaction — the
`neon-http` driver doesn't support one), so re-saving after edits replaces
rather than accumulates. Driver dedup matches on `(clubId, number)` when a
number is present, else `(clubId, displayName)` exact match — no
transponder-based matching yet, since the results-export columns being
parsed don't carry transponder IDs (that's the entry-list export, a
different file MYLAPS documents separately).

Rows with `status: "unknown"` (the parser's "couldn't tell" state) can't be
committed — `committableStatusSchema` excludes it deliberately, since it's
a signal for human review, not a real result. The UI blocks saving until
those rows are resolved.

## Env-dependent modules must be lazy

`next build`'s page-data-collection step imports every route module just
to inspect it — it doesn't execute handlers, but importing still runs
top-level module code. `db/client.ts` originally called `neon(databaseUrl)`
eagerly at module scope and threw if `DATABASE_URL` was unset, which broke
`next build` in any environment without env vars configured — including
CI, which has no `.env.local` (that file is local-only and gitignored).
Fixed by deferring construction behind a `Proxy` so the env var is only
read on first actual property access (i.e. first real query), not on
import. `apps/web/lib/{auth,email,blob}.ts` were already written this way
(env vars read inside function bodies, not at module scope) — `db/client.ts`
was the one exception. Keep this pattern for anything new that constructs
a client from an env var.

## Public results page (chunk 7)

`apps/web/lib/public-session.ts` exports `getPublicSessionData(slug)`,
wrapped in React's `cache()` so `generateMetadata` and the page component
(both of which need the same data) share one DB round trip per request
instead of two. It returns a discriminated result
(`not_found` | `not_published` | `ok`) rather than just 404-ing on
anything not publishable — draft sessions and truly-nonexistent slugs get
distinct messaging (`/r/[slug]/page.tsx`), per the brief's "distinct
not-published-yet vs not-found vs loading states" requirement.
`GET /api/public/sessions/[slug]` reuses the same function and sets
`Cache-Control: public, max-age=60` — no active cache-busting on publish
yet (seam already noted above).

Results are grouped by class server-side even though Phase 0's commit flow
(chunk 6) only ever writes one class per session at a time — it's the
correct shape for the domain model regardless, and costs nothing extra
now that per-row class assignment becomes possible in Phase 1 (same seam
noted in the chunk 6 section above).

# Phase 1

## Standings engine

`packages/standings` is the pure function the original brief mandated:
`computeStandings(rounds, scheme, classId) → DriverStanding[]`, no I/O, no
DB access, exhaustively tested (drop rounds, ties/countback, bonus points,
mixed-class sessions, DNF/DSQ handling — see `compute.test.ts`).

Two domain decisions made explicit here since they weren't obvious from
the schema alone:

- **Which session counts.** Standings operate on *rounds* (events), not
  individual sessions — "best 7 of 9" means 7 of 9 events. A new
  `sessions.counts_for_standings` boolean marks which session in an event
  scores (defaulted true for `type=final|feature`, false otherwise, at
  creation time in the API route — not a DB-level default, since the
  right value depends on `type`). Editable per-session via
  `PATCH /api/sessions/[id]` and a checkbox in the admin upload page,
  since not every club scores the same way (some score heats, some run a
  single trophy race with no "final" at all).
- **Pole bonus is deferred.** `PointsScheme.poleBonus` exists and is
  editable, but `computeStandings` doesn't compute it — there's no data
  source yet for "who took pole" (that's a qualifying session's P1, and
  qualifying isn't linked to the race session it applies to). Fastest lap
  bonus *is* auto-computed (unambiguous: lowest `bestLapMs` among
  finishers in that round/class). Pole can be applied by hand via a
  result's `points_override` until real pole-tracking exists.

`apps/web/lib/standings.ts` (`getClassStandingsData`, same `cache()`
per-request dedup pattern as `public-session.ts`) is the only place that
touches the DB for standings — it gathers each round's scoring-session
results (all classes mixed together, exactly what `computeStandings` is
built to filter) and calls the pure function twice per request: once for
the full season, once with the most recent scored round dropped, to
derive the "since last round" position-change indicator
(`/standings/[classId]`) — there's no separate stored "previous
standings" anywhere, it's just the same pure function called with one
fewer round.

**Seam for later**: `classId` alone identifies a season/club via joins, so
`/standings/[classId]` works but isn't a pretty URL. A short slug (like
sessions' `public_slug`) would need a schema change — not done yet since
it's cosmetic, not functional.

## Driver auto-pages

`/d/[driverId]` is a public page built the same way as `/r/[slug]` and
`/standings/[classId]`: a `cache()`-wrapped data function
(`apps/web/lib/driver-page.ts`) does one query joining `drivers` → `clubs`
for identity, then `results` → `sessions` → `events` → `seasons` →
`classes` filtered to `sessions.status = 'published'`, and derives
wins/podiums/best-finish client-side from the row set rather than separate
aggregate queries — cheap at this data scale and keeps the "one function,
one round trip" pattern consistent with the rest of the public surface.
Every results table across the public pages (`/r/[slug]`,
`/standings/[classId]`) now links driver names to this page.

## Result editing + audit trail

Published results are not immutable — race control decisions get
protested, timing mistakes get caught after the fact — but every change
needs a paper trail, per the brief's general "don't silently mutate
committed data" posture carried over from Phase 0.

- **`result_edits` table**: one row per field-level change to a `results`
  row, storing `previous_values`/`new_values` as `jsonb` snapshots (not a
  column-by-column diff table) and a required `reason` string. `jsonb`
  snapshots were chosen over per-field audit rows because the edit UI
  always changes a row as a unit (a single "reason" covers everything
  changed in one save), so a single audit row per edit matches how edits
  actually happen and stays trivially easy to render as a history list.
- **Write order**: `PATCH /api/results/[id]` writes the `result_edits` row
  *before* updating `results` — under `neon-http` there's no transaction
  support (same constraint noted for chunk 6's delete-then-insert), so the
  two writes can't be atomic. Writing the audit row first means a crash
  between the two writes leaves an orphaned-but-harmless audit record
  instead of an unlogged silent mutation — the same reasoning already
  applied to `sessions[id]/rows`.
  `getResultWithClub` (added to `lib/ownership.ts`, mirroring the existing
  `get*WithClub` helpers) walks `results → sessions → events → seasons →
  clubs` for the ownership check, same pattern as everywhere else in the
  admin API.
- **Editor UI**: `PublishedResultsEditor` (rendered in the session upload
  page only once `session.status === 'published'`) is a separate component
  from `SessionUploadPreview` rather than a mode of it — the two have
  different data sources (committed `results` rows via
  `GET /api/sessions/[id]` vs. an in-memory parsed file) and different
  save semantics (PATCH-per-changed-row with a required reason, vs. bulk
  replace on initial commit), so sharing one component would mean
  branching most of its internals on `session.status` for no real reuse.
  Only position/status/laps/points-override are editable inline;
  lap-time/gap fields are intentionally read-only here since correcting
  timing data is a rarer, higher-stakes edit better done deliberately
  (still possible via the same PATCH endpoint, just not exposed in this
  table) than a click-to-edit cell.

## Generic CSV parser + per-club column mapping

Not every club runs Orbits. `source=generic_csv` sessions cover any other
timing software's CSV export by having an admin map the file's own column
headers to PaddockBoard's canonical fields by hand, once per club, instead
of maintaining an alias table for formats nobody's documented.

- **Shared parsing core**: orbits-csv and generic-csv only ever differed in
  *how* a raw header resolves to a canonical field (a fixed alias table vs.
  an admin-picked mapping) — everything downstream (decoding, duration
  parsing, the DNF/DNS/DSQ status heuristic, warning generation) was
  identical. Pulled that shared half out into `row-builder.ts` and
  `duration.ts` at the `packages/parsers` root; `orbits-csv/parse.ts` and
  the new `generic-csv/parse.ts` each just build a `Map<header,
  ColumnResolution>` their own way and hand it to the same `buildRow`.
  `CanonicalField` and `ColumnResolution` moved to `types.ts` as the shared
  vocabulary both formats resolve into.
- **Two-call parse API**: `readCsvHeaders(buffer)` reads just the header
  row (Papa with `preview: 1`) so the UI can render a mapping form before
  committing to a full parse; `parseGenericCsv(buffer, columnMapping)` does
  the real parse once a mapping is chosen.  `parse()`'s signature grew an
  options bag (`{ columnMapping }`) rather than a fifth positional
  parameter that only one format uses.
- **Per-club persistence, not per-session**: `clubs.csv_column_mapping`
  (`jsonb`) stores the last-used mapping keyed by the *raw header string*.
  `SessionUploadPreview` pre-fills the mapping form from it (exact header
  match — a club whose software always exports identical column names
  gets a zero-click mapping step after the first upload) and
  `PATCH /api/clubs/[id]/csv-mapping` saves whatever mapping was just
  used, so the club converges on "map once" rather than "map every
  session." No mapping *history* is kept — only the most recent one,
  since re-mapping after a genuine format change is expected and cheap.
- **Required field**: the mapping UI won't let you continue without at
  least one column mapped to driver name — every other field degrades
  gracefully to a warning (same as orbits-csv), but a nameless row isn't
  useful to anyone reviewing the preview table.

# Phase 2

## Multi-user club access

Phase 0/1 assumed a single owner per club (`clubs.owner_user_id`), flagged
back then as a Phase 1+ seam. First Phase 2 chunk: a club can now have more
than one person managing it.

- **`club_members` is the access-control source of truth going forward.**
  `clubs.owner_user_id` is left as-is (the account the club was created
  under — still useful as a denormalized "who made this" reference) but no
  route or page checks it anymore. Every place that used to compare
  `club.ownerUserId !== user.id` now calls `hasClubAccess(clubId, userId)`
  (`apps/web/lib/ownership.ts`), which is a single indexed lookup against
  `club_members` rather than re-deriving through whatever join chain got
  the caller to a `club` row. That's ~15 call sites (every admin page and
  every write-side API route) — mechanical, one check swapped for another,
  no behavior change beyond "more than one user can now pass."
- **Two roles, not a permissions matrix.** `owner` can do everything
  `editor` can (seasons/classes/events/sessions/results) plus manage
  membership; `editor` can't add or remove members. No finer-grained
  scoping (e.g. "can edit results but not points schemes") — clubs are
  small volunteer operations, not organizations that need RBAC.
- **Backfill migration.** Every club that already existed only had
  `owner_user_id` set, nothing in `club_members` — without a backfill,
  flipping the access check over would have locked every existing club
  owner out of their own club on deploy. `db/migrations/0004_*.sql` has a
  hand-added `INSERT ... SELECT id, owner_user_id, 'owner' FROM clubs`
  after the generated `CREATE TABLE` (drizzle-kit only generates schema
  DDL, not data backfills — same manual-SQL-paste workflow used for every
  migration so far, just with one extra statement appended by hand).
- **Adding a member reuses `findOrCreateUserByEmail`** (`lib/auth.ts`,
  already existed for the magic-link flow) — an owner adds someone by
  email with no separate "invite accepted" step; the next time that email
  signs in via magic link, the club shows up under "Your clubs" because
  `admin`'s club list now joins through `club_members` instead of
  filtering `clubs` by `owner_user_id`.
- **Can't remove the last owner.** `DELETE /api/clubs/[id]/members`
  counts remaining `role='owner'` rows (excluding the one being removed)
  and rejects with 400 if that would hit zero — otherwise a club could be
  locked out of its own membership management entirely, with no path back
  in short of a manual DB fix.

## Driver claiming

`drivers.claimed_user_id` existed since Phase 0 as a seam, always `NULL`.
Second Phase 2 chunk: drivers can now claim their own profile.

- **A second, narrower magic-link flow**, not a repurposing of the sign-in
  one. `createDriverClaimToken(email, driverId)` / `verifyDriverClaimToken`
  (`lib/auth.ts`) mirror `createMagicLinkToken`/`verifyMagicLinkToken`
  exactly, but the JWT payload also carries `driverId` and
  `purpose: "claim-driver"` — so a claim link is bound to one specific
  driver and can't be replayed to claim a different one, and can't be
  confused with a plain sign-in link even if intercepted.
- **What claiming actually proves.** Entering an email on `/d/[driverId]`
  and clicking the emailed link proves "I control this email address," not
  "I am this driver" — the same low-friction trust model the rest of auth
  already uses (no ID verification anywhere in this app). Acceptable for a
  volunteer club-racing results site; stated explicitly here so it's a
  documented tradeoff, not an oversight.
- **Race handled, not prevented.** Two people could both request a claim
  link for the same unclaimed driver before either clicks through.
  `GET /api/auth/claim-callback` re-checks `claimed_user_id` at the moment
  the link is clicked (not just at request time) and rejects a second
  claimant with a `?claim=taken` redirect rather than silently
  overwriting the first claimant's link.
- **Claiming also signs the user in** (`createSession`) — one email round
  trip does both jobs, since a driver claiming their profile has no
  existing account to fall back to logging into separately.
- **`/my/drivers`** lists every `drivers` row with `claimed_user_id`
  matching the current user, across every club — a single user can claim
  driver profiles at more than one club, since `drivers` is club-scoped
  but `users`/sessions are not.
- Added `idx_drivers_claimed_user` since `/my/drivers` filters by it.

## Orbits HTML parser

Third Phase 2 chunk, closing out the last item from Phase 0's original
task breakdown: `source=orbits_html` sessions now have a real parser.

- **No real HTML export sample was found**, and native HTML export isn't
  clearly documented for Orbits 4/5 at all (see the updated
  `docs/dev/formats.md`) — only that some installs commonly print/save the
  results grid to HTML. Rather than invent a separate column vocabulary,
  `orbits-html/parse.ts` assumes the export carries the same columns as
  the documented CSV export and **reuses the CSV parser's exact alias
  table** (`resolveColumn` from `orbits-csv/columns.ts`) — maximal reuse
  of a decision already made, not a new one.
- **Regex-based table extraction, not a DOM parser.** Adding `DOMParser`
  usage would mean either a browser-only code path (breaks the Node-side
  Vitest tests, same problem `iconv-lite` caused for encoding) or a jsdom
  dependency just for parsing. A narrow regex extractor (find the first
  `<table>`, split into `<tr>`, split into `<th>`/`<td>`, strip tags,
  decode a handful of common entities) stays zero-dependency and runs
  identically in the browser and in Vitest under plain Node — same
  reasoning as the CSV parser's `iconv-lite` avoidance, applied to a new
  problem. Trade-off stated plainly: it doesn't handle colspan/rowspan,
  multiple tables, or deeply nested markup, and doesn't try to.
- Otherwise identical downstream to `orbits-csv` — same `buildRow`, same
  DNF/DNS/DSQ heuristic, same warnings shape. `SessionUploadPreview`
  treats `orbits_html` the same as `orbits_csv` (immediate parse on
  upload, no mapping step) since, unlike `generic_csv`, the column
  vocabulary is assumed known up front.

# Phase 3

## Per-row class assignment

Karting sessions commonly run multiple classes on track together in one
race — flagged as an open seam since chunk 6 (`results.class_id` was
always a per-row FK, but the commit flow only ever wrote one `classId` for
every row in a session, since there was nowhere for a per-row class hint
to come from yet).

- **`className` is now a canonical field**, not just a recognized-but-
  unmodeled column. Orbits' `Class` header (documented in
  `docs/dev/formats.md`) now maps to it instead of `known_unmodeled`;
  `orbits-html` gets this for free by reusing the same alias table.
  Generic CSV mapping gained a "Class" option. The field is optional and
  free-text — the parser makes no claim about what values are valid, it
  just surfaces whatever string was in the file (`ParsedRow.className`).
- **Matching a free-text hint to a real class is an app-layer job, not a
  parser job.** `packages/parsers` has no concept of a club's actual
  `classes` rows, so `SessionUploadPreview` does the matching itself:
  after parsing, each row gets a default `classId` via a case-insensitive
  exact match of `row.className` against the season's classes, falling
  back to the season's first class if there's no match or no hint at all
  (preserves today's single-class-session behavior for files/manual entry
  with no class data). This lives in a `rowClassIds` array parallel to
  `rows`, not on `ParsedRow` itself, to keep the parser package's types
  free of an app-specific "class" concept — the same separation already
  used for the audit trail and column-mapping features.
  The table's per-row "Class" `<select>` lets an admin override any row's
  default before saving; the removed session-level "Class" picker is gone
  entirely, not just hidden, since defaulting per row makes a single
  session-wide choice redundant rather than a fallback.
- **`commitRowsSchema` moved `classId` from the request's top level onto
  each row.** `POST /api/sessions/[id]/rows` now validates that every
  *distinct* classId used across the submitted rows belongs to the
  session's season in one `inArray` query, rejecting the whole commit if
  any row's class doesn't belong — same all-or-nothing replace-on-commit
  semantics as before, just checked across a set instead of a single id.
  No schema/migration was needed for this chunk: `results.class_id` was
  already a mandatory per-row column since Phase 0, this only changes
  which value the app sends for it.
- Public pages needed no changes — `getPublicSessionData`
  (`apps/web/lib/public-session.ts`) already grouped results by `classId`
  per row (documented back in the chunk 7 notes as "the correct shape for
  the domain model regardless" of what the write side did at the time),
  so a session with rows split across multiple classes was already going
  to render correctly on `/r/[slug]`.

# Phase 4

## Public club/event discovery

Every public page so far (`/r/[slug]`, `/standings/[classId]`,
`/d/[driverId]`) needed a direct, previously-shared link to reach — there
was no way to *find* a club's results without already having one. This
chunk adds a browsable path in from the homepage.

- **`apps/web/lib/public-club.ts`** (`getPublicClubData(slug)`,
  `getPublicClubDirectory()`) follows the same shape as
  `public-session.ts`/`standings.ts`: a `cache()`-wrapped function
  returning a discriminated `not_found | ok` result, one round trip per
  concern. Fetches seasons, classes, and events+published-sessions for a
  club with three `inArray`-scoped queries (not N+1 per season) and
  assembles the tree in JS with `Map`s — same grouping pattern used for
  per-class results grouping in `public-session.ts`.
- **An event only appears once it has at least one published session.**
  Seasons/classes/events aren't gated behind a `status` the way sessions
  are, so without this filter a freshly-created, still-being-set-up event
  would show up on the public page with nothing to click — worse than not
  listing it at all. Classes are still always listed (linking to
  `/standings/[classId]`, which already has its own graceful empty state)
  since an admin creates classes up front, before any results exist, and
  a class with no scored rounds yet is a legitimate, not-broken state.
- **`/` (homepage) became a dynamic route.** It was a static marketing
  page since Phase 0 (`○` in the build output); adding a club directory
  means it now reads from the DB, so `export const dynamic =
  "force-dynamic"` was required — without it, `next build` tries to
  statically prerender `/` at build time and fails outright, since a
  build machine doesn't have a live `DATABASE_URL` connection the way a
  request-time Vercel function does. Caught this the same way the lazy-DB-
  client bug was caught in chunk 5/6: running the build and reading the
  actual error rather than assuming a page without a dynamic route segment
  is automatically request-time.
- Club name in the header of `/r/[slug]`, `/standings/[classId]`, and
  `/d/[driverId]` is now a link to `/c/[slug]` (all three payloads already
  carried `clubSlug`) — the discovery path also works "outward" from a
  results page back up to everything else that club has published, not
  just "inward" from the homepage down.

# Phase 5

## Visual design pass

The app was deliberately bare Tailwind-for-spacing-only since Phase 0
(see the "Admin UI" section of the original plan). With the feature set
broad and stable, this chunk is a first real design pass — no new
functionality, purely presentation.

- **One accent color, used sparingly.** Orange (`orange-600` light /
  `orange-400` dark) for primary buttons, the site's small logo dot, and
  P1 in results/standings tables. Deliberately not red, green, or amber —
  those are already semantic (error/success/warning) throughout the app,
  and reusing one of them as the brand color would blur that meaning.
  Applied at a single point of leverage where possible: `form-styles.ts`'s
  `buttonClass`/`inputClass` are shared by every admin form and the
  results editor, so retinting those two strings restyled the whole admin
  surface in one edit rather than touching each form.
- **Two bugs found and fixed while touching this code, unrelated to
  styling but caught because the files were open:** the root layout still
  had create-next-app's default `<title>Create Next App</title>`, never
  overwritten since Phase 0's scaffold chunk; and `globals.css` hardcoded
  `font-family: Arial, Helvetica, sans-serif` on `body`, silently
  overriding the Geist font that `layout.tsx` loads and wires up via
  `@theme inline` — the font was being loaded but never actually applied.
  Both fixed (`layout.tsx` now sets real metadata and applies `font-sans`
  on `<body>`; `globals.css` now uses `var(--font-sans)`).
- **`PublicHeader`/`PublicFooter`/`PositionCell`** (`apps/web/components/`)
  are the new shared chrome across all five public pages (`/`, `/c/[slug]`,
  `/r/[slug]`, `/standings/[classId]`, `/d/[driverId]`) — a consistent top
  bar and footer instead of each page hand-rolling its own back-link, and
  one shared "Pos" column renderer (P1 gets the accent color, P2/P3 stay
  bold-but-neutral) instead of three near-duplicate inline expressions.
  Kept as plain components imported into each page rather than a Next.js
  route-group layout (`(public)/layout.tsx`) — the five pages aren't
  siblings under one directory today, and restructuring routes into a
  group purely for shared chrome was a bigger, riskier change than the
  design pass itself called for.
- **Tables**: wrapped in a rounded bordered container with a tinted header
  row, row dividers instead of a heavy border on every row, and a podium
  highlight via `PositionCell`. Driver page stats (wins/podiums/best
  finish) became three small bordered cards instead of an inline text row.
- Not covered in this pass: admin CRUD pages (club/season/event/session
  creation forms) picked up the retint via `form-styles.ts` but weren't
  otherwise restyled — the highest-traffic surfaces (public results,
  standings, driver, club pages, homepage) were prioritized within this
  chunk's scope.
- **Verification note**: this sandbox still can't reach Neon (same
  constraint noted since chunk 2), so this was verified via
  lint/typecheck/build only, same as every other chunk this session —
  actual visual review needs to happen on the live Vercel deploy.

# Phase 6

## Penalties

`results.penalties` existed since Phase 0 as an unused seam, typed
`string[]`. First real use of it.

- **Structured, not free text.** Retyped to `{ description: string;
  pointsDelta: number }[]` — same jsonb column, same `[]` default, so no
  migration was needed for this chunk, only a TypeScript type change. A
  bare string list would have made "how many points did this cost" a
  parsing problem later; storing the delta alongside the reason keeps the
  standings engine's job trivial (sum `pointsDelta`, no string parsing).
- **Penalties apply on top of whatever points were already computed** —
  position-based lookup *or* a manual `pointsOverride` — rather than being
  yet another override mode. `packages/standings`'s `ResultForStandings`
  gained a `penaltyPoints: number` field (the caller pre-sums the
  structured list; the pure function only ever sees a plain number to add
  in) and `computeStandings` adds it in after the override/position+bonus
  branch. Kept the package's public surface minimal on purpose — it
  doesn't need to know penalties have descriptions, only their point
  effect.
- **No automatic re-classification.** A penalty does not move a driver's
  `results.position` or recompute finishing order — `position` stays the
  authoritative classified position, same as it's been since Phase 0 (it's
  never derived from `totalTimeMs`). If a penalty changes who finished
  where, the admin still edits `position` by hand alongside adding the
  penalty entry, the same way `pointsOverride` has always worked. Scoped
  this way deliberately: auto-recalculating classification from a time
  penalty is a much bigger, riskier feature (it would need to touch every
  other row's gap/position too) than this chunk's actual ask.
- **Editable only from `PublishedResultsEditor`, not the initial commit
  flow.** Penalties are steward decisions made after reviewing an
  incident, essentially always post-publish — so `SessionUploadPreview`'s
  row shape is untouched, and `commitRowsSchema` doesn't gain a penalties
  field. The editor's per-row "Penalties" toggle (same expandable-row
  pattern as "History") lists existing entries with a remove link and a
  small add form (reason + points); saving reuses the existing
  `PATCH /api/results/[id]` endpoint and audit trail unchanged — penalties
  is just one more field in the `previousValues`/`newValues` snapshot.
- **Public visibility**: a session's results page (`/r/[slug]`) shows a
  small "penalty" badge next to a driver's name when they have one or
  more, with the reason and point value in a native title tooltip —
  transparency matters for results, a penalty shouldn't be invisible on
  the page people actually check.
