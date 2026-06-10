# Contributing

Thanks for helping improve the SC Sourcing Engine. This guide keeps changes
safe and consistent.

## Getting started

```bash
npm install
cp .env.example .env        # fill in at least DATABASE_URL + DIRECT_URL
npx prisma generate
npm run db:push             # apply the schema to your dev database
npm run dev
```

To load demo data into a **local** database (never production):

```bash
npm run db:seed
```

## Before you open a PR

Run the same checks CI runs:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # next build
```

All three must pass. New behavior in `src/lib/services/**` should come with a
unit test in `tests/` — those modules are pure logic and fast to cover.

## Conventions

- **Language:** TypeScript, strict. Prefer explicit types at module boundaries.
- **Imports:** use the `@/` alias for anything under `src/`.
- **Database:** change `prisma/schema.prisma`, then `npm run db:push`. Do not
  hand-edit generated client code.
- **Secrets:** never commit credentials. Read them from `process.env`.
- **Commits:** present-tense, imperative summaries ("Add follow-up scheduler").
- **Automation safety:** anything that can send email must respect the
  auto-send config, daily cap, and kill-switch.

## Project layout

| Path | What lives there |
| --- | --- |
| `src/app` | Next.js App Router pages, layouts, API routes |
| `src/components` | UI components |
| `src/lib/services` | Core logic (scoring, dedupe, enrich, autosend, follow-ups) |
| `src/lib/sources` | Public-data lead connectors |
| `src/server/actions` | Server actions (auth, leads, outreach) |
| `prisma` | Schema + seed |
| `tests` | Vitest unit tests |
