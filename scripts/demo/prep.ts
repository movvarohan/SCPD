// Prepares deterministic, good-looking state for the demo recording and writes
// key IDs to /tmp/demo/state.json. Safe to run repeatedly.
import { db } from "../../src/lib/db";
import { researchLead } from "../../src/lib/services/research";
import { encodeJson } from "../../src/lib/serialization";
import fs from "node:fs";

async function main() {
  // 1) Ensure a lead with strong grounded research (prefer real-website leads).
  let researched = await db.lead.findFirst({
    where: { researchJson: { not: "" }, companyWebsite: { not: null } },
    orderBy: { researchedAt: "desc" },
  });
  // Validate it actually has a hook; otherwise research a few real-site leads.
  function hasHook(j: string | undefined) {
    try { return Boolean(JSON.parse(j || "{}").hook); } catch { return false; }
  }
  if (!researched || !hasHook(researched.researchJson)) {
    const candidates = await db.lead.findMany({
      where: { source: { in: ["yc_directory", "hn_hiring"] }, companyWebsite: { not: null } },
      take: 8,
    });
    for (const c of candidates) {
      const r = await researchLead(c);
      if (r.groundedBy !== "none" && r.hook) {
        await db.lead.update({ where: { id: c.id }, data: { researchJson: encodeJson(r), researchedAt: new Date() } });
        researched = await db.lead.findUnique({ where: { id: c.id } });
        break;
      }
    }
  }

  // 2) Make sure that lead also has an email so the outreach story is coherent.
  if (researched && !researched.email && !researched.workEmail) {
    await db.lead.update({
      where: { id: researched.id },
      data: { email: `${(researched.firstName || "founder").toLowerCase()}@${(researched.companyWebsite || "example.com").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")}`, verifiedEmail: false },
    });
  }

  const needsReview = await db.outreachDraft.count({ where: { status: "needs_review" } });
  const firstReviewDraft = await db.outreachDraft.findFirst({ where: { status: "needs_review" }, include: { lead: true } });

  const state = {
    researchedLeadId: researched?.id ?? null,
    researchedCompany: researched?.companyName ?? null,
    reviewLeadName: firstReviewDraft?.lead ? (firstReviewDraft.lead.fullName || firstReviewDraft.lead.firstName) : null,
    needsReviewCount: needsReview,
  };
  fs.mkdirSync("/tmp/demo", { recursive: true });
  fs.writeFileSync("/tmp/demo/state.json", JSON.stringify(state, null, 2));
  console.log("demo state:", state);
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
