import { db } from "@/lib/db";
import { getEmailProvider, emailStatus } from "@/lib/providers/email";
import { getOrgSettings, getAutoSendConfig, complianceFooter } from "@/lib/services/settings";
import { generateOutreach, type OutreachInput } from "@/lib/services/outreach";
import { researchLead } from "@/lib/services/research";
import { autoSendDecision } from "@/lib/services/autosend";
import { audit } from "@/lib/services/audit";
import { encodeJson } from "@/lib/serialization";
import { bestEmailOf } from "@/lib/utils";

export interface AutopilotResult {
  ran: boolean;
  reason?: string;
  considered: number;
  researched: number;
  sent: number;
  queuedForReview: number;
}

// Autopilot: end-to-end automated outreach. Picks the highest-scoring leads
// that haven't been contacted, researches them (grounded, company website),
// generates a draft, and sends it — within the daily cap. Anything that can't
// send (no email, rule mismatch, provider error) lands in the Review Queue
// instead of being dropped. Runs only when a REAL mailbox is connected so
// "sent" always means delivered.
export async function runAutopilot(): Promise<AutopilotResult> {
  const cfg = await getAutoSendConfig();
  if (!cfg.enabled || !cfg.autopilot) {
    return { ran: false, reason: "autopilot is off", considered: 0, researched: 0, sent: 0, queuedForReview: 0 };
  }
  const mail = await emailStatus();
  if (!mail.configured) {
    return { ran: false, reason: "no mailbox connected — autopilot waits so 'sent' always means delivered", considered: 0, researched: 0, sent: 0, queuedForReview: 0 };
  }

  const settings = await getOrgSettings();
  const provider = await getEmailProvider();

  // Respect the shared daily cap (counts all sends today).
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const sentToday = await db.interaction.count({
    where: { type: "email_sent", date: { gte: start } },
  });
  const budget = Math.max(0, Math.min(cfg.dailyCap - sentToday, cfg.autopilotDailyTarget));
  if (budget === 0) {
    return { ran: true, reason: "daily cap reached", considered: 0, researched: 0, sent: 0, queuedForReview: 0 };
  }

  // Top uncontacted leads with an email address.
  const candidates = await db.lead.findMany({
    where: {
      status: { in: ["sourced", "enriched", "drafted"] },
      OR: [{ email: { not: null } }, { workEmail: { not: null } }, { personalEmail: { not: null } }],
    },
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    take: budget * 2, // headroom for rule mismatches
  });

  const input: OutreachInput = {
    senderName: settings.orgName,
    senderRole: "Sourcing Team",
    type: "cold_high_fit",
    goal: "intro_call",
    tone: "professional",
    orgName: settings.orgName,
    orgDescription: settings.orgDescription,
    signature: settings.senderSignature,
    allowedClaims: settings.allowedClaims,
  };

  let researched = 0;
  let sent = 0;
  let queued = 0;

  for (const candidate of candidates) {
    if (sent >= budget) break;
    let lead = candidate;

    // Grounded research first, if possible and missing.
    if (!lead.researchedAt && lead.companyWebsite) {
      try {
        const r = await researchLead(lead);
        lead = await db.lead.update({
          where: { id: lead.id },
          data: { researchJson: encodeJson(r), researchedAt: new Date() },
        });
        if (r.groundedBy !== "none") researched++;
      } catch {
        /* research is best-effort */
      }
    }

    const out = await generateOutreach(lead, input);
    const decision = autoSendDecision(lead, out.warnings, cfg);
    const to = bestEmailOf(lead);

    const draft = await db.outreachDraft.create({
      data: {
        leadId: lead.id,
        type: input.type,
        subject: out.subject,
        body: out.body,
        followUp1: out.followUp1,
        followUp2: out.followUp2,
        personalizationNote: out.personalizationNote,
        confidenceScore: out.confidenceScore,
        warningsJson: encodeJson(out.warnings),
        status: "needs_review",
      },
    });

    if (decision.send && to) {
      const res = await provider.sendEmail(to, out.subject, out.body + complianceFooter(settings));
      if (res.ok) {
        await db.outreachDraft.update({ where: { id: draft.id }, data: { status: "sent" } });
        await db.lead.update({ where: { id: lead.id }, data: { status: "sent" } });
        await db.interaction.create({
          data: {
            leadId: lead.id,
            type: "email_sent",
            notes: `Auto-sent by Autopilot to ${to} via ${provider.name}. Subject: "${out.subject}".`,
          },
        });
        sent++;
        continue;
      }
    }
    // Couldn't send — leave in the Review Queue as an exception.
    await db.lead.update({ where: { id: lead.id }, data: { status: "needs_review" } });
    await db.interaction.create({
      data: {
        leadId: lead.id,
        type: "note",
        notes: `Autopilot queued for review (${decision.send ? "send failed" : decision.reason}).`,
      },
    });
    queued++;
  }

  if (sent > 0 || queued > 0) {
    await audit("automation.autopilot", `Autopilot: ${sent} sent, ${queued} queued for review, ${researched} researched`);
  }
  return { ran: true, considered: candidates.length, researched, sent, queuedForReview: queued };
}
