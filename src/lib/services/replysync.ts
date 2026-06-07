import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/providers/email";
import { normalizeEmail } from "@/lib/utils";

// Core reply-sync — no request context, callable from an action, the scheduler,
// or the cron route. Pulls inbox replies, matches them to contacted leads, and
// marks them replied (or not-interested for opt-outs) so follow-ups stop.
export async function runReplySync(): Promise<{ checked: number; matched: number; optOuts: number; live: boolean }> {
  const provider = await getEmailProvider();
  if (provider.name === "email:mock") return { checked: 0, matched: 0, optOuts: 0, live: false };

  let replies;
  try {
    replies = await provider.getReplies();
  } catch {
    return { checked: 0, matched: 0, optOuts: 0, live: true };
  }

  // Only leads still in the sequence can be "stopped" by a reply.
  const contacted = await db.lead.findMany({
    where: { status: { in: ["sent", "follow_up_1_sent", "follow_up_2_sent"] } },
  });
  const byEmail = new Map<string, (typeof contacted)[number]>();
  for (const l of contacted) {
    for (const e of [l.email, l.workEmail, l.personalEmail]) {
      const n = normalizeEmail(e);
      if (n) byEmail.set(n, l);
    }
  }

  let matched = 0;
  let optOuts = 0;
  for (const reply of replies) {
    const lead = byEmail.get(normalizeEmail(reply.from));
    if (!lead) continue;
    const isOptOut = /unsubscribe|opt[\s-]?out|remove me|stop\b/i.test(`${reply.subject} ${reply.snippet}`);
    await db.lead.update({ where: { id: lead.id }, data: { status: isOptOut ? "not_interested" : "replied" } });
    await db.interaction.create({
      data: {
        leadId: lead.id,
        type: "reply",
        notes: isOptOut
          ? `Opt-out received from ${reply.from} — marked not interested. ("${reply.subject}")`
          : `Reply received from ${reply.from}: "${reply.subject}" (${reply.receivedAt}).`,
      },
    });
    byEmail.delete(normalizeEmail(reply.from));
    if (isOptOut) optOuts++;
    matched++;
  }

  return { checked: replies.length, matched, optOuts, live: true };
}
