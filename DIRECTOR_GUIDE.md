# SC Sourcing Engine — Guide for the Director of PD Operations

Welcome! This is your team's tool for client sourcing: it finds leads, researches
them, drafts personalized outreach with AI, and tracks everything through to a
booked call — while keeping a person in control of every email.

**The app:** https://sc-sourcing-engine.vercel.app

> ### 💬 Questions? Ask the built-in assistant first
> **https://sc-sourcing-engine.vercel.app/help**
>
> Once you're signed in, the **Help & Assistant** page (bottom of the sidebar)
> answers anything — getting started, inviting people, connecting Gmail or API
> keys, why something isn't sending, how auto-send and follow-ups behave, and
> general troubleshooting. It knows this app inside out. Please try it before
> escalating to a human — it resolves almost everything.

There's also a **10-minute video walkthrough** of every feature (including
creating an account and inviting the team) in the repository at
`scripts/demo/sc-sourcing-engine-demo.mp4` — worth watching once.

---

## 1 · First 10 minutes

1. **Create your account** — go to
   [sc-sourcing-engine.vercel.app/signup](https://sc-sourcing-engine.vercel.app/signup),
   enter your name, email, and a password. You'll be an **Admin** (full access).
2. **Look around** — the app is pre-loaded with sample leads and drafts so every
   screen has something on it. Nothing is "real" yet; you can delete samples any
   time (each lead has a Delete button; sample team accounts can be removed in
   Settings → Team & invites).
3. **Invite your team** — Settings → **Team & invites** → enter their email,
   pick a role, click **Invite**, and send them the link it generates.
   - **Admin** — everything (use sparingly)
   - **Reviewer** — reviews and approves outreach drafts
   - **PD** — sees their assigned leads, updates statuses, sets their interests
4. *(Optional)* Sign in to the demo accounts to see other roles:
   `reviewer@stanfordconsulting.org` or `maya@stanfordconsulting.org`, password
   `demo1234` for all of them.

## 2 · Going fully live (15 minutes, one time)

The app works out of the box, but two connections make it *real*. Both live in
**Settings → API keys & mailbox**, each with a **Save & test** button:

| Connect | Why | How |
| --- | --- | --- |
| **Gmail** | Until connected, "sending" is simulated (statuses move, no email is delivered — a safe practice mode). | On the Gmail account you'll send from: turn on 2-Step Verification, create an **App Password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), then enter the address + 16-character password and **Save & test mailbox**. Emails send *as you*; replies land in your inbox and sync back. |
| **Hunter** (optional) | Finds + verifies real email addresses during enrichment instead of educated guesses. | Free key at [hunter.io](https://hunter.io). |

Already connected for you: **Claude (Anthropic)** writes the drafts and powers
research and the Help assistant. An **Apollo** key is installed too — note it's
a free-tier key, so Apollo sourcing returns realistic sample leads until the
plan is upgraded (the app tells you this when it happens). The **12 public-data
connectors** (SEC, IRS, NIH, FDA, federal spending, etc.) need no keys at all.

## 3 · The daily workflow

1. **Get leads** — *Import* (upload the alumni spreadsheet or any CSV — columns
   auto-map, duplicates are skipped) or *Source Leads* (pull from Apollo or the
   public-data connectors).
2. **Prepare them** — on *Leads*, click **Research top leads** (reads each
   company's own website and extracts a true, citable hook — never LinkedIn,
   never made up) and **Enrich missing emails**.
3. **Draft** — on *Outreach*, select leads, pick the email type/goal/tone, and
   Generate. Claude writes a first email + two follow-ups from real facts only.
4. **Review & send** — the *Review Queue* shows every draft with full context.
   Edit, **Approve & send**, regenerate, or reject. Nothing sends without
   approval (unless you later enable auto-send — see below).
5. **Track** — *Sending & Tracking*: statuses, **Sync replies from inbox**
   (opt-outs are honored automatically), and follow-ups on a day-3 / day-7
   schedule that **stops the moment someone replies**. A scheduled job also runs
   follow-ups automatically once a day.
6. **Assign** — when a lead replies or books, *Assignments* recommends the right
   PD (with the reason) — assign in one click.

## 4 · Power features (when you're ready)

- **Auto-send** (Settings → Auto-send rules, off by default): drafts matching
  your rule (industry, company size, role, minimum score) send automatically and
  skip review — guarded by a verified-email requirement, a warnings check, and a
  daily cap. The dashboard shows a live counter and a one-click **Pause**.
- **Scoring** (Scoring Rules): tune what makes a lead "High priority", then
  **Re-score all leads**.
- **Guardrails** (Settings): the "Allowed claims" box controls what the AI may
  say about Stanford Consulting — it can never exceed it. The CAN-SPAM mailing
  address + opt-out footer is appended to every send automatically.
- **Export** — Leads → Export CSV any time. Your data is never locked in.

## 5 · FAQ

**Emails aren't arriving.** Gmail isn't connected yet — see section 2. Until
then, sends are simulated on purpose.

**A lead has no email address.** Public data sources never include emails.
Use **Enrich missing emails** or the **Find email** button on the lead.

**Research found nothing.** The lead has no company website on file (or the
site blocked us). Add the website to the lead and hit Re-research.

**An invite link stopped working.** Links are one-time and expire in 14 days —
just create a new invite.

**Can people outside SC sign up?** Currently yes (open sign-up made your own
onboarding possible). Once your team is in, ask the repo owner to set
`OPEN_SIGNUP=false` — then new accounts require an invite.

**Where does my data live?** A managed Postgres database (Neon) behind a Vercel
deployment. The Y Combinator / custom-URL scrapers are the only features that
need a local copy of the app; everything else runs hosted.

**Something else?** → **https://sc-sourcing-engine.vercel.app/help** — that's
exactly what it's for. If the assistant says the issue needs an engineer
(code/deployment/database), contact the repo owner with what the assistant told
you.

---

*Source code, full technical README, and the demo video live in the GitHub
repository (`movvarohan/SCPD`). Built for Stanford Consulting.*
