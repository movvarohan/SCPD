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

// ---------------------------------------------------------------------------
// Auto-send rules
// ---------------------------------------------------------------------------
// When enabled, a generated draft whose lead matches ALL set criteria (and
// passes the guardrails) is sent automatically instead of going to the Review
// Queue. OFF by default. Empty criteria arrays mean "any".
export interface AutoSendConfig {
  enabled: boolean;
  industries: string[];
  companySizes: string[];
  seniorities: string[];
  minScore: number;
  requireVerifiedEmail: boolean;
  skipIfWarnings: boolean;
  dailyCap: number;
  // Automatic follow-ups for sent leads.
  autoFollowUps: boolean;
  followUpDays1: number; // days after the first email to send follow-up 1
  followUpDays2: number; // days after the first email to send follow-up 2
  // Hands-off automation: a background scheduler runs due follow-ups itself.
  autoRunFollowUps: boolean;
  runIntervalMinutes: number;
}

export const DEFAULT_AUTO_SEND: AutoSendConfig = {
  enabled: false,
  industries: [],
  companySizes: [],
  seniorities: [],
  minScore: 4,
  requireVerifiedEmail: true,
  skipIfWarnings: true,
  dailyCap: 25,
  autoFollowUps: true,
  followUpDays1: 3,
  followUpDays2: 7,
  autoRunFollowUps: false,
  runIntervalMinutes: 60,
};

const AUTO_SEND_KEY = "auto_send";

export async function getAutoSendConfig(): Promise<AutoSendConfig> {
  const row = await db.setting.findUnique({ where: { key: AUTO_SEND_KEY } });
  if (!row) return DEFAULT_AUTO_SEND;
  return { ...DEFAULT_AUTO_SEND, ...decodeJson<Partial<AutoSendConfig>>(row.value, {}) };
}

export async function saveAutoSendConfig(cfg: AutoSendConfig): Promise<void> {
  await db.setting.upsert({
    where: { key: AUTO_SEND_KEY },
    create: { key: AUTO_SEND_KEY, value: encodeJson(cfg) },
    update: { value: encodeJson(cfg) },
  });
}

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
