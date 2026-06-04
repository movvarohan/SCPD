// ---------------------------------------------------------------------------
// LLM provider abstraction (email generation)
// ---------------------------------------------------------------------------
// Swappable via env: LLM_PROVIDER = "mock" | "openai" | "anthropic".
// With no key present we generate deterministic template-based drafts so the
// app is fully usable offline.

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  readonly name: string;
  // Returns a single text completion for the given messages.
  complete(messages: LLMMessage[], opts?: { json?: boolean }): Promise<string>;
}

// Strong system prompt for outreach generation (kept in code on purpose).
export const OUTREACH_SYSTEM_PROMPT = `You write concise, credible outreach emails for Stanford Consulting, a student-run consulting organization. Use only the facts provided to you. Do not invent relationships, clients, funding rounds, achievements, or personal details. Keep the tone human, warm, professional, and student-written. The goal is to secure a short introductory call (about 15 minutes). Briefly mention Stanford Consulting and give exactly one specific, truthful reason for reaching out. Avoid exaggerated claims, spammy language, fake or creepy over-personalization, and anything that reads like mass outbound. Keep emails short (3-6 sentences). Do not make claims about specific clients unless they are explicitly provided in the allowed claims. Always return strictly valid JSON when asked.`;

// --- Mock provider ---------------------------------------------------------
class MockLLMProvider implements LLMProvider {
  readonly name = "llm:mock";
  async complete(messages: LLMMessage[]): Promise<string> {
    // The outreach service handles deterministic generation directly via
    // templates; this is a safety net if something calls the LLM generically.
    const last = messages[messages.length - 1]?.content ?? "";
    return `Thanks for the note. ${last.slice(0, 120)}`;
  }
}

// --- OpenAI provider -------------------------------------------------------
class OpenAIProvider implements LLMProvider {
  readonly name = "llm:openai";
  constructor(private apiKey: string, private model: string) {}

  async complete(messages: LLMMessage[], opts?: { json?: boolean }): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.6,
        ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
}

// --- Anthropic provider ----------------------------------------------------
class AnthropicProvider implements LLMProvider {
  readonly name = "llm:anthropic";
  constructor(private apiKey: string, private model: string) {}

  async complete(messages: LLMMessage[]): Promise<string> {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const rest = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system,
        messages: rest,
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }
}

export function getLLMProvider(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER || "mock").toLowerCase();
  if (provider === "openai" && process.env.OPENAI_API_KEY?.trim()) {
    return new OpenAIProvider(
      process.env.OPENAI_API_KEY.trim(),
      process.env.OPENAI_MODEL || "gpt-4o-mini"
    );
  }
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY?.trim()) {
    return new AnthropicProvider(
      process.env.ANTHROPIC_API_KEY.trim(),
      process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"
    );
  }
  return new MockLLMProvider();
}

export function llmStatus(): { configured: boolean; mode: string } {
  const provider = (process.env.LLM_PROVIDER || "mock").toLowerCase();
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  if (provider === "openai" && hasOpenAI)
    return { configured: true, mode: "openai" };
  if (provider === "anthropic" && hasAnthropic)
    return { configured: true, mode: "anthropic" };
  return { configured: false, mode: "mock" };
}

// True when a usable real LLM is configured.
export function llmIsLive(): boolean {
  return llmStatus().configured;
}
