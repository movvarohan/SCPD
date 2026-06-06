"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saveOrgSettings, saveAutoSendConfig, type OrgSettings, type AutoSendConfig } from "@/lib/services/settings";

export async function updateOrgSettings(settings: OrgSettings) {
  await saveOrgSettings(settings);
  revalidatePath("/settings");
  revalidatePath("/outreach");
  return { ok: true };
}

export async function updateAutoSend(cfg: AutoSendConfig) {
  await saveAutoSendConfig(cfg);
  revalidatePath("/settings");
  revalidatePath("/outreach");
  return { ok: true };
}

export async function updateEmailTemplate(
  id: string,
  data: {
    name?: string;
    subjectTemplate?: string;
    bodyTemplate?: string;
    followUp1Template?: string;
    followUp2Template?: string;
    enabled?: boolean;
  }
) {
  await db.emailTemplate.update({ where: { id }, data });
  revalidatePath("/settings");
  return { ok: true };
}
