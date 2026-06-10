# Changelog

All notable changes to the SC Sourcing Engine are documented here. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to semantic versioning.

## [Unreleased]

### Added
- **Do-not-contact registry**: a permanent, lead-independent suppression list.
  Opt-out replies land on it automatically; every send path (manual, auto-send,
  Autopilot, follow-ups) checks it as a final gate, so a suppressed address is
  never emailed again — even if re-imported as a new lead. Managed in
  Settings → Do-not-contact (adds by anyone, removals admin-only, all audited).
- **Deliverability linting** on every draft: unresolved template tokens and
  empty subject/body are hard blockers that force human review; spam-trigger
  phrases, ALL-CAPS subjects, link overload, and very short bodies surface as
  warnings that feed the "skip drafts with warnings" guardrail.
- **Business-hours send window**: Autopilot and scheduled follow-ups only send
  between configurable hours in a configurable timezone (default 8:00–18:00
  America/Los_Angeles, weekdays only). Manual sends are never blocked.
- **Analytics page**: 8-week send/reply trend, pipeline funnel with
  stage-to-stage conversion, leads by source and industry, reply/booked rates,
  average score, and suppression count.
- Automated unit test suite (Vitest): password hashing, lead scoring, auto-send
  decisions, dedupe, email enrichment, and CSV mapping.
- GitHub Actions CI: typecheck, tests, and production build on every push and PR.
- Repository governance: `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`,
  this changelog, and `public/robots.txt`.
- Resend email adapter so Autopilot can send over HTTPS without a personal inbox.
- In-memory rate limiting on the help-chat and command-palette search APIs.
- Booked-call webhook: posts to a Slack/Discord/generic incoming webhook when a
  lead's call is marked booked.
- `test`, `test:watch`, and `typecheck` npm scripts.

## [1.0.0]

### Added
- Production authentication: scrypt password hashing, server-side sessions,
  brute-force lockout, admin-issued password resets, and team invites.
- Full outreach automation: auto-send rules, Autopilot (research → draft → send),
  an automated follow-up scheduler, and reply-stops-follow-up sync.
- Twelve public-data lead connectors with dedupe and email enrichment.
- Grounded per-lead and bulk research that never scrapes LinkedIn.
- Audit log, command palette (⌘K), help assistant, health endpoint, security
  headers, and a first-run setup checklist.
- Vercel + Neon Postgres deployment with secured cron jobs.

### Changed
- Migrated the database from SQLite to PostgreSQL.
- Made outreach automation the default (no per-email approval required).
- Removed all sample/fictional data from production; demo data is local-dev only.
