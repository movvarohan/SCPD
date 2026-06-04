import type { RawLead, EnrichedLead } from "@/lib/types";
import { generateMockLead } from "./mockData";
import { getIntegrations } from "@/lib/credentials";

// ---------------------------------------------------------------------------
// Clay provider interface
// ---------------------------------------------------------------------------

export interface ClayProvider {
  readonly name: string;
  runWorkflow(leads: RawLead[]): Promise<EnrichedLead[]>;
  generateResearchNotes(lead: RawLead): Promise<string>;
}

class MockClayProvider implements ClayProvider {
  readonly name = "clay:mock";

  async runWorkflow(leads: RawLead[]): Promise<EnrichedLead[]> {
    return leads.map((lead) => {
      const filler = generateMockLead();
      return {
        ...lead,
        industry: lead.industry || filler.industry,
        companySize: lead.companySize || filler.companySize,
        companyWebsite: lead.companyWebsite || filler.companyWebsite,
        location: lead.location || filler.location,
        verifiedEmail: lead.verifiedEmail ?? true,
      };
    });
  }

  async generateResearchNotes(lead: RawLead): Promise<string> {
    const company = lead.companyName || "the company";
    const industry = lead.industry || "their industry";
    const bits = [
      `${company} operates in ${industry}.`,
      lead.companySize ? `Headcount roughly ${lead.companySize}.` : "",
      lead.location ? `Based in ${lead.location}.` : "",
      `Potential angle: companies of this size in ${industry} often need help with strategy, GTM, or operations.`,
    ].filter(Boolean);
    return bits.join(" ");
  }
}

class RealClayProvider implements ClayProvider {
  readonly name = "clay:live";
  constructor(private apiKey: string, private workflowUrl?: string) {}

  async runWorkflow(_leads: RawLead[]): Promise<EnrichedLead[]> {
    // TODO: POST leads to your Clay table/webhook (CLAY_WORKFLOW_URL) and poll
    //   or receive enriched rows back. Clay is typically table+webhook based:
    //   - push rows via the Clay HTTP API / webhook source
    //   - read enriched rows back via the table export endpoint
    throw new Error("RealClayProvider.runWorkflow not implemented — see TODO.");
  }

  async generateResearchNotes(_lead: RawLead): Promise<string> {
    // TODO: Trigger a Clay enrichment column or Claygent prompt for research.
    throw new Error("RealClayProvider.generateResearchNotes not implemented — see TODO.");
  }
}

export async function getClayProvider(): Promise<ClayProvider> {
  const { clayApiKey } = await getIntegrations();
  if (clayApiKey.trim()) {
    // return new RealClayProvider(clayApiKey, process.env.CLAY_WORKFLOW_URL);
    void RealClayProvider;
    return new MockClayProvider();
  }
  return new MockClayProvider();
}

export async function clayStatus(): Promise<{ configured: boolean; mode: string }> {
  const { clayApiKey } = await getIntegrations();
  const configured = Boolean(clayApiKey.trim());
  return { configured, mode: configured ? "key present (mock active)" : "mock" };
}
