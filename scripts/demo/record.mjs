// SC Sourcing Engine — FULL onboarding & demo (in-depth, step-by-step).
// Drives the live app, narrates with on-screen captions + numbered steps,
// captures frames, and renders an MP4. Run: node scripts/demo/record.mjs
import { Studio, titleSlide, sectionSlide } from "./studio.mjs";
import fs from "node:fs";

const state = JSON.parse(fs.readFileSync("/tmp/demo/state.json", "utf8").toString());
const s = new Studio();

// Deliberate, unhurried pacing.
const PACE = 1.4;
const cap = (t, sub, sec = 4.6) => s.caption(t, sub).then(() => s.hold(sec * PACE));
// A numbered step caption — prefixes "Step N · ".
let stepN = 0;
const step = (t, sub, sec = 4.8) => { stepN += 1; return s.caption(`Step ${stepN} · ${t}`, sub).then(() => s.hold(sec * PACE)); };
const resetSteps = () => { stepN = 0; };
const slideD = (html, sec) => s.slide(html, sec * PACE);
const tryx = async (fn) => { try { return await fn(); } catch (e) { console.warn("step skipped:", e.message); } };

await s.start();

try {
  // ===================== INTRO =====================
  await slideD(titleSlide({
    kicker: "Stanford Consulting",
    title: "SC Sourcing Engine",
    subtitle: "The complete guide — find leads, research them, draft outreach, review, send, and book calls. With a human in the loop.",
    footer: "Onboarding & product demo · ~8 minutes",
  }), 6);

  await slideD(sectionSlide({
    num: "—", title: "What you'll learn",
    points: [
      "How to set the tool up and choose your role (Admin, PD, or Reviewer).",
      "How to import contacts, source new leads, and enrich + research them.",
      "How to generate outreach, review it, send it, and assign booked calls.",
      "Follow along — every step is shown on screen and explained.",
    ],
  }), 10);

  await slideD(sectionSlide({
    num: "—", title: "The big idea",
    points: [
      "The hard part of sourcing isn't the call — it's getting the first call.",
      "This automates the pre-call work: find → dedupe → score → enrich → research → draft.",
      "Then a person reviews and approves every email. Nothing sends on its own.",
    ],
  }), 9);

  // ===================== FIRST-TIME SETUP =====================
  await slideD(sectionSlide({
    num: "▶", title: "First-time setup (one time)",
    points: [
      "1.  npm install        — install dependencies",
      "2.  cp .env.example .env   — create your settings file",
      "3.  npm run setup      — create the database + demo data",
      "4.  npm run dev        — then open  http://localhost:3000",
    ],
  }), 11);

  // ===================== 00 ORIENTATION =====================
  await s.goto("/");
  await s.setSection("00", "Getting oriented");
  await cap("This is the home screen", "The left sidebar is how you move around the whole app.", 5);
  await tryx(() => s.pointToText("Leads", "a"));
  await cap("Everything lives in the sidebar", "Dashboard, Leads, Import, Source, Outreach, Review, Tracking, Assignments, Settings.", 6);
  await tryx(() => s.pointTo('header'));
  await cap("Pick your role here (top-right)", "Switch between Admin, PD, and Reviewer to see what each can do.", 6);
  await cap("Three roles", "Admin sources & configures · Reviewer approves emails · PD owns assigned leads.", 6);

  // ===================== 01 DASHBOARD =====================
  await s.setSection("01", "Dashboard");
  await cap("Your pipeline at a glance", "Open the Dashboard any time to see where things stand.", 4.8);
  await cap("Read the funnel left to right", "Total leads → high-priority → drafted → pending review → sent → replies → booked.", 6);
  await cap("Two rates to watch", "Reply rate and booked-call conversion tell you what's working.", 5.2);
  await tryx(() => s.scrollTo(400, 700));
  await cap("Charts update live", "Pipeline by status, leads by priority, and where your leads came from.", 5.6);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== 02 IMPORT =====================
  await s.goto("/import");
  await s.setSection("02", "Import contacts");
  resetSteps();
  await cap("Bring in your contacts", "Use the SC alumni spreadsheet, or any CSV exported from Apollo, Clay, or LinkedIn.", 5.4);
  await step("Choose the file type", "Pick “SC Alumni Spreadsheet” to auto-tag alumni and warm connections.", 5);
  const uploaded = await tryx(async () => {
    const input = await s.page.$('input[type="file"]');
    if (!input) return false;
    await input.uploadFile("public/samples/sc_alumni_sample.csv");
    await s.sleep(1500);
    await s.injectOverlay();
    return true;
  });
  if (uploaded) {
    await step("Upload the CSV", "Columns are auto-detected — even messy ones like “Current Company” or “Class Year”.", 5.6);
    await step("Check the column mapping", "Each CSV column maps to a field. Fix any that look wrong with the dropdowns.", 6);
    await tryx(() => s.scrollTo(520, 700));
    await step("Preview the rows", "See exactly what will import, with a validation check on each row.", 5.6);
    await cap("Duplicates are caught for you", "Matched on email, LinkedIn, and name + company — no double entries.", 5.6);
    await tryx(() => s.pointAndClickText("Import", "button"));
    await s.sleep(900); await s.injectOverlay();
    await step("Import & review the summary", "Imported, duplicates skipped, and errors flagged — all in one pass.", 6);
  } else {
    await cap("Upload → map → preview → import", "Duplicates caught on email, LinkedIn, and name + company.", 6);
  }

  // ===================== 03 SOURCE / CONNECTORS =====================
  await s.goto("/source");
  await s.setSection("03", "Source new leads");
  resetSteps();
  await step("Describe who you want", "Set target industries, titles, seniority, company size, and location.", 6);
  await step("Choose how many & submit", "Pick a count and click Source — leads are deduped and scored automatically.", 5.6);
  await tryx(() => s.scrollTo(580, 700));
  await cap("Or pull from public data", "Twelve connectors — most teams never touch these.", 5.4);
  await step("Pick a public source", "SEC filings, IRS 990s, NPPES health, NIH, openFDA, USAspending, GLEIF, YC, and more.", 6.5);
  await cap("Real companies & named execs", "The leads nobody else is emailing — high reply rates.", 5.4);
  await cap("No emails yet — that's expected", "Public sources don't publish emails. We'll enrich them in a moment.", 5.4);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== 04 LEAD DATABASE =====================
  await s.goto("/leads");
  await s.setSection("04", "Lead Database");
  resetSteps();
  await cap("Every lead in one table", "Name, title, company, email, source, connection, score, status, and owner.", 5.6);
  await step("Search to find anyone", "Type a name, company, title, or email — results filter instantly.", 5);
  await tryx(() => s.typeInto('input[placeholder*="Search"]', "fintech"));
  await step("Filter to narrow the list", "By status, source, score, alumni connection, industry, PD, and email status.", 6);
  await tryx(() => s.typeInto('input[placeholder*="Search"]', ""));
  await tryx(() => s.pointToText("Research top leads", "button"));
  await step("Use the bulk actions", "Research top leads · Enrich missing emails · Verify emails · Export CSV.", 6.5);
  await cap("Click any row to open it", "Let's open a lead and walk through the detail page.", 5);

  // ===================== 05 LEAD DETAIL + RESEARCH =====================
  await s.goto(`/leads/${state.researchedLeadId}`);
  await s.setSection("05", "Lead Detail");
  resetSteps();
  await cap(`${state.researchedName} — ${state.researchedCompany}`, "Everything about one lead: person, company, score, research, drafts, and timeline.", 6);
  await step("Edit any field", "Click Edit to fix a title, email, or company — the score recalculates automatically.", 5.6);
  await tryx(() => s.scrollTo(660, 750));
  await step("See the score, fully explained", "Every point is justified — alumni, seniority, industry fit, verified email, signals.", 6.5);
  await tryx(() => s.scrollTo(120, 750));
  await cap("Now the best part — Research", "Click Research to study the lead's public presence.", 5.4);
  await step("Grounded research, never LinkedIn", "It reads the company's own website and public news — not LinkedIn.", 6);
  await cap("A real, citable hook", "One specific, true detail — with sources you can click and verify.", 6);
  await step("Find or verify the email", "“Find email” uses Hunter (or a smart guess); verify before you send.", 6);

  // ===================== 06 OUTREACH =====================
  await s.goto("/outreach");
  await s.setSection("06", "Generate outreach");
  resetSteps();
  await step("Set the sender & style", "Your name and role, then the email type, goal, and tone.", 5.6);
  await tryx(async () => {
    const boxes = await s.page.$$('input[type="checkbox"]');
    for (const b of boxes.slice(0, 3)) {
      const box = await b.boundingBox();
      if (box) await s.moveCursorTo(Math.round(box.x + 8), Math.round(box.y + 8));
      await b.click().catch(() => {});
      await s.injectOverlay();
      await s.frame(0.25);
    }
  });
  await step("Select the leads", "Tick the leads you want to reach — search to narrow them down first.", 5.4);
  await step("Generate the drafts", "Claude writes the first email plus two follow-ups — using only real, stored facts.", 6.5);
  await cap("It won't invent anything", "No fake clients or relationships. Short, credible, student-written.", 5.4);
  await tryx(() => s.pointToText("Generate", "button"));
  await cap("Off to the Review Queue", "Drafts are never sent automatically — every one waits for a person.", 5.4);

  // ===================== 07 REVIEW QUEUE =====================
  await s.goto("/review");
  await s.setSection("07", "Review Queue");
  resetSteps();
  await cap("The human approval gate", "This is what protects Stanford Consulting's name. Nothing skips it.", 5.6);
  await step("Read the context", "Each card shows why the lead was chosen, the personalization, and any warnings.", 6);
  await tryx(() => s.scrollTo(240, 700));
  await step("Edit the draft if needed", "Tweak the subject or body right in the card.", 5);
  await tryx(() => s.pointToText("Approve", "button"));
  await step("Approve, regenerate, or reject", "“Approve & send” delivers it as your own inbox. Or send later from Tracking.", 6.5);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== 08 TRACKING =====================
  await s.goto("/tracking");
  await s.setSection("08", "Sending & Tracking");
  resetSteps();
  await step("Move leads down the funnel", "Update status: ready → sent → replied → booked, or not interested.", 5.6);
  await tryx(() => s.pointToText("Sync replies", "button"));
  await step("Sync replies from your inbox", "Replies are matched to leads; opt-outs are honored automatically.", 6);
  await cap("Sending stays compliant", "A CAN-SPAM footer (address + opt-out) is added every time you send.", 5.4);

  // ===================== 09 ASSIGNMENTS =====================
  await s.goto("/assignments");
  await s.setSection("09", "PD Assignments");
  resetSteps();
  await step("Route a booked call to a PD", "Recommended by sector, function, availability, and current load.", 6);
  await cap("With a clear explanation", "“Recommended because this lead is fintech and the PD lists fintech / GTM.”", 6);
  await step("Override or manage PDs", "Assign manually, and edit each PD's interests and availability below.", 6);

  // ===================== 10 SCORING RULES =====================
  await s.goto("/scoring");
  await s.setSection("10", "Scoring Rules");
  resetSteps();
  await step("Tune what 'good' means", "Adjust the weight of each rule — alumni, seniority, industry fit, signals.", 6);
  await step("Re-score the whole database", "Toggle rules on or off, then click Re-score to apply across every lead.", 6);

  // ===================== 11 SETTINGS & KEYS =====================
  await s.goto("/settings");
  await s.setSection("11", "Settings & Keys");
  resetSteps();
  await step("Set your org & guardrails", "Org name, the claims you allow, the signature, and email templates.", 6);
  await tryx(() => s.scrollTo(720, 750));
  await step("Connect your keys", "Anthropic, Apollo, Hunter, Tavily, SAM.gov — each with a “Save & test” button.", 6.5);
  await step("Connect Gmail to send for real", "Add a Gmail app password — emails send as you, replies come back to you.", 6.5);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== RECAP =====================
  await slideD(sectionSlide({
    num: "✓", title: "Your day-to-day workflow",
    points: [
      "1.  Import or source leads  →  2.  Enrich + research them",
      "3.  Generate outreach  →  4.  Review & approve in the queue",
      "5.  Send from your inbox  →  6.  Sync replies, assign booked calls",
      "Repeat. The tool does the busywork; you stay in control of every email.",
    ],
  }), 12);

  // ===================== SETUP / RUN =====================
  await slideD(sectionSlide({
    num: "▶", title: "Run it yourself",
    points: [
      "npm install   ·   cp .env.example .env   ·   npm run setup   ·   npm run dev",
      "Open http://localhost:3000 — it works offline with demo data out of the box.",
      "Add your keys in Settings whenever you're ready to go live.",
      "Use the top-right switcher to try the Admin, PD, and Reviewer roles.",
    ],
  }), 12);

  // ===================== OUTRO =====================
  await slideD(titleSlide({
    kicker: "You're ready",
    title: "Source smarter. Stay human.",
    subtitle: "Agent-assisted sourcing with human approval — built for Stanford Consulting PDs.",
    footer: "SC Sourcing Engine",
  }), 7.5);

} catch (e) {
  console.error("storyboard error:", e);
} finally {
  const out = "/tmp/demo/sc-sourcing-engine-demo.mp4";
  const r = await s.render(out);
  console.log(`\nRENDERED ${out}\nframes=${r.frames}  duration=${r.total.toFixed(1)}s (${(r.total / 60).toFixed(1)} min)`);
  await s.stop();
}
