# Security Policy

SC Sourcing Engine handles contact data and connects to email and enrichment
providers, so we take security seriously.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems. Instead,
email the project maintainer (the Director of PD Operations) directly with:

- a description of the issue and its impact,
- steps to reproduce, and
- any relevant logs (with secrets redacted).

You can expect an acknowledgement within 3 business days.

## Handling secrets

- All credentials (Anthropic, Apollo, Hunter, Gmail app password, `CRON_SECRET`,
  database URLs) live in environment variables — **never** commit them.
- `.env*` files are git-ignored. The committed `.env.example` lists variable
  names only, never values.
- Rotate any key that is pasted into a chat, screenshot, or shared document.

## Built-in protections

- Passwords are hashed with `scrypt` and a per-user random salt (`src/lib/password.ts`).
- Sessions are opaque, server-validated tokens stored in an httpOnly, `secure`
  (in production), `sameSite` cookie.
- Brute-force protection locks an account after repeated failed logins.
- Admin actions, sign-ins, sends, and data changes are written to an audit log.
- Cron endpoints require a `CRON_SECRET` bearer token.
- Security headers (`nosniff`, frame `DENY`, referrer + permissions policy) are
  set in `next.config.mjs`.

## Supported versions

The latest release on the default branch is the only supported version.
