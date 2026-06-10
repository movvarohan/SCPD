// SC Sourcing Engine — definitive onboarding & product tour.
// 100% live app, no slides: create an admin account on camera, set up the
// workspace, invite the team, then use every feature end to end. Broadcast
// lower-third + animated cursor + cinematic spotlight + chapter progress bar.
// Run: node scripts/demo/record.mjs   (app must be running with seeded data)
import { Studio } from "./studio.mjs";
import fs from "node:fs";

const state = JSON.parse(fs.readFileSync("/tmp/demo/state.json", "utf8").toString());
const s = new Studio();

const PACE = 1.55; // deliberately unhurried — target ~12–13 minutes
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
  await cap("SC Sourcing Engine", "A complete, from-scratch walkthrough — from creating your account to booked client calls.", 6.4);
  await cap("What this tool does", "It finds the right people to email, writes the outreach, sends it, follows up, and routes booked calls to a PD — automatically.", 6.4);
  await cap("This is the sign-in screen", "Your team signs in with email + password. The very first person creates the workspace as an admin.", 5.8);
  await spotText("Create an admin account", "a", "First time here? Create your admin account", "The first admin sets everything up and invites the rest of the team.", 5.6);
  await tryx(() => s.pointAndClickText("Create an admin account", "a", 1400));
  await s.injectOverlay();
  reset();
  await step("Enter your details", "Name, work email, and a password — that's the whole sign-up.", 4.8);
  await tryx(() => s.typeInto("#name", "Alex Rivera"));
  await tryx(() => s.typeInto("#email", "alex.rivera@stanfordconsulting.org"));
  await tryx(() => s.typeInto("#password", "sourcing2026"));
  await s.frame(0.4);
  await step("Create the account", "You become the workspace Admin and you're signed straight in.", 4.4);
  await tryx(() => s.pointAndClickText("Create account", "button", 1200));
  await tryx(() => s.page.waitForSelector("aside", { timeout: 20000 }));
  await s.sleep(900);
  await s.injectOverlay();

  // ===================== 02 · DASHBOARD =====================
  await chapter("02", "The Dashboard", 8);
  await cap("Welcome in — this is your home base", "Every number about your pipeline, the moment you sign in.", 5.4);
  await cap("Read the funnel left to right", "Total leads → high-priority → drafted → pending review → sent → replies → booked calls.", 6);
  await spotText("Reply Rate", "div", "Two rates tell you what's working", "Reply rate and booked-call conversion, updated live as the team works.", 5.4);
  await spotText("Automation is ON", "div", "Outreach runs on autopilot", "Out of the box the engine drafts and sends for you. This banner shows today's count…", 5.6);
  await spotText("Pause auto-send", "button", "…and one click pauses everything", "A global kill-switch. Turn automation off and every draft waits for a human instead.", 5.8);
  await tryx(() => s.scrollMotion(440));
  await cap("Live charts below", "Pipeline by status, leads by priority, and where every lead came from.", 5);
  await tryx(() => s.scrollMotion(0));

  // ===================== 03 · CONNECT KEYS & INBOX =====================
  await nav("Settings"); await chapter("03", "Connect your keys & inbox", 14); reset();
  await cap("First-time setup lives in Settings", "Two things make the engine fully live: your API keys and your mailbox.", 5.8);
  await tryx(() => s.scrollMotion(1500));
  await spotText("API keys & mailbox", "*", "Paste your keys once", "Anthropic for the AI, Apollo for sourcing, Hunter for emails, Tavily for research — each with a Save & test button.", 6.6);
  await step("Connect a sending inbox", "Gmail (send as you) or Resend over HTTPS — no personal inbox needed. Until one is connected, sends are safely simulated.", 6.4);
  await cap("Why it matters", "With a mailbox connected, 'sent' always means actually delivered — and replies sync back automatically.", 5.6);
  await tryx(() => s.scrollMotion(0));

  // ===================== 04 · INVITE YOUR TEAM =====================
  await chapter("04", "Invite your team", 20); reset();
  await cap("Now bring in the team", "Settings → Team & invites. Reviewers approve emails; PDs own the calls they get assigned.", 5.8);
  await tryx(() => s.highlightText("Team & invites", "h3"));
  await tryx(() => s.unhighlight());
  await step("Enter their email & role", "Admin, Reviewer, or PD — each role sees exactly what it needs.", 4.8);
  await tryx(() => s.typeInto('input[placeholder*="teammate"]', "taylor.chen@stanfordconsulting.org"));
  await step("Click Invite", "A one-time join link is generated — it expires in 14 days and works once.", 4.6);
  await tryx(() => s.pointAndClickText("Invite", "button", 1600));
  await s.injectOverlay();
  await spotText("/join/", "span", "Share the join link", "Send it however you like. They set a name + password and land in the app with the right role.", 6.2);
  await cap("Manage everyone here too", "Change roles, reset a password, or remove a member — their sessions end instantly.", 5.4);

  // ===================== 05 · IMPORT =====================
  await nav("Import"); await chapter("05", "Import your contacts", 26); reset();
  await cap("Time to get leads in", "Start with the SC alumni spreadsheet, or any CSV exported from Apollo, Clay, or a conference list.", 5.6);
  await step("Pick the file type", "“SC Alumni Spreadsheet” auto-tags alumni and warm connections for scoring.", 4.8);
  const uploaded = await tryx(async () => {
    const input = await s.page.$('input[type="file"]');
    if (!input) return false;
    await input.uploadFile("public/samples/sc_alumni_sample.csv");
    await s.sleep(1500); await s.injectOverlay(); return true;
  });
  if (uploaded) {
    await step("Upload — columns map themselves", "Even messy headers like “Current Company” or “Class Year” are detected automatically.", 5.4);
    await tryx(() => s.scrollMotion(520));
    await step("Preview & validate every row", "See exactly what will import, with a check on each row before you commit.", 5.2);
    await cap("Duplicates are caught for you", "Matched on email, LinkedIn, and name + company — no double entries, ever.", 5.2);
    await tryx(() => s.pointAndClickText("Import", "button"));
    await s.sleep(900); await s.injectOverlay();
    await step("Read the summary", "Imported, duplicates skipped, errors flagged — all in one pass.", 5.2);
  } else {
    await cap("Upload → map → preview → import", "Duplicates caught on email, LinkedIn, and name + company.", 5.6);
  }

  // ===================== 06 · SOURCE =====================
  await nav("Source Leads"); await chapter("06", "Source brand-new leads", 32); reset();
  await cap("No list yet? Generate one", "Describe who you want and pull fresh leads from public data.", 5);
  await step("Describe your ideal client", "Target industries, titles, seniority, company size, and location.", 5.4);
  await tryx(() => s.scrollMotion(560));
  await spotText("SEC EDGAR", "button", "Twelve connectors most teams never touch", "SEC filings & recent raises, IRS 990s, NPPES health, NIH, openFDA, USAspending, GLEIF, SAM.gov, Y Combinator, Hacker News.", 6.6);
  await cap("Real companies & named executives", "No public source publishes emails — so each lead is flagged to enrich next.", 5.4);
  await tryx(() => s.scrollMotion(0));

  // ===================== 07 · LEAD DATABASE =====================
  await nav("Leads"); await chapter("07", "The Lead Database", 38); reset();
  await cap("Every lead in one table", "Name, title, company, email, source, warm connection, score, status, and owner.", 5.4);
  await step("Search & filter instantly", "By status, source, score, alumni connection, industry, assigned PD, or email.", 5.2);
  await tryx(() => s.typeInto('input[placeholder*="Search"]', "fintech"));
  await tryx(() => s.typeInto('input[placeholder*="Search"]', ""));
  await spotText("Research top leads", "button", "One-click bulk actions", "Research top leads · Enrich missing emails · Verify emails · Export the whole list to CSV.", 6);
  await cap("Open any lead for the full story", "Let's walk through one in depth.", 4.4);

  // ===================== 08 · LEAD DETAIL · RESEARCH =====================
  await s.goto(`/leads/${state.researchedLeadId}`);
  await chapter("08", "Inside a lead", 45); reset();
  await cap(`${state.researchedName} — ${state.researchedCompany}`, "Person, company, score, research, drafts, and a complete timeline.", 5.6);
  await spotText("Find email", "button", "Get a real, sendable email", "Finds & verifies the address via Hunter — or a smart pattern guess, clearly marked unverified.", 5.8);
  await tryx(() => s.scrollMotion(700));
  await spotText("Lead score breakdown", "h3", "A transparent score", "Every point is justified — alumni tie, seniority, industry fit, verified email, growth signals.", 6.2);
  await tryx(() => s.scrollMotion(120));
  await spotText("Public research", "h3", "Grounded research — never LinkedIn", "It reads the company's own website and public news, then extracts one specific, true hook.", 6.6);
  await cap("A real, citable hook", "With sources you can click and verify — this is what makes the cold email actually land.", 5.6);

  // ===================== 09 · GENERATE OUTREACH =====================
  await nav("Outreach"); await chapter("09", "Generate the outreach", 52); reset();
  await step("Set sender, type, goal & tone", "Then pick the leads you want to reach in one batch.", 5.2);
  await tryx(async () => {
    const boxes = await s.page.$$('input[type="checkbox"]');
    for (const b of boxes.slice(0, 4)) {
      const box = await b.boundingBox();
      if (box) await s.moveCursorTo(Math.round(box.x + 8), Math.round(box.y + 8));
      await b.click().catch(() => {}); await s.injectOverlay(); await s.frame(0.22);
    }
  });
  await step("Claude writes each draft", "A first email plus two follow-ups, from real stored facts only — it never invents anything.", 6);
  await spotText("auto-send", "span", "You see what will happen before you click", "A preview shows how many leads send immediately under your rules versus how many wait for review.", 6.2);
  await cap("Every draft is lint-checked", "Broken personalization — a leftover {{name}} — or an empty subject can never auto-send. It's held for a human.", 6.2);

  // ===================== 10 · REVIEW QUEUE =====================
  await nav("Review Queue"); await chapter("10", "The Review Queue", 58); reset();
  await cap("This is the exceptions desk", "With automation on, the queue only collects what shouldn't auto-send — a missing email, a lint warning, a rule miss.", 6.2);
  await step("Read the full context", "Why the lead was chosen, the personalization source, the confidence score, and any warnings.", 5.6);
  await spotText("Approve", "button", "Edit, approve, regenerate, or reject", "Approve and it sends from your own inbox. Nothing leaves without passing the rules or a person.", 5.8);

  // ===================== 11 · AUTO-SEND RULES + SEND WINDOW =====================
  await nav("Settings"); await chapter("11", "Automation rules", 64); reset();
  await tryx(() => s.scrollMotion(2050));
  await spotText("Auto-send rules", "h3", "Decide what sends on its own", "Match by industry, company size, role, and a minimum score. The Review Queue catches the rest.", 6.2);
  await step("Keep the guardrails on", "Verified-emails-only, skip drafts with warnings, and a daily cap — cold email at volume affects deliverability and the SC brand.", 6.6);
  await spotText("Business-hours send window", "label", "Send like a human, not a bot", "Automated email only goes out during business hours in your timezone — default 8am–6pm Pacific, weekdays only.", 6.6);

  // ===================== 12 · AUTOMATIC FOLLOW-UPS =====================
  await chapter("12", "Automatic follow-ups", 70); reset();
  await spotText("Automatic follow-ups for sent leads", "label", "A built-in follow-up schedule", "Follow-up 1 on day 3, follow-up 2 on day 7 — fully configurable, and it runs hands-off.", 6.2);
  await cap("Replies always stop the sequence", "Before every run it checks the inbox first. Anyone who replied, booked, or opted out gets no more follow-ups.", 6.4);

  // ===================== 13 · DO-NOT-CONTACT =====================
  await chapter("13", "The do-not-contact list", 76); reset();
  await tryx(() => s.scrollMotion(1200));
  await spotText("Do-not-contact list", "*", "The hardest guarantee in the product", "Anyone who replies “unsubscribe” lands here automatically and is never emailed again — by any path.", 6.6);
  await step("Add an address by hand too", "Someone asked a PD to stop at an event? Add them in one line. Removals are admin-only, and everything is audited.", 6.4);
  await cap("Even if they're re-imported later", "A suppressed address stays suppressed across every future import. This protects SC's reputation.", 5.8);

  // ===================== 14 · SENDING & TRACKING =====================
  await nav("Sending & Tracking"); await chapter("14", "Sending & Tracking", 82); reset();
  await step("Track every outbound", "Ready → sent → replied → booked, all in one pipeline view.", 5.2);
  await spotText("Sync replies from inbox", "button", "Replies sync from your inbox", "Matched to leads, opt-outs honored automatically, and a CAN-SPAM footer added on every send.", 6);

  // ===================== 15 · ANALYTICS =====================
  await nav("Analytics"); await chapter("15", "Analytics", 88); reset();
  await cap("Step back and see the whole picture", "How outreach is performing over time, not just today.", 5.2);
  await spotText("Sends & replies — last 8 weeks", "*", "Sends and replies, week by week", "Watch volume and engagement trend together over the last two months.", 5.8);
  await spotText("Pipeline funnel", "*", "The funnel with conversion at each step", "Leads → have email → contacted → replied → booked, with the conversion rate between every stage.", 6.2);
  await cap("And where your best leads come from", "Breakdowns by source and by industry tell you where to spend your sourcing time.", 5.4);

  // ===================== 16 · ASSIGNMENTS + SCORING =====================
  await nav("Assignments"); await chapter("16", "Route & tune", 93); reset();
  await step("Route a booked call to a PD", "Recommended by sector, function, availability, and current load — with a plain-English reason. Override anytime.", 6.2);
  await nav("Scoring Rules"); reset();
  await step("Tune what 'a good lead' means", "Weight each rule — alumni tie, seniority, industry fit, growth signals — then re-score the whole database at once.", 6.2);

  // ===================== CLOSE =====================
  await nav("Dashboard"); await s.setSection("—", "That's the platform"); await s.progress(100);
  await cap("The whole workflow, end to end", "Sign up → set up keys → invite the team → import & source → enrich & research → draft → review → send → follow up → track → assign.", 7);
  await cap("Source smarter. Stay human.", "The engine does the busywork on autopilot — you keep control of every email and every guardrail. Press ⌘K anywhere to jump around.", 6.6);

} catch (e) {
  console.error("storyboard error:", e);
} finally {
  const out = "/tmp/demo/sc-sourcing-engine-demo.mp4";
  const r = await s.render(out);
  console.log(`\nRENDERED ${out}\nframes=${r.frames}  duration=${r.total.toFixed(1)}s (${(r.total / 60).toFixed(1)} min)`);
  await s.stop();
}
