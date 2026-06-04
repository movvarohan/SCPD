import type { SourcingCriteria, RawLead, EnrichedLead } from "@/lib/types";
import { generateMockLead } from "./mockData";

// ---------------------------------------------------------------------------
// Apollo provider interface
// ---------------------------------------------------------------------------
// The app codes against this interface everywhere. Swap the implementation
// returned by `getApolloProvider()` once a real API key is configured.

export interface ApolloProvider {
  readonly name: string;
  searchPeople(criteria: SourcingCriteria): Promise<RawLead[]>;
  enrichPerson(input: RawLead): Promise<EnrichedLead>;
  bulkEnrich(leads: RawLead[]): Promise<EnrichedLead[]>;
}

// --- Mock implementation ---------------------------------------------------
class MockApolloProvider implements ApolloProvider {
  readonly name = "apollo:mock";

  async searchPeople(criteria: SourcingCriteria): Promise<RawLead[]> {
    const count = Math.max(1, Math.min(criteria.limit || 10, 100));
    const industries = criteria.industries;
    const titles = criteria.titles;
    const results: RawLead[] = [];
    for (let i = 0; i < count; i++) {
      const base = generateMockLead();
      // Bias mock results toward the requested criteria so the demo feels real.
      if (industries.length) base.industry = industries[i % industries.length];
      if (titles.length) base.title = titles[i % titles.length];
      if (criteria.location) base.location = criteria.location;
      if (criteria.companySize.length)
        base.companySize = criteria.companySize[i % criteria.companySize.length];
      const isAlum = criteria.stanfordPreference ? i % 2 === 0 : base.isStanfordAlum;
      results.push({
        ...base,
        source: "apollo",
        isStanfordAlum: isAlum,
        warmConnectionType: isAlum ? "alumni" : "none",
      });
    }
    return results;
  }

  async enrichPerson(input: RawLead): Promise<EnrichedLead> {
    // Fill any gaps with plausible mock data.
    const filler = generateMockLead();
    return {
      ...input,
      companyWebsite: input.companyWebsite || filler.companyWebsite,
      industry: input.industry || filler.industry,
      location: input.location || filler.location,
      companySize: input.companySize || filler.companySize,
      linkedinUrl: input.linkedinUrl || filler.linkedinUrl,
      seniority: input.seniority || filler.seniority,
      verifiedEmail:
        input.verifiedEmail ?? Boolean(input.email || input.workEmail),
    };
  }

  async bulkEnrich(leads: RawLead[]): Promise<EnrichedLead[]> {
    return Promise.all(leads.map((l) => this.enrichPerson(l)));
  }
}

// --- Real implementation (placeholder) -------------------------------------
class RealApolloProvider implements ApolloProvider {
  readonly name = "apollo:live";
  constructor(private apiKey: string) {}

  async searchPeople(_criteria: SourcingCriteria): Promise<RawLead[]> {
    // TODO: Integrate Apollo People Search API.
    //   POST https://api.apollo.io/v1/mixed_people/search
    //   headers: { "X-Api-Key": this.apiKey, "Content-Type": "application/json" }
    //   body: map SourcingCriteria -> { person_titles, organization_industry_tag_ids,
    //          person_locations, organization_num_employees_ranges, q_keywords, per_page }
    //   Then map the response `people[]` to RawLead[].
    throw new Error(
      "RealApolloProvider.searchPeople not implemented — see TODO. Falling back requires APOLLO_API_KEY removal."
    );
  }

  async enrichPerson(_input: RawLead): Promise<EnrichedLead> {
    // TODO: POST https://api.apollo.io/v1/people/match with name + company/domain.
    throw new Error("RealApolloProvider.enrichPerson not implemented — see TODO.");
  }

  async bulkEnrich(_leads: RawLead[]): Promise<EnrichedLead[]> {
    // TODO: POST https://api.apollo.io/v1/people/bulk_match
    throw new Error("RealApolloProvider.bulkEnrich not implemented — see TODO.");
  }
}

export function getApolloProvider(): ApolloProvider {
  const key = process.env.APOLLO_API_KEY?.trim();
  if (key) {
    // A real key is present. Today we still return mock to keep the app fully
    // functional; flip the import below once RealApolloProvider is implemented.
    // return new RealApolloProvider(key);
    void RealApolloProvider;
    return new MockApolloProvider();
  }
  return new MockApolloProvider();
}

export function apolloStatus(): { configured: boolean; mode: string } {
  const configured = Boolean(process.env.APOLLO_API_KEY?.trim());
  return { configured, mode: configured ? "key present (mock active)" : "mock" };
}
