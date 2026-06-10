"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saveOrgSettings, saveAutoSendConfig, getAutoSendConfig, type OrgSettings, type AutoSendConfig } from "@/lib/services/settings";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/services/audit";

export async function updateOrgSettings(settings: OrgSettings) {
  await saveOrgSettings(settings);
  revalidatePath("/settings");
  revalidatePath("/outreach");
  return { ok: true };
}

export async function updateAutoSend(cfg: AutoSendConfig) {
  await saveAutoSendConfig(cfg);
  const user = await getCurrentUser();
  await audit("automation.autosend_updated",
    `auto-send ${cfg.enabled ? "on" : "off"}, autopilot ${cfg.autopilot ? "on" : "off"}, cap ${cfg.dailyCap}/day`, user);
  revalidatePath("/settings");
  revalidatePath("/outreach");
  revalidatePath("/");
  return { ok: true };
}

// Global kill switch — immediately stop all automatic sending.
export async function pauseAutoSend() {
  const cfg = await getAutoSendConfig();
  await saveAutoSendConfig({ ...cfg, enabled: false, autopilot: false });
  const user = await getCurrentUser();
  await audit("automation.paused", "All automatic sending paused from the dashboard kill switch", user);
  revalidatePath("/");
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
