import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the credentials module so we can drive provider resolution directly.
const integrations = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/lib/credentials", () => ({
  getIntegrations: async () => integrations.value,
}));

import { llmStatus, getLLMProvider } from "@/lib/providers/llm";

const base = {
  llmProvider: "",
  anthropicApiKey: "",
  anthropicModel: "claude-sonnet-4-6",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
};

beforeEach(() => {
  integrations.value = { ...base };
});

describe("LLM provider resolution", () => {
  it("auto-defaults to Anthropic when only a key is present (no LLM_PROVIDER)", async () => {
    integrations.value = { ...base, anthropicApiKey: "sk-ant-test" };
    expect(await llmStatus()).toMatchObject({ configured: true, mode: expect.stringContaining("anthropic") });
    expect((await getLLMProvider()).name).toBe("llm:anthropic");
  });

  it("still uses Anthropic when LLM_PROVIDER is left as the default 'mock' but a key exists", async () => {
    integrations.value = { ...base, llmProvider: "mock", anthropicApiKey: "sk-ant-test" };
    expect((await getLLMProvider()).name).toBe("llm:anthropic");
  });

  it("honours an explicit OpenAI choice when its key is present", async () => {
    integrations.value = { ...base, llmProvider: "openai", openaiApiKey: "sk-oa", anthropicApiKey: "sk-ant-test" };
    expect((await getLLMProvider()).name).toBe("llm:openai");
  });

  it("prefers Anthropic over OpenAI when both keys exist and nothing is forced", async () => {
    integrations.value = { ...base, anthropicApiKey: "sk-ant-test", openaiApiKey: "sk-oa" };
    expect((await getLLMProvider()).name).toBe("llm:anthropic");
  });

  it("falls back to mock when no key is configured", async () => {
    expect(await llmStatus()).toMatchObject({ configured: false, mode: "mock" });
    expect((await getLLMProvider()).name).toBe("llm:mock");
  });

  it("reports the configured model in the status string", async () => {
    integrations.value = { ...base, anthropicApiKey: "sk-ant-test", anthropicModel: "claude-fable-5" };
    expect((await llmStatus()).mode).toBe("anthropic · claude-fable-5");
  });
});
