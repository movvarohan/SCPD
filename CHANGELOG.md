# Changelog

All notable changes to the SC Sourcing Engine are documented here. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to semantic versioning.

## [Unreleased]

### Added
- Automated unit test suite (Vitest): password hashing, lead scoring, auto-send
  decisions, dedupe, email enrichment, and CSV mapping.
- GitHub Actions CI: typecheck, tests, and production build on every push and PR.
- Repository governance: `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`,
  this changelog, and `public/robots.txt`.
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
