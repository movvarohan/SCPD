"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { encodeJson } from "@/lib/serialization";
import { generateOutreach, type OutreachInput } from "@/lib/services/outreach";
import { getOrgSettings } from "@/lib/services/settings";
import { getCurrentUser } from "@/lib/auth";
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

  let created = 0;
  for (const lead of leads) {
    const out = await generateOutreach(lead, input);
    await db.outreachDraft.create({
      data: {
        leadId: lead.id,
        type: params.type,
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
    // Advance lead lifecycle to needs_review.
    if (["sourced", "enriched", "drafted"].includes(lead.status)) {
      await db.lead.update({
        where: { id: lead.id },
        data: { status: "needs_review" },
      });
    }
    created++;
  }

  revalidatePath("/review");
  revalidatePath("/leads");
  revalidatePath("/");
  return { ok: true, created };
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
