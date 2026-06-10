// SC Sourcing Engine — definitive onboarding & product tour.
// 100% live app, no slides: create an admin account on camera, invite the
// team, then use every feature. Broadcast lower-third + animated cursor +
// cinematic spotlight + chapter progress bar.
// Run: node scripts/demo/record.mjs   (app must be running)
import { Studio } from "./studio.mjs";
import fs from "node:fs";

const state = JSON.parse(fs.readFileSync("/tmp/demo/state.json", "utf8").toString());
const s = new Studio();

const PACE = 1.9; // deliberately unhurried — target ~11 minutes
const cap = async (t, sub, sec = 4.6) => { await s.caption(t, sub); await s.sleep(320); await s.hold(sec * PACE); };
let stepN = 0;
const step = async (t, sub, sec = 4.8) => { stepN += 1; await s.caption(`${stepN}.  ${t}`, sub); await s.sleep(320); await s.hold(sec * PACE); };
const reset = () => { stepN = 0; };
const tryx = async (fn) => { try { return await fn(); } catch (e) { console.warn("step skipped:", e.message); } };

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
  // ===================== 01 · CREATE YOUR ACCOUNT =====================
  await s.clearCookies();
  await s.goto("/login");
  await chapter("01", "Getting started", 3);
  await cap("SC Sourcing Engine", "The complete tour — from creating your account to booked client calls.", 6.2);
  await cap("This is the sign-in screen", "Existing members sign in with email + password. New admins create an account.", 5.6);
  await spotText("Create an admin account", "a", "First time? Create your admin account", "The first admin sets up the workspace and invites everyone else.", 5.6);
  await tryx(() => s.pointAndClickText("Create an admin account", "a", 1400));
  await s.injectOverlay();
  reset();
  await step("Enter your details", "Name, email, and a password — that's the whole sign-up.", 4.6);
  await tryx(() => s.typeInto("#name", "Alex Rivera"));
  await tryx(() => s.typeInto("#email", "alex.rivera@stanfordconsulting.org"));
  await tryx(() => s.typeInto("#password", "sourcing2026"));
  await s.frame(0.4);
  await step("Create the account", "You become the workspace Admin, signed in immediately.", 4.2);
  await tryx(() => s.pointAndClickText("Create account", "button", 1200));
  await tryx(() => s.page.waitForSelector("aside", { timeout: 20000 }));
  await s.sleep(900);
  await s.injectOverlay();

  // ===================== 02 · DASHBOARD =====================
  await chapter("02", "Dashboard", 8);
  await cap("Welcome in — this is the Dashboard", "Your entire pipeline, the moment you sign in.", 5.2);
  await cap("Read the funnel left to right", "Total leads → high-priority → drafted → pending review → sent → replies → booked.", 5.8);
  await spotText("Reply Rate", "div", "Two rates tell you what's working", "Reply rate and booked-call conversion, updated live as the team works.", 5.4);
  await spotText("Pause auto-send", "button", "A global kill-switch", "Auto-send is on for this tour — one click pauses all automatic sending.", 5.6);
  await tryx(() => s.scrollMotion(420));
  await cap("Live charts", "Pipeline by status, leads by priority, and where every lead came from.", 5.2);
  await tryx(() => s.scrollMotion(0));

  // ===================== 03 · INVITE YOUR TEAM =====================
  await nav("Settings"); await chapter("03", "Invite your team", 14); reset();
  await cap("Next: bring in your team", "Settings → Team & invites. Reviewers approve emails; PDs own their leads.", 5.6);
  await tryx(() => s.highlightText("Team & invites", "h3"));
  await tryx(() => s.unhighlight());
  await step("Enter their email & role", "PD, Reviewer, or another Admin.", 4.6);
  await tryx(() => s.typeInto('input[placeholder*="teammate"]', "taylor.chen@stanfordconsulting.org"));
  await step("Click Invite", "A one-time link is generated — it expires in 14 days.", 4.4);
  await tryx(() => s.pointAndClickText("Invite", "button", 1600));
  await s.injectOverlay();
  await spotText("/join/", "span", "Share the join link", "Send it any way you like. They set a name + password and land in the app with the right role.", 6.2);
  await cap("Manage the team here too", "Change roles or remove members — sessions end immediately.", 5.2);

  // ===================== 04 · IMPORT =====================
  await nav("Import"); await chapter("04", "Import contacts", 21); reset();
  await cap("Now let's get leads in", "Start with the SC alumni spreadsheet, or any CSV from Apollo, Clay, or LinkedIn.", 5.4);
  await step("Pick the file type", "“SC Alumni Spreadsheet” auto-tags alumni and warm connections.", 4.8);
  const uploaded = await tryx(async () => {
    const input = await s.page.$('input[type="file"]');
    if (!input) return false;
    await input.uploadFile("public/samples/sc_alumni_sample.csv");
    await s.sleep(1500); await s.injectOverlay(); return true;
  });
  if (uploaded) {
    await step("Upload — columns auto-detect", "Even messy headers like “Current Company” or “Class Year” map themselves.", 5.4);
    await tryx(() => s.scrollMotion(520));
    await step("Preview & validate every row", "See exactly what will import, with a check on each row.", 5.2);
    await cap("Duplicates are caught for you", "Matched on email, LinkedIn, and name + company — no double entries.", 5.2);
    await tryx(() => s.pointAndClickText("Import", "button"));
    await s.sleep(900); await s.injectOverlay();
    await step("Read the summary", "Imported, duplicates skipped, errors flagged — one pass.", 5.2);
  } else {
    await cap("Upload → map → preview → import", "Duplicates caught on email, LinkedIn, and name + company.", 5.6);
  }

  // ===================== 05 · SOURCE =====================
  await nav("Source Leads"); await chapter("05", "Source new leads", 28); reset();
  await step("Describe who you want", "Target industries, titles, seniority, company size, and location.", 5.6);
  await tryx(() => s.scrollMotion(560));
  await cap("Then pull from public data", "Twelve connectors most teams never touch.", 4.8);
  await spotText("SEC EDGAR", "button", "Sources nobody else mines", "SEC filings & recent raises, IRS 990s, NPPES health, NIH, openFDA, USAspending, GLEIF, SAM.gov, YC, Hacker News.", 6.4);
  await cap("Real companies & named executives", "No public source publishes emails — so every lead is flagged for enrichment next.", 5.4);
  await tryx(() => s.scrollMotion(0));

  // ===================== 06 · LEAD DATABASE =====================
  await nav("Leads"); await chapter("06", "Lead Database", 35); reset();
  await cap("Every lead in one table", "Name, title, company, email, source, connection, score, status, owner.", 5.4);
  await step("Search & filter instantly", "By status, source, score, alumni connection, industry, PD, and email.", 5.2);
  await tryx(() => s.typeInto('input[placeholder*="Search"]', "fintech"));
  await tryx(() => s.typeInto('input[placeholder*="Search"]', ""));
  await spotText("Research top leads", "button", "One-click bulk actions", "Research top leads · Enrich missing emails · Verify emails · Export CSV.", 6);
  await cap("Open any lead for the full story", "Let's walk through one in depth.", 4.4);

  // ===================== 07 · LEAD DETAIL · RESEARCH =====================
  await s.goto(`/leads/${state.researchedLeadId}`);
  await chapter("07", "Lead Detail · Research", 43); reset();
  await cap(`${state.researchedName} — ${state.researchedCompany}`, "Person, company, score, research, drafts, and a full timeline.", 5.6);
  await spotText("Find email", "button", "Enrich the email", "Finds & verifies the real address via Hunter — or a smart pattern guess, clearly marked unverified.", 5.6);
  await tryx(() => s.scrollMotion(700));
  await spotText("Lead score breakdown", "h3", "A transparent score", "Every point is justified — alumni, seniority, industry fit, verified email, growth signals.", 6.2);
  await tryx(() => s.scrollMotion(120));
  await spotText("Public research", "h3", "Grounded research — never LinkedIn", "It reads the company's own website and public news, then extracts one specific, true hook.", 6.6);
  await cap("A real, citable hook", "With sources you can click and verify — this is what makes the email land.", 5.6);

  // ===================== 08 · OUTREACH + DRY-RUN =====================
  await nav("Outreach"); await chapter("08", "Generate outreach", 51); reset();
  await step("Set sender, type, goal & tone", "Then pick the leads you want to reach.", 5.2);
  await tryx(async () => {
    const boxes = await s.page.$$('input[type="checkbox"]');
    for (const b of boxes.slice(0, 4)) {
      const box = await b.boundingBox();
      if (box) await s.moveCursorTo(Math.round(box.x + 8), Math.round(box.y + 8));
      await b.click().catch(() => {}); await s.injectOverlay(); await s.frame(0.22);
    }
  });
  await spotText("auto", "span", "A dry-run preview", "Leads marked “⚡ auto” match your auto-send rule and will send immediately — the rest go to review.", 6.2);
  await step("Claude writes the drafts", "First email plus two follow-ups, using only real, stored facts — it never invents anything.", 6.2);
  await spotText("Dry-run preview", "div", "You see exactly what will happen", "Before you click Generate: how many send now vs. how many wait for review.", 5.8);

  // ===================== 09 · REVIEW QUEUE =====================
  await nav("Review Queue"); await chapter("09", "Review Queue", 58); reset();
  await cap("The human approval gate", "Anything that doesn't auto-send waits here. This protects SC's name.", 5.6);
  await step("Read the full context", "Why the lead was chosen, the personalization source, confidence, and warnings.", 5.6);
  await spotText("Approve & send", "button", "Edit, approve, regenerate, or reject", "“Approve & send” delivers it as your own inbox.", 5.6);

  // ===================== 10 · AUTO-SEND RULES =====================
  await nav("Settings"); await chapter("10", "Auto-send rules", 65); reset();
  await tryx(() => s.scrollMotion(2100));
  await spotText("Auto-send rules", "h3", "Optional: send without manual review", "Drafts matching your rule skip the queue and send automatically. Off by default.", 6.2);
  await step("Set the rule", "Industries, company size, role, and a minimum lead score — empty means any.", 5.8);
  await step("Keep the guardrails on", "Verified emails only, skip drafts with warnings, and a daily cap — cold email at volume affects deliverability and brand.", 6.6);

  // ===================== 11 · AUTOMATIC FOLLOW-UPS =====================
  await chapter("11", "Automatic follow-ups", 72); reset();
  await spotText("Automatic follow-ups for sent leads", "label", "A built-in follow-up schedule", "Follow-up 1 on day 3, follow-up 2 on day 7 — fully configurable.", 6.2);
  await step("Hands-off automation", "Turn on “Run follow-ups automatically” and a scheduler sends them for you — no button.", 6);
  await cap("Replies always stop the sequence", "Before each run it checks the inbox — anyone who replied, booked, or opted out gets no more follow-ups.", 6.4);

  // ===================== 12 · SENDING & TRACKING =====================
  await nav("Sending & Tracking"); await chapter("12", "Sending & Tracking", 79); reset();
  await step("Track every outbound", "Ready → sent → replied → booked, all in one view.", 5.2);
  await spotText("Send due follow-ups", "button", "Run follow-ups on demand", "Or let the scheduler do it — either way the cadence is respected.", 5.6);
  await spotText("Sync replies from inbox", "button", "Replies sync from your inbox", "Matched to leads, opt-outs honored, and a CAN-SPAM footer is added on every send.", 6);

  // ===================== 13 · ASSIGNMENTS =====================
  await nav("Assignments"); await chapter("13", "PD Assignments", 85); reset();
  await step("Route booked calls to a PD", "Recommended by sector, function, availability, and current load.", 5.6);
  await spotText("Recommended", "span", "With a plain-English reason", "“Recommended because this lead is fintech and the PD lists fintech / GTM.” Override any time.", 6);

  // ===================== 14 · SCORING =====================
  await nav("Scoring Rules"); await chapter("14", "Scoring Rules", 90); reset();
  await step("Tune what 'good' means", "Weight each rule — alumni, seniority, industry fit, growth signals.", 5.6);
  await spotText("Re-score all leads", "button", "Apply across the database", "Toggle rules on or off, then re-score every lead at once.", 5.6);

  // ===================== 15 · SETTINGS & KEYS =====================
  await nav("Settings"); await chapter("15", "Settings & Keys", 95); reset();
  await step("Set your org & guardrails", "Org name, the claims you allow, the signature, and email templates.", 5.6);
  await tryx(() => s.scrollMotion(900));
  await spotText("API keys & mailbox", "*", "Connect your keys & inbox", "Anthropic, Apollo, Hunter, Tavily, SAM.gov — and a Gmail app password to send as you, each with Save & test.", 6.6);
  await tryx(() => s.scrollMotion(0));

  // ===================== CLOSE =====================
  await nav("Dashboard"); await s.setSection("—", "That's the platform"); await s.progress(100);
  await cap("The whole workflow, end to end", "Sign up → invite the team → import & source → enrich & research → draft → review → send → follow up → track → assign.", 6.8);
  await cap("Source smarter. Stay human.", "The tool does the busywork — you stay in control of every email.", 6.4);

} catch (e) {
  console.error("storyboard error:", e);
} finally {
  const out = "/tmp/demo/sc-sourcing-engine-demo.mp4";
  const r = await s.render(out);
  console.log(`\nRENDERED ${out}\nframes=${r.frames}  duration=${r.total.toFixed(1)}s (${(r.total / 60).toFixed(1)} min)`);
  await s.stop();
}
