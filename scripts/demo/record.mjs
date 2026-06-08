// SC Sourcing Engine — definitive in-depth product tour (login → everything).
// 100% live app, no slides. Broadcast lower-third + animated cursor + a
// cinematic spotlight that dims the screen and rings the element being
// explained, plus a chapter progress bar. Run: node scripts/demo/record.mjs
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

// Spotlight an element (by CSS selector or text) + caption + hold + release.
const spot = async (sel, t, sub, sec = 5) => {
  const ok = await tryx(() => s.highlight(sel));
  await s.caption(t, sub); await s.sleep(300); await s.hold(sec * PACE);
  if (ok) await tryx(() => s.unhighlight());
};
const spotText = async (text, tag, t, sub, sec = 5) => {
  const ok = await tryx(() => s.highlightText(text, tag));
  await s.caption(t, sub); await s.sleep(300); await s.hold(sec * PACE);
  if (ok) await tryx(() => s.unhighlight());
};

async function nav(label) {
  await s.pointAndClickText(label, "a", 1100);
  await s.injectOverlay();
}
async function chapter(num, label, pct) {
  await s.setSection(num, label);
  await s.progress(pct);
}

await s.start();

try {
  // ===================== 01 · SIGN IN =====================
  await s.clearCookies();
  await s.goto("/login");
  await s.progress(4);
  await s.page.evaluate(() => window.__demo.eyebrow("Stanford Consulting"));
  await cap("SC Sourcing Engine", "Agent-assisted client sourcing — a full, in-depth tour from sign-in to booked calls.", 6.5);
  await cap("Built for Stanford Consulting PDs", "Find leads, research them, draft outreach, review, send, and assign — with a human in the loop.", 6);
  await spotText("Sasha Lead", "button", "Sign in with your profile", "Three roles: Admin runs everything, Reviewer approves, PD owns their leads. We'll go in as Admin.", 6);
  await tryx(() => s.pointAndClickText("Sasha Lead", "button", 1200));
  // Wait for the app shell so dashboard captions don't play over the login page.
  await tryx(() => s.page.waitForSelector("aside", { timeout: 15000 }));
  await s.sleep(900);
  await s.injectOverlay();

  // ===================== 02 · DASHBOARD =====================
  await chapter("02", "Dashboard", 11);
  await cap("You're in — the Dashboard", "Your entire pipeline, the moment you sign in.", 5);
  await cap("The funnel, left to right", "Total leads → high-priority → drafted → pending review → sent → replies → booked.", 6);
  await spotText("Reply Rate", "div", "Two rates tell you what's working", "Reply rate and booked-call conversion, updated live.", 5.6);
  await spotText("Pause auto-send", "button", "A global kill-switch", "Auto-send is on for this tour — pause it here any time. We'll configure it later.", 6);
  await tryx(() => s.scrollMotion(420));
  await cap("Live charts", "Pipeline by status, leads by priority, and where every lead came from.", 5.4);
  await tryx(() => s.scrollMotion(0));

  // ===================== 03 · IMPORT =====================
  await nav("Import"); await chapter("03", "Import contacts", 18); reset();
  await cap("Start by importing contacts", "The SC alumni spreadsheet, or any CSV from Apollo, Clay, or LinkedIn.", 5.4);
  await step("Pick the file type", "“SC Alumni Spreadsheet” auto-tags alumni and warm connections.", 5);
  const uploaded = await tryx(async () => {
    const input = await s.page.$('input[type="file"]');
    if (!input) return false;
    await input.uploadFile("public/samples/sc_alumni_sample.csv");
    await s.sleep(1500); await s.injectOverlay(); return true;
  });
  if (uploaded) {
    await step("Upload — columns auto-detect", "Even messy headers like “Current Company” or “Class Year” map themselves.", 5.8);
    await tryx(() => s.scrollMotion(520));
    await step("Preview & validate every row", "See exactly what imports, with a check on each row.", 5.6);
    await cap("Duplicates are caught for you", "Matched on email, LinkedIn, and name + company — no double entries.", 5.6);
    await tryx(() => s.pointAndClickText("Import", "button"));
    await s.sleep(900); await s.injectOverlay();
    await step("Import & read the summary", "Imported, duplicates skipped, errors flagged — one pass.", 5.6);
  } else {
    await cap("Upload → map → preview → import", "Duplicates caught on email, LinkedIn, and name + company.", 6);
  }

  // ===================== 04 · SOURCE =====================
  await nav("Source Leads"); await chapter("04", "Source new leads", 25); reset();
  await step("Describe who you want", "Target industries, titles, seniority, company size, and location.", 6);
  await tryx(() => s.scrollMotion(560));
  await cap("Then pull from public data", "Twelve connectors most teams never touch.", 5);
  await spotText("SEC EDGAR", "button", "Sources nobody else mines", "SEC filings & recent raises, IRS 990s, NPPES health, NIH, openFDA, USAspending, GLEIF, SAM.gov, YC, Hacker News.", 6.5);
  await cap("Real companies & named execs", "No source publishes emails — so every lead is flagged for enrichment next.", 5.6);
  await tryx(() => s.scrollMotion(0));

  // ===================== 05 · LEAD DATABASE =====================
  await nav("Leads"); await chapter("05", "Lead Database", 32); reset();
  await cap("Every lead in one table", "Name, title, company, email, source, connection, score, status, owner.", 5.8);
  await step("Search & filter instantly", "By status, source, score, alumni connection, industry, PD, and email.", 5.6);
  await tryx(() => s.typeInto('input[placeholder*="Search"]', "fintech"));
  await tryx(() => s.typeInto('input[placeholder*="Search"]', ""));
  await spotText("Research top leads", "button", "One-click bulk actions", "Research top leads · Enrich missing emails · Verify emails · Export CSV.", 6.5);
  await cap("Open any lead for the full picture", "Let's walk through one in depth.", 4.8);

  // ===================== 06 · LEAD DETAIL · ENRICH · RESEARCH =====================
  await s.goto(`/leads/${state.researchedLeadId}`);
  await chapter("06", "Lead Detail · Research", 41); reset();
  await cap(`${state.researchedName} — ${state.researchedCompany}`, "Person, company, score, research, drafts, and a full timeline.", 6);
  await spotText("Find email", "button", "Enrich the email", "Finds & verifies the real address via Hunter — or a smart pattern guess.", 5.8);
  await tryx(() => s.scrollMotion(700));
  await spotText("Lead score breakdown", "h3", "A transparent score", "Every point is justified — alumni, seniority, fit, verified email, growth signals.", 6.5);
  await tryx(() => s.scrollMotion(120));
  await spotText("Public research", "h3", "Grounded research — never LinkedIn", "It reads the company's own website and public news, then extracts one specific, true hook.", 6.8);
  await cap("A real, citable hook", "With sources you can click and verify — this is what makes the email land.", 6);

  // ===================== 07 · OUTREACH + DRY-RUN =====================
  await nav("Outreach"); await chapter("07", "Generate outreach", 50); reset();
  await step("Set sender, type, goal & tone", "Then pick the leads you want to reach.", 5.6);
  await tryx(async () => {
    const boxes = await s.page.$$('input[type="checkbox"]');
    for (const b of boxes.slice(0, 4)) {
      const box = await b.boundingBox();
      if (box) await s.moveCursorTo(Math.round(box.x + 8), Math.round(box.y + 8));
      await b.click().catch(() => {}); await s.injectOverlay(); await s.frame(0.22);
    }
  });
  await spotText("auto", "span", "A dry-run preview", "Leads marked “⚡ auto” match your auto-send rule and will send immediately — the rest go to review.", 6.5);
  await step("Claude writes the drafts", "First email plus two follow-ups, using only real, stored facts — never invents anything.", 6.5);
  await spotText("Dry-run preview", "div", "You see exactly what will happen", "Before you click: how many send now vs. how many wait for review.", 6);

  // ===================== 08 · REVIEW QUEUE =====================
  await nav("Review Queue"); await chapter("08", "Review Queue", 57); reset();
  await cap("The human approval gate", "Anything that doesn't auto-send waits here. This protects SC's name.", 6);
  await step("Read the full context", "Why the lead was chosen, the personalization source, confidence, and warnings.", 6);
  await spotText("Approve & send", "button", "Edit, approve, regenerate, or reject", "“Approve & send” delivers it as your own inbox.", 6);

  // ===================== 09 · AUTO-SEND RULES =====================
  await nav("Settings"); await chapter("09", "Auto-send rules", 64); reset();
  await tryx(() => s.scrollMotion(1500));
  await spotText("Auto-send rules", "h3", "Optional: send without manual review", "Drafts that match your rule skip the queue and send automatically. Off by default.", 6.5);
  await step("Set the rule", "Industries, company size, role, and a minimum lead score — empty means any.", 6.2);
  await step("Keep the guardrails on", "Only verified emails, skip drafts with warnings, and a daily cap. Cold email at volume affects deliverability & brand.", 7);

  // ===================== 10 · AUTOMATIC FOLLOW-UPS =====================
  await chapter("10", "Automatic follow-ups", 71); reset();
  await spotText("Automatic follow-ups for sent leads", "label", "A built-in follow-up schedule", "Follow-up 1 on day 3, follow-up 2 on day 7 — fully configurable.", 6.5);
  await step("Hands-off automation", "Turn on “Run follow-ups automatically” and a scheduler sends them for you — no button.", 6.5);
  await cap("Replies always stop the sequence", "Before each run it checks the inbox — anyone who replied, booked, or opted out gets no more follow-ups.", 6.8);

  // ===================== 11 · SENDING & TRACKING =====================
  await nav("Sending & Tracking"); await chapter("11", "Sending & Tracking", 79); reset();
  await step("Track every outbound", "Ready → sent → replied → booked, all in one view.", 5.4);
  await spotText("Send due follow-ups", "button", "Run follow-ups on demand", "Or let the scheduler do it. Either way, the cadence is respected.", 6);
  await spotText("Sync replies from inbox", "button", "Replies sync automatically", "Matched to leads, opt-outs honored, and a CAN-SPAM footer is added on every send.", 6.5);

  // ===================== 12 · ASSIGNMENTS =====================
  await nav("Assignments"); await chapter("12", "PD Assignments", 86); reset();
  await step("Route booked calls to a PD", "Recommended by sector, function, availability, and current load.", 6);
  await spotText("Recommended", "span", "With a plain-English reason", "“Recommended because this lead is fintech and the PD lists fintech / GTM.” Override any time.", 6.5);

  // ===================== 13 · SCORING =====================
  await nav("Scoring Rules"); await chapter("13", "Scoring Rules", 91); reset();
  await step("Tune what 'good' means", "Weight each rule — alumni, seniority, industry fit, growth signals.", 6);
  await spotText("Re-score all leads", "button", "Apply across the database", "Toggle rules on or off, then re-score every lead at once.", 6);

  // ===================== 14 · SETTINGS & KEYS =====================
  await nav("Settings"); await chapter("14", "Settings & Keys", 96); reset();
  await step("Set your org & guardrails", "Org name, the claims you allow, the signature, and email templates.", 6);
  await tryx(() => s.scrollMotion(740));
  await spotText("API keys & mailbox", "*", "Connect your keys & inbox", "Anthropic, Apollo, Hunter, Tavily, SAM.gov — and a Gmail app password to send as you.", 6.8);
  await tryx(() => s.scrollMotion(0));

  // ===================== CLOSE =====================
  await nav("Dashboard"); await s.setSection("—", "That's the platform"); await s.progress(100);
  await cap("The whole workflow, automated", "Source → enrich → research → draft → review → send → follow up → track → assign.", 6.5);
  await cap("Source smarter. Stay human.", "The tool does the busywork — you stay in control of every email.", 6.5);

} catch (e) {
  console.error("storyboard error:", e);
} finally {
  const out = "/tmp/demo/sc-sourcing-engine-demo.mp4";
  const r = await s.render(out);
  console.log(`\nRENDERED ${out}\nframes=${r.frames}  duration=${r.total.toFixed(1)}s (${(r.total / 60).toFixed(1)} min)`);
  await s.stop();
}
