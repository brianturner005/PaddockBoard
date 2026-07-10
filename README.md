# PaddockBoard

Club racing and karting results, published in minutes instead of buried in
PDFs and Facebook posts. A club admin uploads a timing export; drivers get a
clean, shareable results page and live championship standings.

> Upload your timing file. Get a beautiful results site. Done before the
> next heat starts.

**[Landing page](https://brianturner005.github.io/PaddockBoard/)** · **[Live app](https://paddock-board-web.vercel.app)**

This README is the engineering doc (setup, architecture, build status). The
landing page carries the pitch for non-technical visitors.

## Status

**Phase 0 (skeleton) complete** as of chunk 7 — one club, one uploaded
file, one public results page you'd happily text to someone. See
[`docs/dev/architecture.md`](docs/dev/architecture.md) for design notes and
Phase 1+ seams as they're written.

Progress:

- [x] Chunk 1 — repo scaffold & tooling
- [x] Chunk 2 — Neon + Drizzle schema
- [x] Chunk 3 — club/season/class/event/session creation (auth + admin UI)
- [x] Chunk 4 — Orbits CSV parser package
- [x] Chunk 5 — upload + client-side parse + preview UI
- [x] Chunk 6 — commit rows + publish flow
- [x] Chunk 7 — public results page (`/r/[slug]`) — **completes Phase 0's definition of done**
- [x] Chunk 8 — demo seed data (Blue Ridge Kart Club)
- [x] Chunk 9 — landing page + docs pass

**Phase 1 (championship engine) complete.**

- [x] Points schemes + standings engine — `packages/standings`'
  `computeStandings` pure function (drop rounds, countback, bonus points,
  mixed-class, DNF/DSQ, exhaustively tested) + a real points-scheme editor
  in the admin UI (`/admin/clubs/[clubId]/points-scheme`)
- [x] Standings page (`/standings/[classId]`) — recomputed per request,
  with ↑/↓ position-change indicators since the last scored round
- [x] Result editing + audit trail — `PublishedResultsEditor` lets club
  admins correct committed results on a published session; every change
  requires a reason and is logged to `result_edits` (previous/new value
  snapshots), viewable per-row via a "History" toggle
- [x] Driver auto-pages (`/d/[driverId]`) — wins/podiums/best finish plus a
  full results history, linked from every public results and standings
  table
- [x] Manual entry grid — turned out to already work from Phase 0: `source=manual` sessions open `SessionUploadPreview` straight to an empty editable table (no file step), so it's the same class-picker/save/publish flow, just without a parse step first
- [x] Generic CSV parser + per-club column mapping — `source=generic_csv`
  sessions let an admin map their own timing software's column headers to
  PaddockBoard's fields by hand; the mapping is saved per club
  (`clubs.csv_column_mapping`) and pre-filled on the next upload of the
  same format

**Phase 2 (multi-club, driver self-service) complete.**

- [x] Multi-user club access — a club can now have more than one admin.
  `club_members` (roles: `owner`, `editor`) is the access-control source of
  truth; club owners can add/remove members by email from the club page
  (`/admin/clubs/[clubId]`)
- [x] Driver claiming — a driver can claim their own profile from
  `/d/[driverId]` via a magic-link email scoped to that specific driver;
  claimed profiles show up under `/my/drivers`, and a claimed driver can
  span multiple clubs
- [x] Orbits HTML parser — `source=orbits_html` sessions parse an Orbits
  results-grid HTML export the same way as the CSV export (same column
  alias table), closing out the last Phase 0-era parser gap

**Phase 3 (multi-class sessions) complete.**

- [x] Per-row class assignment — a session's results table can now split
  across multiple classes (e.g. two kart classes sharing track time). Each
  row gets its own class picker, defaulted from a parsed `Class` column
  (Orbits CSV/HTML) or a generic-CSV mapping, editable per row before save

**Phase 4 (public discovery) complete.**

- [x] Public club/event discovery — the homepage now lists every club
  (`/c/[slug]`), and each club page lists its seasons, classes, and
  published events/sessions. Club names on results/standings/driver pages
  link back to their club page, so browsing works both from the homepage
  down and from a shared results link back out

**Phase 5 (visual design pass) in progress.**

- [x] First design pass — a single accent color (orange) used sparingly
  for primary actions and P1 highlighting, shared header/footer/position-
  cell components across all public pages, restyled tables and stat cards,
  plus two long-standing bugs fixed along the way: the page title was
  still create-next-app's default, and the Geist font was loaded but never
  actually applied (a hardcoded `font-family` in `globals.css` silently
  overrode it)

## Stack

- **Frontend + API**: Next.js (App Router) on Vercel — a single app; route
  handlers under `app/api/*` are a thin persistence layer only
- **Database**: Neon (serverless Postgres) via Drizzle ORM
- **File storage**: Vercel Blob (original timing exports, stored before parsing)
- **Auth**: email magic-link (Resend for delivery)
- **Parsing & standings**: pure TypeScript functions, run client-side, unit-tested with Vitest
- **Testing**: Vitest across all workspaces
- **CI**: GitHub Actions (lint, typecheck, test, build on every PR)

See the architecture decision notes for why this stack over the
Azure-based one originally sketched.

## Repo structure

```
apps/web/          Next.js app — UI + API route handlers
packages/shared/    Shared TS types & Zod schemas
packages/parsers/   Timing-file parsers (Orbits CSV, etc.) — @paddockboard/parsers
db/                 Drizzle schema, migrations, seed scripts (@paddockboard/db)
fixtures/           Sample/synthetic timing files for parser tests
docs/               GitHub Pages landing page (docs/index.html) + internal dev docs (docs/dev/)
```

## Development

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev        # apps/web on http://localhost:3000
npm run lint
npm run typecheck
npm run test
npm run build
```

### Database

Needs a `DATABASE_URL` (a Neon connection string) in both `.env` (repo root,
used by `drizzle-kit` and `db/migrate.ts`) and `apps/web/.env.local` (used by
the Next.js app at runtime) — see `.env.example` in each location. Neither
file is committed.

```bash
npm run db:generate   # generate a migration from db/schema.ts
npm run db:migrate    # apply pending migrations to DATABASE_URL
```

### Auth

Club admin sign-in is a real email magic-link flow (not stubbed), so
`apps/web/.env.local` also needs:

- `AUTH_SECRET` — random signing secret for the magic-link and session
  JWTs. Generate with
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- `RESEND_API_KEY` — from [resend.com](https://resend.com), required to
  actually send the sign-in email.
- `EMAIL_FROM` — sender address; `onboarding@resend.dev` works until a
  custom domain is verified in Resend.
- `APP_URL` — base URL used to build the callback link in the email
  (`http://localhost:3000` locally).

See `apps/web/.env.example`.

### File storage

Session file uploads need `BLOB_READ_WRITE_TOKEN` in `apps/web/.env.local`,
from a Vercel project's Storage → Blob tab. Used by
`POST /api/sessions/[id]/upload` and the upload/preview UI at
`/admin/sessions/[sessionId]/upload`.

## Parser research

`docs/dev/formats.md` documents what's actually known about MyLaps Orbits'
CSV export format (sourced from MYLAPS/partner docs) versus what's
assumed. No real export file has been obtained yet, so
`fixtures/orbits/csv/` are synthetic — see that folder's README for the
provenance of each fixture and what to do when a real one shows up.

## Demo

`npm run db:seed` (needs `DATABASE_URL` and `SEED_OWNER_EMAIL` — see
`.env.example`) seeds a fictional demo club, "Blue Ridge Kart Club," with a
full season, a published feature-final session (mixed finishing order,
a lapped car, two DNFs), and 14 drivers under whatever account
`SEED_OWNER_EMAIL` resolves to. Idempotent — re-running replaces the demo
club's data rather than duplicating it. Public results:
[paddock-board-web.vercel.app/r/blue-ridge-demo](https://paddock-board-web.vercel.app/r/blue-ridge-demo).

## Landing page

`docs/index.html` + `docs/styles.css` — plain hand-written HTML/CSS, no
build step, served by GitHub Pages directly from `/docs` on `main`.
Internal dev docs (`docs/dev/`) live alongside it but aren't linked from
the public page.

## License

MIT — see [`LICENSE`](LICENSE).
