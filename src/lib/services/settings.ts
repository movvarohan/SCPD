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
  // CC'd on every outbound email (e.g. a shared SC inbox or a Stanford address
  // for credibility). Applies to first emails and follow-ups.
  ccEmails: string[];
  // Attach the SC one-pager (public/attachments/sc-one-pager.pdf) to the FIRST
  // email of each sequence. Follow-ups are not attached.
  attachOnePager: boolean;
  // Display filename recipients see for the attachment.
  onePagerLabel: string;
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
  ccEmails: [],
  attachOnePager: true,
  onePagerLabel: "Stanford Consulting — Overview.pdf",
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
  // Autopilot: the daily job picks top leads, researches, drafts, and sends —
  // no human action at all. Only acts when a real mailbox is connected.
  autopilot: boolean;
  autopilotDailyTarget: number;
  // Send window: automated sends (Autopilot, scheduled follow-ups) only go out
  // during these hours in the configured timezone. A 3am cold email reads as a
  // bot; a 9:40am one reads as a person. Manual sends are never blocked.
  sendWindowEnabled: boolean;
  sendWindowStart: number; // hour 0-23, inclusive
  sendWindowEnd: number; // hour 0-23, exclusive
  sendWeekdaysOnly: boolean;
  sendTimezone: string; // IANA zone, e.g. "America/Los_Angeles"
}

// FULLY AUTOMATED BY DEFAULT: generated drafts send immediately (the Review
// Queue catches only exceptions, e.g. leads with no email address), follow-ups
// run on their own, and Autopilot drafts+sends for top leads daily once a
// mailbox is connected. The dashboard kill-switch pauses everything instantly.
export const DEFAULT_AUTO_SEND: AutoSendConfig = {
  enabled: true,
  industries: [],
  companySizes: [],
  seniorities: [],
  minScore: 0,
  requireVerifiedEmail: false,
  skipIfWarnings: false,
  dailyCap: 100,
  autoFollowUps: true,
  followUpDays1: 3,
  followUpDays2: 7,
  autoRunFollowUps: true,
  runIntervalMinutes: 60,
  autopilot: true,
  autopilotDailyTarget: 20,
  sendWindowEnabled: true,
  sendWindowStart: 8,
  sendWindowEnd: 18,
  sendWeekdaysOnly: true,
  sendTimezone: "America/Los_Angeles",
};

// Is "now" inside the automated-send window? Pure given an explicit date, so
// it's testable; falls back gracefully to "allowed" on a bad timezone string
// rather than silently halting all automation.
export function withinSendWindow(
  cfg: Pick<AutoSendConfig, "sendWindowEnabled" | "sendWindowStart" | "sendWindowEnd" | "sendWeekdaysOnly" | "sendTimezone">,
  now: Date = new Date()
): { ok: boolean; reason: string } {
  if (!cfg.sendWindowEnabled) return { ok: true, reason: "send window disabled" };
  let hour: number;
  let weekday: string;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: cfg.sendTimezone,
      hour: "numeric",
      hour12: false,
      weekday: "short",
    }).formatToParts(now);
    hour = Number(parts.find((p) => p.type === "hour")?.value ?? NaN) % 24;
    weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
    if (Number.isNaN(hour)) throw new Error("no hour");
  } catch {
    return { ok: true, reason: `invalid timezone "${cfg.sendTimezone}" — window not enforced` };
  }
  if (cfg.sendWeekdaysOnly && (weekday === "Sat" || weekday === "Sun")) {
    return { ok: false, reason: `outside send window (${weekday} — weekdays only)` };
  }
  if (hour < cfg.sendWindowStart || hour >= cfg.sendWindowEnd) {
    return {
      ok: false,
      reason: `outside send window (${hour}:00 ${cfg.sendTimezone}; allowed ${cfg.sendWindowStart}:00–${cfg.sendWindowEnd}:00)`,
    };
  }
  return { ok: true, reason: "within send window" };
}

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
