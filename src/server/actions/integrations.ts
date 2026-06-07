"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { bestEmailOf, normalizeEmail } from "@/lib/utils";
import {
  getIntegrations, saveIntegrations, type IntegrationOverrides,
} from "@/lib/credentials";
import { getLLMProvider } from "@/lib/providers/llm";
import { getApolloProvider } from "@/lib/providers/apollo";
import { getEmailProvider } from "@/lib/providers/email";
import { getOrgSettings, complianceFooter, getAutoSendConfig } from "@/lib/services/settings";

// --- Save credentials from the Settings panel ------------------------------
export async function saveCredentials(overrides: IntegrationOverrides) {
  // Blank string means "leave the existing value"; drop those so we never wipe
  // a saved secret with an empty field.
  const cleaned: IntegrationOverrides = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (v === "" || v === undefined || v === null) continue;
    // @ts-expect-error dynamic assignment
    cleaned[k] = v;
  }
  // Allow provider selects + numeric ports through even if "unchanged".
  for (const k of ["llmProvider", "emailProvider", "smtpPort", "imapPort", "mailFromName", "anthropicModel", "openaiModel"] as const) {
    if (overrides[k] !== undefined) {
      // @ts-expect-error dynamic assignment
      cleaned[k] = overrides[k];
    }
  }
  await saveIntegrations(cleaned);
  revalidatePath("/settings");
  revalidatePath("/source");
  revalidatePath("/outreach");
  revalidatePath("/tracking");
  return { ok: true };
}

// --- Test connections ------------------------------------------------------
export async function testLLM(): Promise<{ ok: boolean; message: string }> {
  const llm = await getLLMProvider();
  if (llm.name === "llm:mock")
    return { ok: false, message: "No LLM key configured (using mock). Add an Anthropic or OpenAI key." };
  try {
    const out = await llm.complete([
      { role: "system", content: "Reply with exactly: OK" },
      { role: "user", content: "ping" },
    ]);
    return { ok: true, message: `${llm.name} responded: "${out.trim().slice(0, 40)}"` };
  } catch (err) {
    return { ok: false, message: (err as Error).message.slice(0, 200) };
  }
}

export async function testApollo(): Promise<{ ok: boolean; message: string }> {
  const apollo = await getApolloProvider();
  if (apollo.name === "apollo:mock")
    return { ok: false, message: "No Apollo key configured (using mock)." };
  try {
    const people = await apollo.searchPeople({
      industries: [], titles: ["VP of Sales"], seniority: [], companySize: [],
      location: "", keywords: [], stanfordPreference: false, limit: 1,
    });
    const note = (apollo as { note?: string | null }).note;
    if (note) return { ok: false, message: note };
    return { ok: true, message: `Apollo live — search returned ${people.length} sample result(s).` };
  } catch (err) {
    return { ok: false, message: (err as Error).message.slice(0, 200) };
  }
}

export async function testHunter(): Promise<{ ok: boolean; message: string }> {
  const { hunterApiKey } = await getIntegrations();
  if (!hunterApiKey.trim()) return { ok: false, message: "No Hunter key — enrichment will fall back to pattern guesses." };
  try {
    const res = await fetch(`https://api.hunter.io/v2/account?api_key=${encodeURIComponent(hunterApiKey.trim())}`);
    if (!res.ok) return { ok: false, message: `Hunter error ${res.status}: ${(await res.text()).slice(0, 120)}` };
    const json = (await res.json()) as { data?: { email?: string; requests?: { searches?: { used?: number; available?: number } } } };
    const used = json.data?.requests?.searches?.used ?? 0;
    const avail = json.data?.requests?.searches?.available ?? 0;
    return { ok: true, message: `Hunter connected (${json.data?.email ?? "account"}). Searches: ${used}/${avail} used.` };
  } catch (err) {
    return { ok: false, message: (err as Error).message.slice(0, 160) };
  }
}

export async function testEmail(): Promise<{ ok: boolean; message: string }> {
  const provider = await getEmailProvider();
  if (provider.name === "email:mock")
    return { ok: false, message: "No mailbox connected (using mock). Add Gmail address + App Password." };
  const res = await provider.verify();
  return res.ok
    ? { ok: true, message: `${provider.name} connected — SMTP login verified.` }
    : { ok: false, message: res.error?.slice(0, 240) ?? "Verification failed." };
}

// --- Send a draft for a lead ----------------------------------------------
export async function sendOutreach(
  leadId: string,
  draftId?: string
): Promise<{ ok: boolean; message: string }> {
  const user = await getCurrentUser();
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, message: "Lead not found." };
  const to = bestEmailOf(lead);
  if (!to) return { ok: false, message: "Lead has no email address — add one first." };

  const draft = draftId
    ? await db.outreachDraft.findUnique({ where: { id: draftId } })
    : await db.outreachDraft.findFirst({
        where: { leadId, status: { in: ["ready_to_send", "approved"] } },
        orderBy: { updatedAt: "desc" },
      });
  if (!draft) return { ok: false, message: "No approved/ready draft to send. Approve one in the Review Queue." };

  // Append the CAN-SPAM footer (physical address + opt-out) at send time so it
  // is always present even if a reviewer edited the draft.
  const settings = await getOrgSettings();
  const body = draft.body + complianceFooter(settings);

  const provider = await getEmailProvider();
  const result = await provider.sendEmail(to, draft.subject, body);
  if (!result.ok) {
    return { ok: false, message: `Send failed: ${result.error}` };
  }

  await db.outreachDraft.update({ where: { id: draft.id }, data: { status: "sent" } });
  await db.lead.update({ where: { id: leadId }, data: { status: "sent" } });
  await db.interaction.create({
    data: {
      leadId,
      type: "email_sent",
      notes: `First email sent to ${to} via ${provider.name}. Subject: "${draft.subject}". Message id: ${result.providerMessageId ?? "n/a"}.`,
      createdById: user?.id,
    },
  });

  revalidatePath("/review");
  revalidatePath("/tracking");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  return { ok: true, message: `Sent to ${to}.` };
}

// --- Send due follow-ups (cadence from auto-send config) -------------------
export async function sendDueFollowUps(): Promise<{ ok: boolean; message: string }> {
  const cfg = await getAutoSendConfig();
  const settings = await getOrgSettings();
  const provider = await getEmailProvider();
  const user = await getCurrentUser();
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Leads still in the outbound sequence (not replied/booked/opted out).
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

    const res = await provider.sendEmail(to, `Re: ${draft.subject}`, body + complianceFooter(settings));
    if (!res.ok) continue;
    await db.lead.update({ where: { id: lead.id }, data: { status: step === 1 ? "follow_up_1_sent" : "follow_up_2_sent" } });
    await db.interaction.create({
      data: {
        leadId: lead.id,
        type: "email_sent",
        notes: `Follow-up ${step} sent to ${to} via ${provider.name} (auto-cadence, ${Math.round(daysSince)}d after first email).`,
        createdById: user?.id,
      },
    });
    sent++;
  }

  revalidatePath("/tracking");
  revalidatePath("/");
  return {
    ok: true,
    message: due === 0
      ? "No follow-ups are due yet."
      : `Sent ${sent} follow-up(s) of ${due} due (cadence: day ${cfg.followUpDays1} / ${cfg.followUpDays2}).`,
  };
}

// --- Pull replies from the connected inbox and match to leads --------------
export async function syncReplies(): Promise<{ ok: boolean; message: string }> {
  const provider = await getEmailProvider();
  if (provider.name === "email:mock")
    return { ok: false, message: "Connect a mailbox to sync replies." };

  let replies;
  try {
    replies = await provider.getReplies();
  } catch (err) {
    return { ok: false, message: `IMAP error: ${(err as Error).message.slice(0, 200)}` };
  }

  // Build a lookup of contacted leads by normalized email.
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
    // Honor opt-outs (CAN-SPAM) — mark not interested instead of replied.
    const isOptOut = /unsubscribe|opt[\s-]?out|remove me|stop\b/i.test(`${reply.subject} ${reply.snippet}`);
    await db.lead.update({
      where: { id: lead.id },
      data: { status: isOptOut ? "not_interested" : "replied" },
    });
    await db.interaction.create({
      data: {
        leadId: lead.id,
        type: "reply",
        notes: isOptOut
          ? `Opt-out received from ${reply.from} — marked not interested. ("${reply.subject}")`
          : `Reply received from ${reply.from}: "${reply.subject}" (${reply.receivedAt}).`,
      },
    });
    byEmail.delete(normalizeEmail(reply.from)); // count each lead once
    if (isOptOut) optOuts++;
    matched++;
  }

  revalidatePath("/tracking");
  revalidatePath("/assignments");
  revalidatePath("/");
  return {
    ok: true,
    message: matched > 0
      ? `Synced ${replies.length} inbox messages — ${matched} matched (${matched - optOuts} replied, ${optOuts} opted out).`
      : `Checked ${replies.length} inbox messages — no new replies matched contacted leads.`,
  };
}
