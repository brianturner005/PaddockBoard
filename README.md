# PaddockBoard

Club racing and karting results, published in minutes instead of buried in
PDFs and Facebook posts. A club admin uploads a timing export; drivers get a
clean, shareable results page and live championship standings.

> Upload your timing file. Get a beautiful results site. Done before the
> next heat starts.

## Status

**Phase 0 (skeleton) in progress.** Goal: one club, one uploaded file, one
public results page you'd happily text to someone. See
[`docs/dev/architecture.md`](docs/dev/architecture.md) for design notes and
Phase 1+ seams as they're written.

Progress:

- [x] Chunk 1 — repo scaffold & tooling
- [x] Chunk 2 — Neon + Drizzle schema
- [ ] Chunk 3 — club/season/class/event/session creation
- [ ] Chunk 4 — Orbits CSV parser package
- [ ] Chunk 5 — upload + client-side parse + preview UI
- [ ] Chunk 6 — commit rows + publish flow
- [ ] Chunk 7 — public results page
- [ ] Chunk 8 — demo seed data (Blue Ridge Kart Club)
- [ ] Chunk 9 — landing page + docs pass

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
packages/parsers/   Timing-file parsers (Orbits CSV, etc.) — coming in chunk 4
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

## Demo

Once chunk 8 lands, a seeded demo club ("Blue Ridge Kart Club", fictional)
will be linked here with a live results page.
