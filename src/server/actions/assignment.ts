"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { listToString } from "@/lib/serialization";
import { getCurrentUser } from "@/lib/auth";

export async function assignLeadToPD(leadId: string, pdId: string | null) {
  const user = await getCurrentUser();
  const lead = await db.lead.update({
    where: { id: leadId },
    data: {
      assignedPDId: pdId,
      status: pdId ? "assigned" : undefined,
    },
  });

  if (pdId) {
    const pd = await db.user.findUnique({ where: { id: pdId } });
    await db.interaction.create({
      data: {
        leadId,
        type: "assignment",
        notes: `Assigned to ${pd?.name ?? "PD"}.`,
        createdById: user?.id,
      },
    });
  }

  await recomputePDLoads();

  revalidatePath("/assignments");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function recomputePDLoads() {
  const profiles = await db.pDProfile.findMany();
  for (const p of profiles) {
    const count = await db.lead.count({
      where: {
        assignedPDId: p.userId,
        status: { in: ["assigned", "replied", "booked"] },
      },
    });
    await db.pDProfile.update({
      where: { id: p.id },
      data: { activeLeadCount: count },
    });
  }
}

export interface PDProfileInput {
  industries: string[];
  functions: string[];
  availability: string;
  notes: string;
}

export async function upsertPDProfile(userId: string, data: PDProfileInput) {
  await db.pDProfile.upsert({
    where: { userId },
    create: {
      userId,
      industries: listToString(data.industries),
      functions: listToString(data.functions),
      availability: data.availability,
      notes: data.notes,
    },
    update: {
      industries: listToString(data.industries),
      functions: listToString(data.functions),
      availability: data.availability,
      notes: data.notes,
    },
  });
  revalidatePath("/assignments");
  return { ok: true };
}

export async function createPD(name: string, email: string) {
  const user = await db.user.create({
    data: { name, email, role: "PD" },
  });
  await db.pDProfile.create({
    data: { userId: user.id, industries: "", functions: "", availability: "medium" },
  });
  revalidatePath("/assignments");
  return { ok: true };
}
