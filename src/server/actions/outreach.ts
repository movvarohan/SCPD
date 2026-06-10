"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { encodeJson } from "@/lib/serialization";
import { generateOutreach, type OutreachInput } from "@/lib/services/outreach";
import { getOrgSettings, getAutoSendConfig, complianceFooter } from "@/lib/services/settings";
import { autoSendDecision } from "@/lib/services/autosend";
import { lintEmail } from "@/lib/services/deliverability";
import { isSuppressed } from "@/lib/services/suppression";
import { getEmailProvider } from "@/lib/providers/email";
import { getCurrentUser } from "@/lib/auth";
import { bestEmailOf } from "@/lib/utils";
import type { OutreachType } from "@/lib/types";

export interface GenerateParams {
  leadIds: string[];
  senderName: string;
  senderRole: string;
  type: OutreachType;
  goal: string;
  tone: string;
}

export async function generateDraftsForLeads(params: GenerateParams) {
  const settings = await getOrgSettings();
  const autoSend = await getAutoSendConfig();
  const user = await getCurrentUser();
  const leads = await db.lead.findMany({ where: { id: { in: params.leadIds } } });

  const input: OutreachInput = {
    senderName: params.senderName,
    senderRole: params.senderRole,
    type: params.type,
    goal: params.goal,
    tone: params.tone,
    orgName: settings.orgName,
    orgDescription: settings.orgDescription,
    signature: settings.senderSignature,
    allowedClaims: settings.allowedClaims,
  };

  // Respect the daily auto-send cap (count today's auto-sends + this run).
  let autoSentToday = 0;
  if (autoSend.enabled) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    autoSentToday = await db.interaction.count({
      where: { type: "email_sent", notes: { contains: "Auto-sent" }, date: { gte: start } },
    });
  }
  const provider = autoSend.enabled ? await getEmailProvider() : null;

  let created = 0;
  let autoSent = 0;
  let skippedSuppressed = 0;
  for (const lead of leads) {
    // Do-not-contact registry: never draft for a suppressed address.
    const target = bestEmailOf(lead);
    if (target && (await isSuppressed(target))) {
      await db.lead.update({ where: { id: lead.id }, data: { status: "not_interested" } });
      await db.interaction.create({
        data: {
          leadId: lead.id,
          type: "note",
          notes: `Draft skipped: ${target} is on the do-not-contact list.`,
          createdById: user?.id,
        },
      });
      skippedSuppressed++;
      continue;
    }

    const out = await generateOutreach(lead, input);

    // Deliverability lint: blockers (unresolved tokens, empty subject) always
    // force review; warnings feed the skipIfWarnings guardrail.
    const lint = lintEmail(out.subject, out.body);
    const allWarnings = [...out.warnings, ...lint.warnings];

    // Decide: auto-send or route to review?
    const decision = autoSendDecision(lead, allWarnings, autoSend);
    const underCap = autoSentToday + autoSent < autoSend.dailyCap;
    const willAutoSend = decision.send && underCap && lint.blockers.length === 0;

    const draft = await db.outreachDraft.create({
      data: {
        leadId: lead.id,
        type: params.type,
        subject: out.subject,
        body: out.body,
        followUp1: out.followUp1,
        followUp2: out.followUp2,
        personalizationNote: out.personalizationNote,
        confidenceScore: out.confidenceScore,
        warningsJson: encodeJson([...lint.blockers, ...allWarnings]),
        status: willAutoSend ? "sent" : "needs_review",
      },
    });
    created++;

    if (willAutoSend && provider) {
      const to = bestEmailOf(lead)!;
      const body = out.body + complianceFooter(settings);
      const res = await provider.sendEmail(to, out.subject, body);
      if (res.ok) {
        await db.lead.update({ where: { id: lead.id }, data: { status: "sent" } });
        await db.interaction.create({
          data: {
            leadId: lead.id,
            type: "email_sent",
            notes: `Auto-sent to ${to} via ${provider.name} (rule: ${decision.reason}). Subject: "${out.subject}".`,
            createdById: user?.id,
          },
        });
        autoSent++;
      } else {
        // Send failed — fall back to review so it isn't lost.
        await db.outreachDraft.update({ where: { id: draft.id }, data: { status: "needs_review" } });
        await db.lead.update({ where: { id: lead.id }, data: { status: "needs_review" } });
      }
    } else if (["sourced", "enriched", "drafted"].includes(lead.status)) {
      await db.lead.update({ where: { id: lead.id }, data: { status: "needs_review" } });
    }
  }

  revalidatePath("/review");
  revalidatePath("/leads");
  revalidatePath("/tracking");
  revalidatePath("/");
  return { ok: true, created, autoSent, toReview: created - autoSent, skippedSuppressed };
}

// Regenerate a single existing draft in place.
export async function regenerateDraft(
  draftId: string,
  overrides?: Partial<Pick<GenerateParams, "type" | "goal" | "tone" | "senderName" | "senderRole">>
) {
  const draft = await db.outreachDraft.findUnique({ where: { id: draftId } });
  if (!draft) return { ok: false };
  const lead = await db.lead.findUnique({ where: { id: draft.leadId } });
  if (!lead) return { ok: false };
  const settings = await getOrgSettings();

  const input: OutreachInput = {
    senderName: overrides?.senderName || "Stanford Consulting PD",
    senderRole: overrides?.senderRole || "Project Director",
    type: (overrides?.type as OutreachType) || (draft.type as OutreachType),
    goal: overrides?.goal || "intro_call",
    tone: overrides?.tone || "professional",
    orgName: settings.orgName,
    orgDescription: settings.orgDescription,
    signature: settings.senderSignature,
    allowedClaims: settings.allowedClaims,
  };

  const out = await generateOutreach(lead, input);
  await db.outreachDraft.update({
    where: { id: draftId },
    data: {
      subject: out.subject,
      body: out.body,
      followUp1: out.followUp1,
      followUp2: out.followUp2,
      personalizationNote: out.personalizationNote,
      confidenceScore: out.confidenceScore,
      warningsJson: encodeJson(out.warnings),
      status: "needs_review",
      reviewerId: null,
      reviewedAt: null,
    },
  });
  revalidatePath("/review");
  return { ok: true };
}

export interface DraftEdits {
  subject?: string;
  body?: string;
  followUp1?: string;
  followUp2?: string;
}

export async function updateDraft(draftId: string, edits: DraftEdits) {
  await db.outreachDraft.update({ where: { id: draftId }, data: edits });
  revalidatePath("/review");
  return { ok: true };
}

export type ReviewAction = "approve" | "reject" | "ready_to_send";

export async function reviewDraft(
  draftId: string,
  action: ReviewAction,
  edits?: DraftEdits
) {
  const user = await getCurrentUser();
  const statusMap: Record<ReviewAction, string> = {
    approve: "approved",
    reject: "rejected",
    ready_to_send: "ready_to_send",
  };
  const draft = await db.outreachDraft.update({
    where: { id: draftId },
    data: {
      ...edits,
      status: statusMap[action],
      reviewerId: user?.id,
      reviewedAt: new Date(),
    },
  });

  // Sync the lead's lifecycle status.
  const leadStatusMap: Record<ReviewAction, string> = {
    approve: "approved",
    reject: "drafted",
    ready_to_send: "ready_to_send",
  };
  await db.lead.update({
    where: { id: draft.leadId },
    data: { status: leadStatusMap[action] },
  });
  await db.interaction.create({
    data: {
      leadId: draft.leadId,
      type: "status_change",
      notes: `Draft ${action.replace("_", " ")} by reviewer.`,
      createdById: user?.id,
    },
  });

  revalidatePath("/review");
  revalidatePath("/leads");
  revalidatePath("/tracking");
  revalidatePath("/");
  return { ok: true };
}
