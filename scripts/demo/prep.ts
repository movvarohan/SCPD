// Prepares deterministic, good-looking state for the demo recording and writes
// key IDs to /tmp/demo/state.json. Safe to run repeatedly.
import { db } from "../../src/lib/db";
import { researchLead } from "../../src/lib/services/research";
import { scoreLead } from "../../src/lib/services/scoring";
import { encodeJson } from "../../src/lib/serialization";
import { saveAutoSendConfig, DEFAULT_AUTO_SEND } from "../../src/lib/services/settings";
import fs from "node:fs";

const DEMO_ID = "demo-deel-lead";

async function main() {
  // Remove accounts/invites created by previous recordings so the on-camera
  // sign-up and team-invite flows work fresh every run.
  await db.user.deleteMany({ where: { email: { in: ["alex.rivera@stanfordconsulting.org", "taylor.chen@stanfordconsulting.org"] } } });
  await db.invite.deleteMany({ where: { email: "taylor.chen@stanfordconsulting.org" } });

  // 1) A named, real, public lead at a real company so the detail + research
  // scene shows a full name AND genuine grounded research.
  const base = {
    firstName: "Alex",
    lastName: "Bouaziz",
    fullName: "Alex Bouaziz",
    email: "alex.bouaziz@deel.com",
    workEmail: "alex.bouaziz@deel.com",
    title: "Co-Founder & CEO",
    seniority: "founder",
    companyName: "Deel",
    companyWebsite: "https://www.deel.com",
    industry: "B2B SaaS / HR Tech",
    location: "San Francisco, CA",
    companySize: "5000+",
    source: "apollo",
    isStanfordAlum: true,
    isSCAlum: false,
    warmConnectionType: "alumni",
    warmConnectionNotes: "Met at a Stanford founders event; open to advising student teams.",
    verifiedEmail: false,
    status: "enriched",
  };
  const breakdown = scoreLead(base as never);
  const lead = await db.lead.upsert({
    where: { id: DEMO_ID },
    create: { id: DEMO_ID, ...base, score: breakdown.total, priority: breakdown.priority, scoreBreakdownJson: encodeJson(breakdown) },
    update: { ...base, score: breakdown.total, priority: breakdown.priority, scoreBreakdownJson: encodeJson(breakdown) },
  });

  // Run real grounded research on it (Deel's public website).
  const r = await researchLead(lead);
  await db.lead.update({ where: { id: DEMO_ID }, data: { researchJson: encodeJson(r), researchedAt: new Date() } });

  // 2) Review queue should have drafts (seed provides them).
  // Enable a demo-friendly auto-send rule so the dry-run preview, the dashboard
  // kill-switch, and the follow-up cadence are all visible on camera.
  await saveAutoSendConfig({
    ...DEFAULT_AUTO_SEND,
    enabled: true,
    industries: ["AI", "Fintech", "SaaS", "Health"],
    minScore: 3,
    requireVerifiedEmail: false,
    skipIfWarnings: true,
    dailyCap: 25,
    autoFollowUps: true,
    followUpDays1: 3,
    followUpDays2: 7,
    autoRunFollowUps: true,
    runIntervalMinutes: 60,
  });

  const needsReview = await db.outreachDraft.count({ where: { status: "needs_review" } });
  const firstReviewDraft = await db.outreachDraft.findFirst({ where: { status: "needs_review" }, include: { lead: true } });

  const state = {
    researchedLeadId: DEMO_ID,
    researchedCompany: "Deel",
    researchedName: "Alex Bouaziz",
    researchGrounded: r.groundedBy,
    researchHook: r.hook?.slice(0, 80) ?? "",
    reviewLeadName: firstReviewDraft?.lead ? (firstReviewDraft.lead.fullName || firstReviewDraft.lead.firstName) : null,
    needsReviewCount: needsReview,
  };
  fs.mkdirSync("/tmp/demo", { recursive: true });
  fs.writeFileSync("/tmp/demo/state.json", JSON.stringify(state, null, 2));
  console.log("demo state:", state);
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
