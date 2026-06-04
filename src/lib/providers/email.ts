// ---------------------------------------------------------------------------
// Email provider abstraction (sending / reply tracking)
// ---------------------------------------------------------------------------
// EMAIL_PROVIDER = "mock" | "gmail" | "smartlead"
// The MVP never actually sends email; status is tracked manually. These
// adapters are where real sending is wired in later.

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
  scheduleFollowUp(
    to: string,
    subject: string,
    body: string,
    sendAt: Date
  ): Promise<SendResult>;
  getReplies(since?: Date): Promise<ReplyEvent[]>;
  syncStatus(): Promise<{ synced: number }>;
}

class MockEmailProvider implements EmailProvider {
  readonly name = "email:mock";
  async sendEmail(): Promise<SendResult> {
    // Does NOT send. Returns a fake id so the UI flow works end-to-end.
    return { ok: true, providerMessageId: `mock-${Date.now()}` };
  }
  async scheduleFollowUp(): Promise<SendResult> {
    return { ok: true, providerMessageId: `mock-fu-${Date.now()}` };
  }
  async getReplies(): Promise<ReplyEvent[]> {
    return [];
  }
  async syncStatus(): Promise<{ synced: number }> {
    return { synced: 0 };
  }
}

class GmailProvider implements EmailProvider {
  readonly name = "email:gmail";
  constructor(
    private clientId: string,
    private clientSecret: string,
    private refreshToken: string
  ) {}
  async sendEmail(): Promise<SendResult> {
    // TODO: Use Gmail API users.messages.send with an OAuth2 access token
    //   refreshed from GMAIL_REFRESH_TOKEN. Build a raw RFC 822 message.
    throw new Error("GmailProvider.sendEmail not implemented — see TODO.");
  }
  async scheduleFollowUp(): Promise<SendResult> {
    // TODO: Gmail has no native scheduling via API; persist a job and send later.
    throw new Error("GmailProvider.scheduleFollowUp not implemented — see TODO.");
  }
  async getReplies(): Promise<ReplyEvent[]> {
    // TODO: Poll users.messages.list with a query for threads in INBOX.
    throw new Error("GmailProvider.getReplies not implemented — see TODO.");
  }
  async syncStatus(): Promise<{ synced: number }> {
    throw new Error("GmailProvider.syncStatus not implemented — see TODO.");
  }
}

class SmartleadProvider implements EmailProvider {
  readonly name = "email:smartlead";
  constructor(private apiKey: string) {}
  async sendEmail(): Promise<SendResult> {
    // TODO: Smartlead campaigns API — add lead to a campaign / send via
    //   https://server.smartlead.ai/api/v1/...  with api_key query param.
    throw new Error("SmartleadProvider.sendEmail not implemented — see TODO.");
  }
  async scheduleFollowUp(): Promise<SendResult> {
    throw new Error("SmartleadProvider.scheduleFollowUp not implemented — see TODO.");
  }
  async getReplies(): Promise<ReplyEvent[]> {
    // TODO: Smartlead webhook / reply API.
    throw new Error("SmartleadProvider.getReplies not implemented — see TODO.");
  }
  async syncStatus(): Promise<{ synced: number }> {
    throw new Error("SmartleadProvider.syncStatus not implemented — see TODO.");
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER || "mock").toLowerCase();
  if (
    provider === "gmail" &&
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  ) {
    void GmailProvider;
    // return new GmailProvider(...)
  }
  if (provider === "smartlead" && process.env.SMARTLEAD_API_KEY) {
    void SmartleadProvider;
    // return new SmartleadProvider(process.env.SMARTLEAD_API_KEY)
  }
  return new MockEmailProvider();
}

export function emailStatus(): { configured: boolean; mode: string } {
  const provider = (process.env.EMAIL_PROVIDER || "mock").toLowerCase();
  const gmail = Boolean(
    process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN
  );
  const smartlead = Boolean(process.env.SMARTLEAD_API_KEY);
  if (provider === "gmail" && gmail)
    return { configured: true, mode: "gmail (placeholder)" };
  if (provider === "smartlead" && smartlead)
    return { configured: true, mode: "smartlead (placeholder)" };
  return { configured: false, mode: "mock (no real send)" };
}
