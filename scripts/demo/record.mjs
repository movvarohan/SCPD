// SC Sourcing Engine — full onboarding & demo recording.
// Drives the live app, narrates with on-screen captions, captures frames,
// and renders an MP4. Run: node scripts/demo/record.mjs  (app must be running)
import { Studio, titleSlide, sectionSlide } from "./studio.mjs";
import fs from "node:fs";

const state = JSON.parse(fs.readFileSync("/tmp/demo/state.json", "utf8").toString());
const s = new Studio();

// Deliberate pacing — the user asked for "not too fast".
const PACE = 1.45;
// small helpers
const cap = (t, sub, sec = 4.5) => s.caption(t, sub).then(() => s.hold(sec * PACE));
const slideD = (html, sec) => s.slide(html, sec * PACE);
const tryx = async (fn) => { try { return await fn(); } catch (e) { console.warn("scene step skipped:", e.message); } };

await s.start();

try {
  // ===================== INTRO =====================
  await slideD(titleSlide({
    kicker: "Stanford Consulting",
    title: "SC Sourcing Engine",
    subtitle: "Agent-assisted client sourcing — find leads, research them, draft outreach, review, and book calls. With a human in the loop.",
    footer: "Onboarding & product demo",
  }), 5.5);

  await slideD(sectionSlide({
    num: "—", title: "What this tool does",
    points: [
      "The hard part of sourcing isn't the call — it's getting the first call.",
      "This automates the annoying pre-call work: finding, enriching, scoring, researching, and drafting.",
      "Every email is reviewed by a person before anything is ever sent.",
    ],
  }), 9);

  await slideD(sectionSlide({
    num: "—", title: "The pipeline, end to end",
    points: [
      "Source  →  Dedupe  →  Score  →  Enrich email  →  Research  →  Draft",
      "Human review  →  Send (as your inbox)  →  Track replies  →  Assign to a PD",
      "12 public-data sources feed it — plus your alumni spreadsheet and Apollo.",
    ],
  }), 9);

  // ===================== 01 DASHBOARD =====================
  await s.goto("/");
  await s.setSection("01", "Dashboard");
  await cap("Start on the Dashboard", "Your whole pipeline at a glance.", 4.5);
  await cap("Live metrics across the funnel", "Total leads, high-priority, drafted, pending review, sent, replies, booked.", 5.5);
  await tryx(() => s.scrollTo(380, 700));
  await cap("Charts update in real time", "Pipeline by status, leads by priority, and where leads came from.", 5.5);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== 02 IMPORT =====================
  await s.goto("/import");
  await s.setSection("02", "Import");
  await cap("Import your alumni spreadsheet", "Or any lead CSV — Apollo, Clay, a conference list.", 4.5);
  await cap("Columns are auto-detected", "Even messy headers like “Current Company” or “Class Year”.", 5);
  // Real upload of the bundled sample CSV.
  const uploaded = await tryx(async () => {
    const input = await s.page.$('input[type="file"]');
    if (!input) return false;
    await input.uploadFile("public/samples/sc_alumni_sample.csv");
    await s.sleep(1400);
    await s.injectOverlay();
    return true;
  });
  if (uploaded) {
    await cap("Mapping & preview", "Confirm each column, see validation, then import.", 5.5);
    await tryx(() => s.scrollTo(500, 700));
    await cap("Duplicates are caught automatically", "Matched on email, LinkedIn, and name + company.", 5);
    await tryx(() => s.pointAndClickText("Import", "button"));
    await s.sleep(800); await s.injectOverlay();
    await cap("Import complete", "Imported, duplicates skipped, errors flagged — all in one pass.", 5.5);
  } else {
    await cap("Upload → map → preview → import", "Duplicates caught on email, LinkedIn, and name + company.", 6);
  }

  // ===================== 03 SOURCE / CONNECTORS =====================
  await s.goto("/source");
  await s.setSection("03", "Source Leads");
  await cap("Pull fresh leads on demand", "Define your ideal customer profile — industries, titles, seniority, size.", 5.5);
  await tryx(() => s.scrollTo(560, 700));
  await cap("12 public-data connectors", "SEC filings, IRS 990s, NPPES health, NIH, openFDA, USAspending, GLEIF, YC…", 6);
  await cap("Sources most teams never touch", "Real companies and named executives — the leads nobody else is emailing.", 5.5);
  await cap("No source publishes emails — that's fine", "Leads are flagged for enrichment, which we'll do next.", 5);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== 04 LEAD DATABASE =====================
  await s.goto("/leads");
  await s.setSection("04", "Lead Database");
  await cap("Every lead in one place", "Sort, filter, and search across the whole database.", 4.5);
  await tryx(() => s.typeInto('input[placeholder*="Search"]', "fintech"));
  await cap("Filter instantly", "By status, source, score, alumni connection, industry, PD, and more.", 5.5);
  await tryx(() => s.typeInto('input[placeholder*="Search"]', ""));
  await tryx(() => s.pointToText("Research top leads", "button"));
  await cap("One-click bulk actions", "Research top leads, enrich missing emails, verify, and export to CSV.", 6);

  // ===================== 05 LEAD DETAIL + RESEARCH =====================
  if (state.researchedLeadId) {
    await s.goto(`/leads/${state.researchedLeadId}`);
    await s.setSection("05", "Lead Detail & Research");
    await cap("Open any lead for the full picture", `${state.researchedCompany || "The company"} — person, company, history, status.`, 5);
    await tryx(() => s.scrollTo(640, 700));
    await cap("Transparent lead score", "Every point is explained — alumni, seniority, fit, signals.", 5.5);
    await tryx(() => s.scrollTo(120, 700));
    await cap("Grounded public research", "It reads the company's own website (and news) — never LinkedIn.", 5.5);
    await cap("A real, citable hook", "One specific, true detail the email can reference — with sources you can check.", 6);
  }

  // ===================== 06 OUTREACH =====================
  await s.goto("/outreach");
  await s.setSection("06", "Outreach Generator");
  await cap("Generate personalized outreach", "Pick leads, choose the email type, goal, and tone.", 5);
  await tryx(async () => {
    // Tick the first few leads, capturing the motion.
    const boxes = await s.page.$$('input[type="checkbox"]');
    for (const b of boxes.slice(0, 3)) {
      const box = await b.boundingBox();
      if (box) await s.moveCursorTo(Math.round(box.x + 8), Math.round(box.y + 8));
      await b.click().catch(() => {});
      await s.injectOverlay();
      await s.frame(0.25);
    }
  });
  await cap("Claude writes the drafts", "First email plus two follow-ups — using only real, stored facts.", 6);
  await cap("Never invents relationships or clients", "Credible, student-written, and short. Missing-data warnings included.", 5.5);
  await tryx(() => s.pointToText("Generate", "button"));
  await cap("Drafts go to the Review Queue", "Nothing is sent automatically — ever.", 5);

  // ===================== 07 REVIEW QUEUE =====================
  await s.goto("/review");
  await s.setSection("07", "Review Queue");
  await cap("Human approval before anything sends", "This is the safety gate that protects SC's brand.", 5.5);
  await cap("Each card shows the why", "Lead context, personalization source, confidence, and warnings.", 5.5);
  await tryx(() => s.scrollTo(260, 700));
  await tryx(() => s.pointToText("Approve", "button"));
  await cap("Edit, approve, regenerate, or reject", "“Approve & send” delivers it as your own inbox.", 6);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== 08 TRACKING =====================
  await s.goto("/tracking");
  await s.setSection("08", "Sending & Tracking");
  await cap("Track every outbound", "Ready → sent → replied → booked, all in one view.", 5);
  await tryx(() => s.pointToText("Sync replies", "button"));
  await cap("Replies sync from your inbox", "Opt-outs are auto-honored; a CAN-SPAM footer is added on send.", 6);

  // ===================== 09 ASSIGNMENTS =====================
  await s.goto("/assignments");
  await s.setSection("09", "PD Assignments");
  await cap("Route booked calls to the right PD", "Matched on sector, function, availability, and current load.", 5.5);
  await cap("With a plain-English explanation", "“Recommended because this lead is fintech and the PD lists fintech/GTM.”", 6);

  // ===================== 10 SETTINGS =====================
  await s.goto("/settings");
  await s.setSection("10", "Settings & Keys");
  await cap("Configure everything here", "Org identity, allowed claims, scoring weights, and email templates.", 5);
  await tryx(() => s.scrollTo(700, 700));
  await cap("Connect your keys & inbox", "Anthropic, Apollo, Hunter, Tavily, SAM.gov — each with “Save & test”.", 6);
  await cap("Connect Gmail to send for real", "An app password sends as you; replies land in your inbox.", 5.5);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== RECAP =====================
  await slideD(sectionSlide({
    num: "✓", title: "What you just saw",
    points: [
      "Import & source leads from 12 public datasets — plus CSV and Apollo.",
      "Auto dedupe, score, enrich emails, and research each lead's public presence.",
      "Claude drafts grounded, personalized outreach — you review every one.",
      "Send as your own inbox, track replies, and assign booked calls to PDs.",
    ],
  }), 11);

  // ===================== SETUP / DEPLOY =====================
  await slideD(sectionSlide({
    num: "▶", title: "Run it yourself",
    points: [
      "1.  npm install      2.  cp .env.example .env      3.  npm run setup",
      "4.  npm run dev   →   open http://localhost:3000",
      "Runs fully offline with mock data — add keys in Settings when you're ready.",
      "Use the top-right switcher to try the Admin, PD, and Reviewer roles.",
    ],
  }), 12);

  // ===================== OUTRO =====================
  await slideD(titleSlide({
    kicker: "You're ready",
    title: "Source smarter. Stay human.",
    subtitle: "Agent-assisted sourcing with human approval — built for Stanford Consulting PDs.",
    footer: "SC Sourcing Engine",
  }), 7);

} catch (e) {
  console.error("storyboard error:", e);
} finally {
  const out = "/tmp/demo/sc-sourcing-engine-demo.mp4";
  const r = await s.render(out);
  console.log(`\nRENDERED ${out}\nframes=${r.frames}  duration=${r.total.toFixed(1)}s (${(r.total / 60).toFixed(1)} min)`);
  await s.stop();
}
