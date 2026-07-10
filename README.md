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

**Phase 0 (skeleton) in progress.** Goal: one club, one uploaded file, one
public results page you'd happily text to someone. See
[`docs/dev/architecture.md`](docs/dev/architecture.md) for design notes and
Phase 1+ seams as they're written.

Progress:

- [x] Chunk 1 — repo scaffold & tooling
- [x] Chunk 2 — Neon + Drizzle schema
- [x] Chunk 3 — club/season/class/event/session creation (auth + admin UI)
- [x] Chunk 4 — Orbits CSV parser package
- [x] Chunk 5 — upload + client-side parse + preview UI
- [x] Chunk 6 — commit rows + publish flow
- [ ] Chunk 7 — public results page
- [x] Chunk 8 — demo seed data (Blue Ridge Kart Club) — built ahead of chunk 7 to populate the admin UI early; the public `/r/blue-ridge-demo` link isn't live until chunk 7 lands
- [x] Chunk 9 — landing page + docs pass — built ahead of chunk 7 at the user's request; GitHub Pages still needs to be enabled in repo settings (Settings → Pages → `main` / `/docs`)

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
club's data rather than duplicating it. The public results link
(`/r/blue-ridge-demo`) goes live once chunk 7 (public results page) lands.

## Landing page

`docs/index.html` + `docs/styles.css` — plain hand-written HTML/CSS, no
build step, served by GitHub Pages directly from `/docs` on `main`.
Internal dev docs (`docs/dev/`) live alongside it but aren't linked from
the public page. To enable/update the live URL: repo Settings → Pages →
Source: Deploy from a branch → `main` / `/docs`.

## License

MIT — see [`LICENSE`](LICENSE).
