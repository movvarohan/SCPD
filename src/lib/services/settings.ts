import { db } from "@/lib/db";
import { decodeJson, encodeJson } from "@/lib/serialization";

export interface OrgSettings {
  orgName: string;
  orgDescription: string;
  senderSignature: string;
  allowedClaims: string;
  targetIndustries: string[];
  // CAN-SPAM: a physical mailing address + opt-out line appended at send time.
  mailingAddress: string;
  addComplianceFooter: boolean;
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
  mailingAddress: "Stanford Consulting, 459 Lagunita Dr, Stanford, CA 94305",
  addComplianceFooter: true,
};

// CAN-SPAM footer appended to outbound emails: identifies the sender, gives a
// physical postal address, and a clear opt-out. Required for lawful cold email.
export function complianceFooter(s: OrgSettings): string {
  if (!s.addComplianceFooter) return "";
  const addr = s.mailingAddress?.trim();
  return [
    "",
    "—",
    `${s.orgName}${addr ? ` · ${addr}` : ""}`,
    "Not relevant? Reply with \"unsubscribe\" and we won't contact you again.",
  ].join("\n");
}

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
