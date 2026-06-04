import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { getIntegrations, type Integrations } from "@/lib/credentials";

// ---------------------------------------------------------------------------
// Email provider abstraction (sending / reply tracking)
// ---------------------------------------------------------------------------

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface ReplyEvent {
  to: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
}

export interface EmailProvider {
  readonly name: string;
  sendEmail(to: string, subject: string, body: string): Promise<SendResult>;
  scheduleFollowUp(to: string, subject: string, body: string, sendAt: Date): Promise<SendResult>;
  getReplies(since?: Date): Promise<ReplyEvent[]>;
  verify(): Promise<{ ok: boolean; error?: string }>;
}

// --- Mock provider ---------------------------------------------------------
class MockEmailProvider implements EmailProvider {
  readonly name = "email:mock";
  async sendEmail(): Promise<SendResult> {
    return { ok: true, providerMessageId: `mock-${Date.now()}` };
  }
  async scheduleFollowUp(): Promise<SendResult> {
    return { ok: true, providerMessageId: `mock-fu-${Date.now()}` };
  }
  async getReplies(): Promise<ReplyEvent[]> {
    return [];
  }
  async verify() {
    return { ok: true };
  }
}

// --- Gmail (App Password) via SMTP + IMAP ----------------------------------
// Sends as the connected Gmail account; replies land in that real inbox and
// are read back over IMAP. Requires a Gmail App Password (2FA must be on):
//   https://myaccount.google.com/apppasswords
class GmailSmtpProvider implements EmailProvider {
  readonly name = "email:gmail_smtp";
  constructor(private c: Integrations) {}

  private transporter() {
    return nodemailer.createTransport({
      host: this.c.smtpHost,
      port: this.c.smtpPort,
      secure: this.c.smtpPort === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: this.c.gmailUser, pass: this.c.gmailAppPassword },
    });
  }

  private from() {
    return this.c.mailFromName
      ? `"${this.c.mailFromName}" <${this.c.gmailUser}>`
      : this.c.gmailUser;
  }

  // Convert plain-text body (with newlines) to a simple HTML version.
  private html(body: string) {
    const escaped = body
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2937;white-space:pre-wrap">${escaped}</div>`;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<SendResult> {
    try {
      const info = await this.transporter().sendMail({
        from: this.from(),
        to,
        subject,
        text: body,
        html: this.html(body),
      });
      return { ok: true, providerMessageId: info.messageId };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async scheduleFollowUp(to: string, subject: string, body: string): Promise<SendResult> {
    // Gmail SMTP can't natively schedule. TODO: persist a job + a cron/worker
    // that calls sendEmail at sendAt. For now, send immediately is the caller's
    // choice; this stub reports not-implemented so the UI can keep it manual.
    return { ok: false, error: "Scheduling not implemented for Gmail SMTP — send follow-ups manually for now." };
  }

  async getReplies(since?: Date): Promise<ReplyEvent[]> {
    const client = new ImapFlow({
      host: this.c.imapHost,
      port: this.c.imapPort,
      secure: true,
      auth: { user: this.c.gmailUser, pass: this.c.gmailAppPassword },
      logger: false,
    });
    const replies: ReplyEvent[] = [];
    await client.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const sinceDate = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const uids = await client.search({ since: sinceDate });
        const list = Array.isArray(uids) ? uids.slice(-200) : [];
        for await (const msg of client.fetch(list, { envelope: true, bodyStructure: false, source: false })) {
          const env = msg.envelope;
          if (!env) continue;
          const from = env.from?.[0]?.address ?? "";
          const to = env.to?.[0]?.address ?? "";
          replies.push({
            from,
            to,
            subject: env.subject ?? "",
            snippet: env.subject ?? "",
            receivedAt: (env.date ?? new Date()).toISOString(),
          });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
    return replies;
  }

  async verify() {
    try {
      await this.transporter().verify();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

// --- Smartlead (placeholder) -----------------------------------------------
class SmartleadProvider implements EmailProvider {
  readonly name = "email:smartlead";
  constructor(private apiKey: string) {}
  async sendEmail(): Promise<SendResult> {
    // TODO: Smartlead campaigns API.
    return { ok: false, error: "SmartleadProvider.sendEmail not implemented — see TODO." };
  }
  async scheduleFollowUp(): Promise<SendResult> {
    return { ok: false, error: "Not implemented." };
  }
  async getReplies(): Promise<ReplyEvent[]> {
    return [];
  }
  async verify() {
    return { ok: false, error: "Smartlead not implemented." };
  }
}

export async function getEmailProvider(): Promise<EmailProvider> {
  const c = await getIntegrations();
  if (c.emailProvider === "gmail_smtp" && c.gmailUser && c.gmailAppPassword) {
    return new GmailSmtpProvider(c);
  }
  if (c.emailProvider === "smartlead" && c.smartleadApiKey) {
    return new SmartleadProvider(c.smartleadApiKey);
  }
  return new MockEmailProvider();
}

export async function emailStatus(): Promise<{ configured: boolean; mode: string }> {
  const c = await getIntegrations();
  if (c.emailProvider === "gmail_smtp" && c.gmailUser && c.gmailAppPassword) {
    return { configured: true, mode: `gmail · ${c.gmailUser}` };
  }
  if (c.emailProvider === "smartlead" && c.smartleadApiKey) {
    return { configured: true, mode: "smartlead (placeholder)" };
  }
  if (c.emailProvider === "gmail_smtp") {
    return { configured: false, mode: "gmail (needs address + app password)" };
  }
  return { configured: false, mode: "mock (no real send)" };
}
