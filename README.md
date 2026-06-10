# SC Sourcing Engine

An **agent-assisted client sourcing tool** for Stanford Consulting Project Directors (PDs).

Most of the pain in sourcing isn't the client call — it's getting the first call.
This app automates the annoying pre-call work (finding leads, enriching them,
scoring fit, drafting outreach, tracking replies, assigning calls) while keeping
**fully automated outreach with a one-click kill switch** (or human approval if you prefer).

> **Product stance:** the app is **automated by default** — generated drafts
> send immediately, and **Autopilot** researches + drafts + sends for top leads
> daily — with a one-click dashboard kill switch and a daily cap. The Review
> Queue is an exception queue (drafts that couldn't auto-send). Prefer human
> approval? Turn **Automatic sending OFF** in Settings and every draft waits for
> review. Cold email at volume affects deliverability and brand — use the cap
> and the allowed-claims guardrail deliberately.

---

## 🚀 Live deployment

Production runs at **https://sc-sourcing-engine.vercel.app** (Vercel + Neon
Postgres). For the non-technical handoff — getting started, inviting the team,
FAQ, and the in-app **Help assistant** at
[/help](https://sc-sourcing-engine.vercel.app/help) — see
[`DIRECTOR_GUIDE.md`](DIRECTOR_GUIDE.md).

Deployment facts:
- **Build**: `vercel-build` runs `prisma db push` against Neon (via `DIRECT_URL`),
  then `next build`. Schema changes apply on deploy.
- **Cron**: `vercel.json` schedules `/api/cron/follow-ups` daily (16:00 UTC);
  Vercel sends `Authorization: Bearer CRON_SECRET` automatically.
- **Bootstrap**: `GET /api/setup/seed?secret=<CRON_SECRET>` loads config
  defaults only (scoring rules + email templates) — never sample data.
  `GET /api/setup/clean?secret=…&confirm=1` strips any demo data if a database
  was ever seeded with it.
- **Env vars** (set in the Vercel project): `DATABASE_URL`, `DIRECT_URL`,
  `LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `APOLLO_API_KEY`, `EMAIL_PROVIDER`,
  `OPEN_SIGNUP`, `CRON_SECRET`, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`.
- **Hosted limitation**: the two Playwright scraper connectors (Y Combinator,
  bring-your-own-URL) need a real browser and only run from a local copy.
- **Redeploy**: `npx vercel deploy --prod` from the repo (or connect the GitHub
  repo in the Vercel dashboard for deploys on push).

## 🎬 Demo & onboarding video

A full, step-by-step walkthrough (~10.7 min, 1080p) is committed at
[`scripts/demo/sc-sourcing-engine-demo.mp4`](scripts/demo/sc-sourcing-engine-demo.mp4) —
everything below, shown on screen and explained, so anyone in SC can follow
along. Regenerate it any time with the pipeline in
[`scripts/demo/`](scripts/demo/README.md).

## Workflow

1. **Import** the SC alumni spreadsheet or any lead CSV (robust column mapping + dedupe).
2. **Source** additional leads from Apollo / Clay (mock providers run locally; real adapters are stubbed).
3. **Clean & dedupe** on email → LinkedIn → name+company.
4. **Enrich** company, title, email, LinkedIn, industry, location, size, website.
5. **Tag** Stanford / SC alumni and warm connections.
6. **Score** leads on fit, with a full breakdown.
7. **Generate** personalized first email + 2 follow-ups (LLM or deterministic templates).
8. **Review** every draft (edit / approve / reject / regenerate).
9. **Track** status manually: ready → sent → replied → booked.
10. **Assign** replied/booked leads to PDs with an explained recommendation.
11. **Dashboard** for the whole pipeline.

---

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** with a custom shadcn-style component set
- **Prisma** ORM with **PostgreSQL** (Neon in production; any Postgres locally)
- **Server Actions** for all backend logic
- **recharts** for dashboard charts, **papaparse** for CSV parsing
- Pluggable **provider adapters** for Apollo, Clay, LLM (OpenAI/Anthropic), and Email (Gmail/Smartlead)

---

## Quick start

```bash
npm install
cp .env.example .env      # add a Postgres DATABASE_URL (free Neon works)
npm run setup             # prisma generate + db push + seed
npm run dev               # http://localhost:3000
```

`npm run setup` is a shortcut for:

```bash
npm run db:generate       # prisma generate
npm run db:push           # create the schema in your Postgres DB
npm run db:seed           # seed 5 users, 3 PD profiles, 30 leads, 10 drafts, rules, templates
```

Other useful scripts:

```bash
npm run db:reset          # wipe + re-push + re-seed
npm run build && npm start # production build
```

> The app runs end-to-end **with no API keys** (mock providers generate
> realistic leads, enrichment, and drafts). It does need a Postgres database —
> a free [Neon](https://neon.tech) project takes ~2 minutes.

---

## Accounts, roles & team invites

Real password auth with server-side sessions (scrypt-hashed passwords, opaque
session tokens in the DB, 30-day expiry):

- **Sign up** at `/signup` — creates an **Admin** account. Set `OPEN_SIGNUP=false`
  in `.env` once your team is onboarded to make new accounts invite-only.
- **Invite your team** from **Settings → Team & invites**: enter an email + role,
  copy the one-time `/join/<token>` link (expires in 14 days). The invitee sets
  their name + password and lands in the app. Admins can also change roles and
  remove members there.
- **Demo accounts exist only in local development** (created by `npm run db:seed`,
  password `demo1234`). **Production starts clean** — no sample users, no sample
  leads; the dashboard shows a first-run checklist instead.

| Role | Can do |
| --- | --- |
| **Admin / sourcing lead** | Import, source, configure scoring, approve/send, assign, manage team, full dashboard |
| **PD** | View assigned leads, update status/notes, manage own availability & interests |
| **Reviewer** | Review, approve/reject/edit/regenerate drafts |

Swapping in SSO (NextAuth / Supabase Auth / Clerk) only requires replacing the
sign-in/sign-up actions and keeping `createSession()` in
[`src/lib/auth.ts`](src/lib/auth.ts) — the rest of the app only depends on
`getCurrentUser()`.

---

## Pages

| Route | Page |
| --- | --- |
| `/` | Dashboard — pipeline metrics, charts, top leads |
| `/leads` | Lead Database — filterable table |
| `/leads/[id]` | Lead Detail — full info, score breakdown, drafts, timeline, notes |
| `/import` | Import — CSV upload, column mapping, preview, dedupe results |
| `/source` | Source Leads — sourcing criteria → Apollo/Clay (mock) |
| `/outreach` | Outreach Generator — select leads, generate drafts |
| `/review` | Review Queue — human approval before sending |
| `/tracking` | Sending & Tracking — manual status pipeline |
| `/assignments` | PD Assignments — recommended PD + manual override, PD profiles |
| `/scoring` | Scoring Rules — configurable weights + re-score |
| `/settings` | Settings — org identity, allowed claims, templates, API key status |

---

## Uploading the alumni spreadsheet

1. Go to **Import** → choose **SC Alumni Spreadsheet**.
2. Upload a CSV. Columns are **auto-detected** even when names are messy
   (`First Name`, `Personal Email`, `Current Company`, `Class Year`, `SC Role`, …).
3. Adjust any column mappings, review the preview + validation, then import.
4. Duplicates (email / LinkedIn / name+company) are detected and skipped.

A messy sample ships at [`public/samples/sc_alumni_sample.csv`](public/samples/sc_alumni_sample.csv)
(and a clean generic one at `public/samples/generic_leads_sample.csv`). Alumni
rows are automatically tagged as Stanford/SC alumni + warm connections.

---

## Where to put API keys

All keys live in `.env` (see `.env.example`). **None are required** to run locally.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | DB connection | `file:./dev.db` (SQLite) |
| `LLM_PROVIDER` | `mock` \| `openai` \| `anthropic` | `mock` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | LLM email generation | empty |
| `APOLLO_API_KEY` | People search/enrichment | empty (mock) |
| `CLAY_API_KEY` / `CLAY_WORKFLOW_URL` | Enrichment workflows | empty (mock) |
| `HUNTER_API_KEY` | Email find + verify (enrichment) | empty (pattern guess) |
| `EMAIL_PROVIDER` | `mock` \| `gmail_smtp` \| `smartlead` | `mock` |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Send as your Gmail + read replies (IMAP) | empty |

Keys can also be pasted in the **Settings → API keys & mailbox** panel (stored in
the DB, overriding `.env`), each with a **Save & test** button. The Settings page
shows live status for every provider.

> **Note on the cloud sandbox:** HTTPS APIs (Anthropic, Apollo, Hunter, and all
> the public-source connectors) work anywhere. Gmail SMTP/IMAP and the Playwright
> scrapers need open ports / cert validation, so run those on your own machine.

### Connecting your inbox (Gmail)

1. Turn on 2-Step Verification, then create an **App Password** at
   [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
2. In **Settings → API keys & mailbox**, set `EMAIL_PROVIDER` to Gmail, enter your
   address + the 16-char password, and **Save & test mailbox**.
3. Approve a draft → **Approve & send** (Review Queue) or **Send** (Tracking).
   Emails send *as you*; replies land in your inbox and sync back via **Sync
   replies**. A CAN-SPAM footer (address + opt-out) is appended at send time, and
   "unsubscribe" replies auto-mark a lead Not Interested.

---

## Adding real integrations later

Every external dependency is behind a typed interface with a mock implementation
and clearly marked `TODO`s. To go live, implement the "Real…Provider" class and
flip the factory:

| Integration | File | What to implement |
| --- | --- | --- |
| Apollo | [`src/lib/providers/apollo.ts`](src/lib/providers/apollo.ts) | `searchPeople`, `enrichPerson`, `bulkEnrich` |
| Clay | [`src/lib/providers/clay.ts`](src/lib/providers/clay.ts) | `runWorkflow`, `generateResearchNotes` |
| LLM | [`src/lib/providers/llm.ts`](src/lib/providers/llm.ts) | OpenAI/Anthropic already implemented — just add a key |
| Email | [`src/lib/providers/email.ts`](src/lib/providers/email.ts) | `sendEmail`, `scheduleFollowUp`, `getReplies`, `syncStatus` |

The LLM outreach generator already works with real keys today — set
`LLM_PROVIDER=anthropic` (or `openai`) and provide a key. The strong system
prompt that forbids fabricated facts lives in `OUTREACH_SYSTEM_PROMPT` in
`src/lib/providers/llm.ts`.

---

## Public-source connectors

Beyond Apollo/CSV, the **Source Leads** page can pull leads from public data that
most lead-gen tools ignore. Each connector implements one interface
(`src/lib/sources/types.ts`) and feeds the same dedupe → score → enrich → draft →
review pipeline. Most are free official APIs that run anywhere; two are Playwright
scrapers that run best on your own machine.

| Connector | Source | Type | Gives |
| --- | --- | --- | --- |
| **SEC EDGAR** | 10-K full-text + Form 4 | API | Public companies + named execs |
| **SEC Form D** | Private placement filings | API | Companies that just raised + execs |
| **IRS 990** | ProPublica Nonprofit Explorer | API | Nonprofits + category, revenue, officer |
| **USAspending** | USAspending.gov | API | Federal contract/grant recipients |
| **NPPES Healthcare** | NPI Registry | API | Clinics + licensed practitioners |
| **NIH RePORTER** | NIH-funded research | API | Research orgs + named PIs |
| **openFDA** | FDA device registrations | API | Medical-device manufacturers |
| **HN Who's Hiring** | HN Algolia | API | Companies actively hiring (intent) |
| **Y Combinator** | YC directory | Scraper | Startups + website |
| **Directory / Event** | Any URL you provide | Scraper | Linked orgs on a page |

No public source publishes emails, so connector leads carry
company/title/website/location and are flagged for **enrichment**.

### Enrichment (making leads emailable)

The **Enrich missing emails** button on the Lead Database fills emails for leads
with a name + company domain. With a `HUNTER_API_KEY` it *finds and verifies*
real addresses; without one it generates the common `first.last@domain` pattern,
stored **unverified** with a warning. See `src/lib/services/enrich.ts`.

### Adding a connector

Create `src/lib/sources/myConnector.ts` implementing `SourceConnector`, then add
it to `CONNECTORS` in `src/lib/sources/registry.ts` — it appears on the Source
Leads page automatically. Add a label in the lead source maps
(`src/app/leads/page.tsx`, `src/components/lead-filters.tsx`) if you want it in
filters. Set `needsUrl: true` to get a target-URL input (like the generic
scraper).

---

## Architecture

```
src/
├── app/                      # Next.js App Router pages (one folder per route)
│   ├── layout.tsx            # App shell: sidebar + header + toasts
│   ├── page.tsx              # Dashboard
│   ├── leads/                # Lead database + detail
│   ├── import/ source/ …     # one folder per page
│   └── globals.css
├── components/
│   ├── ui/                   # Button, Card, Badge, Table, Input, Toast, …
│   ├── badges.tsx            # Status / priority / alumni / score badges
│   └── *.tsx                 # Page-level client components (wizards, editors)
├── lib/
│   ├── db.ts                 # Prisma client singleton
│   ├── auth.ts               # Mock auth + permission checks (can())
│   ├── types.ts              # Domain constants & types
│   ├── serialization.ts      # SQLite list/JSON encode-decode helpers
│   ├── providers/            # Apollo, Clay, LLM, Email adapters (+ mocks)
│   ├── sources/              # public-source connectors (SEC, IRS, NPPES, …)
│   ├── credentials.ts        # DB-over-env API key resolution
│   └── services/             # scoring, dedupe, csv, outreach, assignment,
│                             #   enrich, persistLeads, metrics, settings,
│                             #   settings, metrics — pure business logic
├── server/actions/           # "use server" mutations called from the UI
└── prisma/
    ├── schema.prisma         # Data model
    └── seed.ts               # Seed script
```

**Design notes**

- **Business logic is in `src/lib/services`** as pure functions, so it's testable
  and reusable across server actions and the seed script.
- **SQLite quirks** (no enums/arrays/json) are handled by storing list fields as
  comma-strings and JSON blobs as strings, with helpers in `serialization.ts`.
  Core query fields stay as real columns. Migrating to Postgres is documented at
  the top of `prisma/schema.prisma`.
- **Lead scoring** produces a numeric score, a per-rule breakdown (why each point
  was/wasn't awarded), and a priority label (High/Medium/Low). Rules are stored in
  the DB and editable on the Scoring page.
- **Dedupe** runs against existing DB rows *and* within the incoming batch, in
  priority order: exact email → exact LinkedIn → normalized name+company.
- **Assignment recommendation** scores each PD on industry match, functional
  interest match, availability, current load, and existing ownership, then returns
  a human-readable explanation.

---

## Database schema

`User`, `PDProfile`, `Lead`, `Company`, `OutreachDraft`, `Interaction`,
`ImportJob`, `ScoringRule`, `EmailTemplate`, `Setting`. See
[`prisma/schema.prisma`](prisma/schema.prisma) for the full, commented model.

---

## Acceptance checklist

- [x] Upload an alumni CSV
- [x] Map CSV columns and import contacts
- [x] View contacts in a lead database
- [x] Pull mock Apollo/Clay leads from a sourcing form
- [x] Dedupe and score leads
- [x] See score breakdowns
- [x] Generate outreach drafts for selected leads
- [x] Review / edit / approve drafts
- [x] Mark emails as sent / replied / booked
- [x] Assign booked/replied leads to PDs (with explained recommendation)
- [x] Dashboard with metrics
- [x] Configure scoring and templates
- [x] Runs locally without external API keys (mock providers)
- [x] Ready for real API keys later (typed adapters + TODOs)
```
