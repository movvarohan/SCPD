// SC Sourcing Engine — full product tour, login → everything. No slides:
// 100% live-app footage with a broadcast-style lower-third + animated cursor.
// Run: node scripts/demo/record.mjs   (app must be running)
import { Studio } from "./studio.mjs";
import fs from "node:fs";

const state = JSON.parse(fs.readFileSync("/tmp/demo/state.json", "utf8").toString());
const s = new Studio();

const PACE = 1.4;
const cap = async (t, sub, sec = 4.6) => { await s.caption(t, sub); await s.sleep(320); await s.hold(sec * PACE); };
let stepN = 0;
const step = async (t, sub, sec = 4.8) => { stepN += 1; await s.caption(`${stepN}.  ${t}`, sub); await s.sleep(320); await s.hold(sec * PACE); };
const reset = () => { stepN = 0; };
const tryx = async (fn) => { try { return await fn(); } catch (e) { console.warn("step skipped:", e.message); } };

// Navigate by actually clicking the sidebar (continuous, real).
async function nav(label, num, section) {
  const ok = await s.pointAndClickText(label, "a", 1100);
  if (!ok) await s.goto("/" + (label.toLowerCase().includes("dashboard") ? "" : ""));
  await s.injectOverlay();
  await s.setSection(num, section);
}

await s.start();

try {
  // ===================== LOGIN =====================
  await s.clearCookies();
  await s.goto("/login");
  await s.setSection("Stanford Consulting", "");
  await s.page.evaluate(() => window.__demo.eyebrow("Stanford Consulting"));
  await cap("SC Sourcing Engine", "Agent-assisted client sourcing — let's take a full tour, from sign-in to booked calls.", 6.5);
  await cap("Start by signing in", "Pick your profile — we'll continue as an Admin, who can do everything.", 6);
  await tryx(() => s.pointToText("Sasha Lead", "button"));
  await tryx(() => s.pointAndClickText("Sasha Lead", "button", 1600));
  await s.injectOverlay();

  // ===================== 01 DASHBOARD =====================
  await s.setSection("01", "Dashboard");
  await cap("You're in — this is the Dashboard", "Your whole pipeline at a glance, the moment you sign in.", 5.4);
  await cap("Read the funnel left to right", "Total leads → high-priority → drafted → pending review → sent → replies → booked.", 6);
  await cap("Two rates that matter", "Reply rate and booked-call conversion show you what's working.", 5.2);
  await tryx(() => s.scrollTo(400, 750));
  await cap("Charts update live", "Pipeline by status, leads by priority, and where your leads came from.", 5.6);
  await tryx(() => s.scrollTo(0, 500));
  await cap("Navigate from the sidebar", "Everything is one click away on the left. Let's start by importing contacts.", 5.6);

  // ===================== 02 IMPORT =====================
  await nav("Import", "02", "Import contacts");
  reset();
  await cap("Bring in your contacts", "The SC alumni spreadsheet, or any CSV from Apollo, Clay, or LinkedIn.", 5.4);
  await step("Choose the file type", "“SC Alumni Spreadsheet” auto-tags alumni and warm connections.", 5);
  const uploaded = await tryx(async () => {
    const input = await s.page.$('input[type="file"]');
    if (!input) return false;
    await input.uploadFile("public/samples/sc_alumni_sample.csv");
    await s.sleep(1500); await s.injectOverlay();
    return true;
  });
  if (uploaded) {
    await step("Upload the CSV", "Columns are auto-detected — even messy ones like “Current Company”.", 5.6);
    await step("Check the column mapping", "Each column maps to a field; fix anything with the dropdowns.", 5.8);
    await tryx(() => s.scrollTo(520, 750));
    await step("Preview every row", "See exactly what imports, with a validation check on each one.", 5.6);
    await cap("Duplicates are caught for you", "Matched on email, LinkedIn, and name + company — no double entries.", 5.6);
    await tryx(() => s.pointAndClickText("Import", "button"));
    await s.sleep(900); await s.injectOverlay();
    await step("Import & read the summary", "Imported, duplicates skipped, errors flagged — all in one pass.", 6);
  } else {
    await cap("Upload → map → preview → import", "Duplicates caught on email, LinkedIn, and name + company.", 6);
  }

  // ===================== 03 SOURCE =====================
  await nav("Source Leads", "03", "Source new leads");
  reset();
  await step("Describe who you want", "Target industries, titles, seniority, company size, and location.", 6);
  await step("Choose a count & source", "Leads are deduped and scored automatically as they come in.", 5.6);
  await tryx(() => s.scrollTo(580, 750));
  await cap("Or pull from public data", "Twelve connectors most teams never touch.", 5.2);
  await step("Pick a public source", "SEC filings, IRS 990s, NPPES health, NIH, openFDA, USAspending, GLEIF, YC…", 6.5);
  await cap("Real companies & named execs", "The leads nobody else is emailing — higher reply rates.", 5.4);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== 04 LEADS =====================
  await nav("Leads", "04", "Lead Database");
  reset();
  await cap("Every lead in one table", "Name, title, company, email, source, connection, score, status, owner.", 5.8);
  await step("Search to find anyone", "Type a name, company, title, or email — it filters instantly.", 5);
  await tryx(() => s.typeInto('input[placeholder*="Search"]', "fintech"));
  await step("Filter to narrow the list", "Status, source, score, alumni connection, industry, PD, email status.", 6);
  await tryx(() => s.typeInto('input[placeholder*="Search"]', ""));
  await tryx(() => s.pointToText("Research top leads", "button"));
  await step("Use the bulk actions", "Research top leads · Enrich emails · Verify · Export CSV.", 6.2);
  await cap("Open a lead for the full picture", "Let's walk through one in detail.", 4.8);

  // ===================== 05 LEAD DETAIL + RESEARCH =====================
  await s.goto(`/leads/${state.researchedLeadId}`);
  await s.setSection("05", "Lead Detail & Research");
  reset();
  await cap(`${state.researchedName} — ${state.researchedCompany}`, "One lead: person, company, score, research, drafts, and a full timeline.", 6);
  await step("Edit any field", "Click Edit to fix a title, email, or company — the score recalculates instantly.", 5.6);
  await tryx(() => s.scrollTo(680, 760));
  await step("See the score, fully explained", "Every point is justified — alumni, seniority, fit, verified email, signals.", 6.5);
  await tryx(() => s.scrollTo(120, 760));
  await cap("Now the standout — Research", "Click Research to study the lead's public presence.", 5.2);
  await step("Grounded research, never LinkedIn", "It reads the company's own website and public news — not LinkedIn.", 6.2);
  await cap("A real, citable hook", "One specific, true detail — with sources you can click and verify.", 6);
  await step("Find or verify the email", "“Find email” uses Hunter or a smart guess — verify before you send.", 6);

  // ===================== 06 OUTREACH =====================
  await nav("Outreach", "06", "Generate outreach");
  reset();
  await step("Set the sender & style", "Your name and role, then the email type, goal, and tone.", 5.6);
  await tryx(async () => {
    const boxes = await s.page.$$('input[type="checkbox"]');
    for (const b of boxes.slice(0, 3)) {
      const box = await b.boundingBox();
      if (box) await s.moveCursorTo(Math.round(box.x + 8), Math.round(box.y + 8));
      await b.click().catch(() => {});
      await s.injectOverlay(); await s.frame(0.25);
    }
  });
  await step("Select the leads", "Tick who you want to reach — search to narrow them first.", 5.4);
  await step("Generate the drafts", "Claude writes the first email plus two follow-ups, using only real facts.", 6.5);
  await cap("It won't invent anything", "No fake clients or relationships. Short, credible, student-written.", 5.4);
  await tryx(() => s.pointToText("Generate", "button"));
  await cap("Straight to the Review Queue", "Drafts are never sent automatically — every one waits for a person.", 5.4);

  // ===================== 07 REVIEW =====================
  await nav("Review Queue", "07", "Review Queue");
  reset();
  await cap("The human approval gate", "This is what protects Stanford Consulting's name. Nothing skips it.", 5.8);
  await step("Read the context", "Each card shows why the lead was chosen, the personalization, and warnings.", 6);
  await tryx(() => s.scrollTo(240, 700));
  await step("Edit the draft if needed", "Tweak the subject or body right inside the card.", 5);
  await tryx(() => s.pointToText("Approve", "button"));
  await step("Approve, regenerate, or reject", "“Approve & send” delivers it as your own inbox. Or send later from Tracking.", 6.5);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== 08 TRACKING =====================
  await nav("Sending & Tracking", "08", "Sending & Tracking");
  reset();
  await step("Move leads down the funnel", "Update status: ready → sent → replied → booked, or not interested.", 5.6);
  await tryx(() => s.pointToText("Sync replies", "button"));
  await step("Sync replies from your inbox", "Replies match to leads automatically; opt-outs are honored.", 6);
  await cap("Sending stays compliant", "A CAN-SPAM footer — address + opt-out — is added every time you send.", 5.4);

  // ===================== 09 ASSIGNMENTS =====================
  await nav("Assignments", "09", "PD Assignments");
  reset();
  await step("Route a booked call to a PD", "Recommended by sector, function, availability, and current load.", 6);
  await cap("With a clear explanation", "“Recommended because this lead is fintech and the PD lists fintech / GTM.”", 6);
  await step("Override or manage PDs", "Assign manually, and edit each PD's interests and availability below.", 6);

  // ===================== 10 SCORING =====================
  await nav("Scoring Rules", "10", "Scoring Rules");
  reset();
  await step("Tune what 'good' means", "Adjust the weight of each rule — alumni, seniority, fit, signals.", 6);
  await step("Re-score the whole database", "Toggle rules on or off, then click Re-score to apply across every lead.", 6);

  // ===================== 11 SETTINGS =====================
  await nav("Settings", "11", "Settings & Keys");
  reset();
  await step("Set your org & guardrails", "Org name, the claims you allow, the signature, and email templates.", 6);
  await tryx(() => s.scrollTo(740, 760));
  await step("Connect your keys", "Anthropic, Apollo, Hunter, Tavily, SAM.gov — each with “Save & test”.", 6.5);
  await step("Connect Gmail to send for real", "Add a Gmail app password — emails send as you, replies come back to you.", 6.5);
  await tryx(() => s.scrollTo(0, 500));

  // ===================== CLOSE (back to Dashboard) =====================
  await nav("Dashboard", "—", "That's the tour");
  await cap("That's the whole workflow", "Import or source → enrich & research → draft → review → send → track → assign.", 6.5);
  await cap("Source smarter. Stay human.", "The tool does the busywork — you stay in control of every email.", 6.5);

} catch (e) {
  console.error("storyboard error:", e);
} finally {
  const out = "/tmp/demo/sc-sourcing-engine-demo.mp4";
  const r = await s.render(out);
  console.log(`\nRENDERED ${out}\nframes=${r.frames}  duration=${r.total.toFixed(1)}s (${(r.total / 60).toFixed(1)} min)`);
  await s.stop();
}
