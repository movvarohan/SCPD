import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/providers/email";
import { getOrgSettings, getAutoSendConfig, complianceFooter, withinSendWindow } from "@/lib/services/settings";
import { runReplySync } from "@/lib/services/replysync";
import { isSuppressed } from "@/lib/services/suppression";
import { bestEmailOf } from "@/lib/utils";

// Core follow-up runner — no request context, so it can be called from a server
// action, a cron route, or the in-process scheduler. Sends follow-up 1/2 on the
// configured cadence to still-open sent leads (skips replied/booked/opted out).
export async function runDueFollowUps(createdById?: string): Promise<{ sent: number; due: number }> {
  const cfg = await getAutoSendConfig();
  if (!cfg.autoFollowUps) return { sent: 0, due: 0 };
  if (!withinSendWindow(cfg).ok) return { sent: 0, due: 0 };

  // Check the inbox for replies FIRST — a lead who just replied must not get a
  // follow-up. (No-op when no mailbox is connected.)
  await runReplySync().catch(() => {});

  const settings = await getOrgSettings();
  const provider = await getEmailProvider();
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const leads = await db.lead.findMany({
    where: { status: { in: ["sent", "follow_up_1_sent"] } },
    include: {
      drafts: { orderBy: { updatedAt: "desc" }, take: 1 },
      interactions: { where: { type: "email_sent" }, orderBy: { date: "asc" }, take: 1 },
    },
  });

  let sent = 0;
  let due = 0;
  for (const lead of leads) {
    if (sent >= cfg.dailyCap) break;
    const to = bestEmailOf(lead);
    const draft = lead.drafts[0];
    const firstSendAt = lead.interactions[0]?.date;
    if (!to || !draft || !firstSendAt) continue;
    const daysSince = (now - new Date(firstSendAt).getTime()) / DAY;

    let step = 0;
    let body = "";
    if (lead.status === "sent" && daysSince >= cfg.followUpDays1 && draft.followUp1) {
      step = 1; body = draft.followUp1;
    } else if (lead.status === "follow_up_1_sent" && daysSince >= cfg.followUpDays2 && draft.followUp2) {
      step = 2; body = draft.followUp2;
    }
    if (!step) continue;
    due++;

    // Final do-not-contact gate (the address may have been suppressed since
    // the first email went out).
    if (await isSuppressed(to)) {
      await db.lead.update({ where: { id: lead.id }, data: { status: "not_interested" } });
      await db.interaction.create({
        data: { leadId: lead.id, type: "note", notes: `Follow-up ${step} skipped: ${to} is on the do-not-contact list.`, createdById },
      });
      continue;
    }

    const res = await provider.sendEmail(to, `Re: ${draft.subject}`, body + complianceFooter(settings));
    if (!res.ok) continue;
    await db.lead.update({
      where: { id: lead.id },
      data: { status: step === 1 ? "follow_up_1_sent" : "follow_up_2_sent" },
    });
    await db.interaction.create({
      data: {
        leadId: lead.id,
        type: "email_sent",
        notes: `Follow-up ${step} sent to ${to} via ${provider.name} (auto-cadence, ${Math.round(daysSince)}d after first email).`,
        createdById: createdById,
      },
    });
    sent++;
  }

  return { sent, due };
}
