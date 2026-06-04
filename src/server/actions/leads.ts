"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { encodeJson } from "@/lib/serialization";
import { scoreLead } from "@/lib/services/scoring";
import { getRuleWeights } from "./scoring";
import { getCurrentUser } from "@/lib/auth";
import type { LeadStatus } from "@/lib/types";

export async function updateLead(
  id: string,
  data: Record<string, unknown>
) {
  // Whitelist editable fields.
  const allowed = [
    "firstName", "lastName", "fullName", "email", "personalEmail", "workEmail",
    "linkedinUrl", "title", "seniority", "companyName", "companyWebsite",
    "industry", "location", "companySize", "isStanfordAlum", "isSCAlum",
    "isFormerClient", "warmConnectionType", "warmConnectionNotes",
    "verifiedEmail", "status", "source",
  ];
  const payload: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in data) payload[key] = data[key];
  }

  const updated = await db.lead.update({ where: { id }, data: payload });

  // Recompute score after edits.
  const weights = await getRuleWeights();
  const breakdown = scoreLead(updated, weights);
  await db.lead.update({
    where: { id },
    data: {
      score: breakdown.total,
      priority: breakdown.priority,
      scoreBreakdownJson: encodeJson(breakdown),
    },
  });

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  return { ok: true };
}

export async function setLeadStatus(id: string, status: LeadStatus) {
  const user = await getCurrentUser();
  await db.lead.update({ where: { id }, data: { status } });
  await db.interaction.create({
    data: {
      leadId: id,
      type: "status_change",
      notes: `Status changed to "${status}".`,
      createdById: user?.id,
    },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/tracking");
  revalidatePath("/");
  return { ok: true };
}

export async function rescoreAllLeads() {
  const weights = await getRuleWeights();
  const leads = await db.lead.findMany();
  for (const lead of leads) {
    const breakdown = scoreLead(lead, weights);
    await db.lead.update({
      where: { id: lead.id },
      data: {
        score: breakdown.total,
        priority: breakdown.priority,
        scoreBreakdownJson: encodeJson(breakdown),
      },
    });
  }
  revalidatePath("/leads");
  revalidatePath("/");
  return { ok: true, count: leads.length };
}

export async function addInteraction(leadId: string, notes: string) {
  const user = await getCurrentUser();
  if (!notes.trim()) return { ok: false };
  await db.interaction.create({
    data: { leadId, type: "note", notes: notes.trim(), createdById: user?.id },
  });
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function deleteLead(id: string) {
  await db.lead.delete({ where: { id } });
  revalidatePath("/leads");
  revalidatePath("/");
  return { ok: true };
}
