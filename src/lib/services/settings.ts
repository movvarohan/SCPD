import { db } from "@/lib/db";
import { decodeJson, encodeJson } from "@/lib/serialization";

export interface OrgSettings {
  orgName: string;
  orgDescription: string;
  senderSignature: string;
  allowedClaims: string;
  targetIndustries: string[];
}

export const DEFAULT_SETTINGS: OrgSettings = {
  orgName: "Stanford Consulting",
  orgDescription:
    "Stanford Consulting is a student-run consulting organization that works with companies on strategy, go-to-market, product, operations, and technical projects.",
  senderSignature: "Best,\nThe Stanford Consulting Team",
  allowedClaims:
    "We are a student-run organization at Stanford. We work on strategy, go-to-market, product, operations, and technical projects. (Do not name specific clients unless added here.)",
  targetIndustries: [
    "Fintech",
    "SaaS",
    "AI / ML",
    "Healthtech",
    "Climate / Energy",
    "Consumer / Retail",
  ],
};

const SETTINGS_KEY = "org_settings";

export async function getOrgSettings(): Promise<OrgSettings> {
  const row = await db.setting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row) return DEFAULT_SETTINGS;
  const parsed = decodeJson<Partial<OrgSettings>>(row.value, {});
  return { ...DEFAULT_SETTINGS, ...parsed };
}

export async function saveOrgSettings(settings: OrgSettings): Promise<void> {
  await db.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: encodeJson(settings) },
    update: { value: encodeJson(settings) },
  });
}
