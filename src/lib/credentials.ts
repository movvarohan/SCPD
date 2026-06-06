import { db } from "@/lib/db";
import { decodeJson, encodeJson } from "@/lib/serialization";

// ---------------------------------------------------------------------------
// Resolved integration credentials
// ---------------------------------------------------------------------------
// Values are sourced from the DB ("integrations" Setting, editable in the app)
// and fall back to environment variables. DB overrides env so PDs can paste
// keys in the Settings UI without touching .env.
//
// NOTE: For a real deployment, store secrets in a vault / encrypted column.
// This MVP stores them in plain text per the "don't worry about security for
// now" instruction.

export interface Integrations {
  llmProvider: "mock" | "anthropic" | "openai";
  anthropicApiKey: string;
  anthropicModel: string;
  openaiApiKey: string;
  openaiModel: string;

  apolloApiKey: string;
  clayApiKey: string;
  hunterApiKey: string;

  emailProvider: "mock" | "gmail_smtp" | "smartlead";
  gmailUser: string;
  gmailAppPassword: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
  mailFromName: string;
  smartleadApiKey: string;
}

const INTEGRATIONS_KEY = "integrations";

function fromEnv(): Integrations {
  return {
    llmProvider: (process.env.LLM_PROVIDER as Integrations["llmProvider"]) || "mock",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    apolloApiKey: process.env.APOLLO_API_KEY || "",
    clayApiKey: process.env.CLAY_API_KEY || "",
    hunterApiKey: process.env.HUNTER_API_KEY || "",
    emailProvider: (process.env.EMAIL_PROVIDER as Integrations["emailProvider"]) || "mock",
    gmailUser: process.env.GMAIL_USER || "",
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
    smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
    smtpPort: Number(process.env.SMTP_PORT || 465),
    imapHost: process.env.IMAP_HOST || "imap.gmail.com",
    imapPort: Number(process.env.IMAP_PORT || 993),
    mailFromName: process.env.MAIL_FROM_NAME || "Stanford Consulting",
    smartleadApiKey: process.env.SMARTLEAD_API_KEY || "",
  };
}

// Fields editable from the in-app credentials panel.
export type IntegrationOverrides = Partial<Integrations>;

export async function getIntegrations(): Promise<Integrations> {
  const env = fromEnv();
  let overrides: IntegrationOverrides = {};
  try {
    const row = await db.setting.findUnique({ where: { key: INTEGRATIONS_KEY } });
    if (row) overrides = decodeJson<IntegrationOverrides>(row.value, {});
  } catch {
    // DB not ready — fall back to env only.
  }
  // Merge: only let non-empty overrides win so a blank field keeps the env value.
  const merged = { ...env };
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined && v !== null && v !== "") {
      // @ts-expect-error dynamic assignment across union value types
      merged[k] = v;
    }
  }
  return merged;
}

export async function saveIntegrations(overrides: IntegrationOverrides): Promise<void> {
  const existing = await db.setting.findUnique({ where: { key: INTEGRATIONS_KEY } });
  const current = existing ? decodeJson<IntegrationOverrides>(existing.value, {}) : {};
  const next = { ...current, ...overrides };
  await db.setting.upsert({
    where: { key: INTEGRATIONS_KEY },
    create: { key: INTEGRATIONS_KEY, value: encodeJson(next) },
    update: { value: encodeJson(next) },
  });
}

// Masks a secret for display (keeps last 4 chars).
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 6) return "••••";
  return `••••••••${secret.slice(-4)}`;
}
