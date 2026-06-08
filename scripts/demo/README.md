# Demo & Onboarding Video

A self-contained pipeline that records a polished, broadcast-style onboarding
demo of the SC Sourcing Engine by **driving the live app** with a headless
browser, overlaying a branded lower-third caption (section eyebrow + title), an
animated cursor, a **cinematic spotlight** (dims the page and rings the element
being explained), and a **chapter progress bar**, then stitching the frames into
an MP4 with ffmpeg. Rendered at 2× and downscaled (supersampled) for crisp text,
with smooth scroll motion and cinematic fade in/out.

Covers every feature in 14 chapters — sign-in, dashboard, import, 12 connectors,
lead detail + grounded research + enrichment, the outreach dry-run preview,
review queue, auto-send rules, the automatic follow-up schedule (and how replies
stop it), tracking, assignments, scoring, and settings/keys.

The video is **100% live-app footage with no slides** — it starts at the
**login screen**, signs in, and tours every page by clicking through the app.

Output: a ~7.5-minute, 1920×1080, H.264 video — `sc-sourcing-engine-demo.mp4`.
The finished video is committed in this folder
([`scripts/demo/sc-sourcing-engine-demo.mp4`](sc-sourcing-engine-demo.mp4)) — a
full, step-by-step onboarding walkthrough so anyone in SC can follow along.

## How to regenerate it

```bash
# 1. Install the recording tools (one-time)
npm install -D puppeteer ffmpeg-static
npx puppeteer browsers install chrome

# 2. Make sure the app is running with seeded data
npm run setup        # if you haven't already
npm run dev          # leave running in another terminal

# 3. Prepare deterministic demo state (researches a lead, checks the queue)
node --env-file=.env --import tsx scripts/demo/prep.ts

# 4. Record + render  →  /tmp/demo/sc-sourcing-engine-demo.mp4
node scripts/demo/record.mjs
```

## Files

| File | Purpose |
| --- | --- |
| `studio.mjs` | The "studio": browser control, branded overlays, frame capture, ffmpeg render, and slide templates. |
| `record.mjs` | The storyboard — the scene-by-scene walkthrough (edit captions/pacing here). |
| `prep.ts` | Seeds good demo state and writes `/tmp/demo/state.json` (e.g. a lead with grounded research). |
| `NARRATION.md` | Optional voiceover script timed to the video. |

## Tuning

- **Pacing:** the `PACE` constant in `record.mjs` (default `1.45`) scales every
  hold. Raise it for a slower video, lower for faster.
- **Length:** add or remove `cap("…", "…", seconds)` beats, or whole sections.
- **Branding:** colors and slide layouts live in `studio.mjs`
  (`CARDINAL`, `SAND`, `titleSlide`, `sectionSlide`).
- **Resolution:** `W`/`H` in `studio.mjs` (1920×1080 by default).

## Notes

- The video is fully **caption-driven**, so it works with the sound off — ideal
  for embedding in onboarding docs or sharing async. Add a voiceover from
  `NARRATION.md` if you want audio.
- The Import section performs a **real upload** of
  `public/samples/sc_alumni_sample.csv`, and the research scene shows a **real,
  grounded** result — nothing is faked.
