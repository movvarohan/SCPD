import { describe, it, expect, vi } from "vitest";

// Drive provider selection by mocking credentials (no Apollo key → mock).
const integrations = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/lib/credentials", () => ({
  getIntegrations: async () => integrations.value,
}));

import { getApolloProvider } from "@/lib/providers/apollo";

describe("Apollo sourcing — no fabrication without a paid key", () => {
  it("uses the mock provider when no key is configured", async () => {
    integrations.value = { apolloApiKey: "" };
    const apollo = await getApolloProvider();
    expect(apollo.name).toBe("apollo:mock");
  });

  it("returns ZERO fabricated people from the mock provider", async () => {
    integrations.value = { apolloApiKey: "" };
    const apollo = await getApolloProvider();
    const people = await apollo.searchPeople({
      industries: ["Fintech"], titles: ["VP Sales"], seniority: [], companySize: [],
      location: "SF", keywords: [], stanfordPreference: true, limit: 50,
    });
    expect(people).toEqual([]);
  });

  it("exposes a guidance note pointing to real sources", async () => {
    integrations.value = { apolloApiKey: "" };
    const apollo = await getApolloProvider();
    const note = (apollo as { note?: string | null }).note ?? "";
    expect(note).toMatch(/paid Apollo|connector|CSV/i);
  });
});
