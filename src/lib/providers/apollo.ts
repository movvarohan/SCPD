import type { SourcingCriteria, RawLead, EnrichedLead } from "@/lib/types";
import { generateMockLead } from "./mockData";
import { getIntegrations } from "@/lib/credentials";

// ---------------------------------------------------------------------------
// Apollo provider interface
// ---------------------------------------------------------------------------

export interface ApolloProvider {
  readonly name: string;
  searchPeople(criteria: SourcingCriteria): Promise<RawLead[]>;
  enrichPerson(input: RawLead): Promise<EnrichedLead>;
  bulkEnrich(leads: RawLead[]): Promise<EnrichedLead[]>;
}

// --- Mock implementation ---------------------------------------------------
// Without a paid Apollo key, the search API is unavailable. Rather than invent
// fake people (which would 404 on LinkedIn and waste outreach), we return
// nothing and tell the user how to get real leads. The 12 public-data
// connectors and CSV import remain fully available.
class MockApolloProvider implements ApolloProvider {
  readonly name = "apollo:mock";
  readonly note =
    "Apollo search needs a paid Apollo plan — no leads were sourced. Add a paid Apollo API key in Settings, or use a public-data connector (SEC, IRS 990, NPPES, Y Combinator, …) or a CSV import to add real leads.";

  async searchPeople(): Promise<RawLead[]> {
    return [];
  }

  async enrichPerson(input: RawLead): Promise<EnrichedLead> {
    const filler = generateMockLead();
    return {
      ...input,
      companyWebsite: input.companyWebsite || filler.companyWebsite,
      industry: input.industry || filler.industry,
      location: input.location || filler.location,
      companySize: input.companySize || filler.companySize,
      // Never inject a fabricated LinkedIn URL — keep only a real one the lead
      // already carries (e.g. from a CSV or a paid Apollo result).
      linkedinUrl: input.linkedinUrl,
      seniority: input.seniority || filler.seniority,
      verifiedEmail: input.verifiedEmail ?? Boolean(input.email || input.workEmail),
    };
  }

  async bulkEnrich(leads: RawLead[]): Promise<EnrichedLead[]> {
    return Promise.all(leads.map((l) => this.enrichPerson(l)));
  }
}

// --- Real implementation ---------------------------------------------------
const APOLLO_BASE = "https://api.apollo.io/api/v1";

// Map our company-size buckets to Apollo "min,max" range strings.
function sizeRange(size: string): string {
  const map: Record<string, string> = {
    "1-10": "1,10", "11-50": "11,50", "51-200": "51,200",
    "201-500": "201,500", "501-1000": "501,1000",
    "1001-5000": "1001,5000", "5000+": "5001,100000",
  };
  return map[size] ?? "";
}

// Map our seniority values to Apollo's person_seniorities vocabulary.
function seniorityValues(values: string[]): string[] {
  const map: Record<string, string> = {
    founder: "founder", c_suite: "c_suite", vp: "vp",
    director: "director", head: "head", manager: "manager", ic: "senior",
  };
  return values.map((v) => map[v]).filter(Boolean);
}

// Normalize an Apollo seniority back to ours.
function fromApolloSeniority(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const map: Record<string, string> = {
    owner: "founder", founder: "founder", c_suite: "c_suite", partner: "vp",
    vp: "vp", head: "head", director: "director", manager: "manager",
    senior: "ic", entry: "ic", intern: "ic",
  };
  return map[s] ?? "other";
}

interface ApolloPerson {
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  seniority?: string;
  email?: string;
  email_status?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  organization?: {
    name?: string;
    website_url?: string;
    industry?: string;
    estimated_num_employees?: number;
    primary_domain?: string;
  };
}

function looksLikeRealEmail(email?: string, status?: string): boolean {
  if (!email) return false;
  if (email.includes("email_not_unlocked")) return false;
  if (status && status !== "verified" && status !== "guessed") return false;
  return /@/.test(email);
}

function sizeBucket(n?: number): string | undefined {
  if (!n) return undefined;
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 500) return "201-500";
  if (n <= 1000) return "501-1000";
  if (n <= 5000) return "1001-5000";
  return "5000+";
}

function mapPerson(p: ApolloPerson): RawLead {
  const loc = [p.city, p.state, p.country].filter(Boolean).join(", ");
  const realEmail = looksLikeRealEmail(p.email, p.email_status);
  return {
    firstName: p.first_name,
    lastName: p.last_name,
    fullName: p.name || [p.first_name, p.last_name].filter(Boolean).join(" "),
    email: realEmail ? p.email : undefined,
    workEmail: realEmail ? p.email : undefined,
    linkedinUrl: p.linkedin_url,
    title: p.title,
    seniority: fromApolloSeniority(p.seniority),
    companyName: p.organization?.name,
    companyWebsite: p.organization?.website_url || (p.organization?.primary_domain ? `https://${p.organization.primary_domain}` : undefined),
    industry: p.organization?.industry,
    location: loc || undefined,
    companySize: sizeBucket(p.organization?.estimated_num_employees),
    source: "apollo",
    verifiedEmail: p.email_status === "verified",
  };
}

class RealApolloProvider implements ApolloProvider {
  readonly name = "apollo:live";
  // Set when a live search is unavailable (e.g. free-plan restriction) so the
  // UI can explain why no leads were sourced.
  public note: string | null = null;
  constructor(private apiKey: string) {}

  private async post(path: string, body: unknown) {
    const res = await fetch(`${APOLLO_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": this.apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apollo ${path} ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json();
  }

  async searchPeople(criteria: SourcingCriteria): Promise<RawLead[]> {
    const perPage = Math.min(criteria.limit || 10, 100);
    const body: Record<string, unknown> = {
      page: 1,
      per_page: perPage,
    };
    if (criteria.titles.length) body.person_titles = criteria.titles;
    const sen = seniorityValues(criteria.seniority);
    if (sen.length) body.person_seniorities = sen;
    if (criteria.location) body.person_locations = [criteria.location];
    const ranges = criteria.companySize.map(sizeRange).filter(Boolean);
    if (ranges.length) body.organization_num_employees_ranges = ranges;
    const keywords = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (keywords.length) body.q_keywords = keywords.join(" ");

    try {
      const data = await this.post("/mixed_people/search", body);
      const people: ApolloPerson[] = data.people || data.contacts || [];
      this.note = null;
      return people.slice(0, perPage).map(mapPerson);
    } catch (err) {
      // Free Apollo plans block the search API. We never fabricate people to
      // fill the gap — return nothing and explain how to get real leads.
      const msg = (err as Error).message;
      this.note = msg.includes("API_INACCESSIBLE") || msg.includes("free plan")
        ? "Apollo search requires a paid plan — no leads were sourced. Upgrade at app.apollo.io, or use a public-data connector or CSV import to add real leads."
        : `Apollo search failed (${msg.slice(0, 120)}) — no leads were sourced. Try a public-data connector or CSV import.`;
      return [];
    }
  }

  async enrichPerson(input: RawLead): Promise<EnrichedLead> {
    try {
      const domain = input.companyWebsite
        ? input.companyWebsite.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
        : undefined;
      const data = await this.post("/people/match", {
        first_name: input.firstName,
        last_name: input.lastName,
        name: input.fullName,
        organization_name: input.companyName,
        domain,
        linkedin_url: input.linkedinUrl,
        reveal_personal_emails: false,
      });
      const p: ApolloPerson | undefined = data.person;
      if (!p) return input;
      const mapped = mapPerson(p);
      // Merge: keep existing values, fill gaps, prefer revealed email.
      return {
        ...input,
        ...Object.fromEntries(Object.entries(mapped).filter(([, v]) => v)),
        email: mapped.email || input.email,
        verifiedEmail: mapped.verifiedEmail ?? input.verifiedEmail,
      };
    } catch {
      // Enrichment is best-effort — never fail the whole batch on one miss.
      return input;
    }
  }

  async bulkEnrich(leads: RawLead[]): Promise<EnrichedLead[]> {
    const out: EnrichedLead[] = [];
    for (const lead of leads) {
      // Only spend an enrichment credit when we don't already have an email.
      if (lead.email) out.push(lead);
      else out.push(await this.enrichPerson(lead));
    }
    return out;
  }
}

export async function getApolloProvider(): Promise<ApolloProvider> {
  const { apolloApiKey } = await getIntegrations();
  if (apolloApiKey.trim()) return new RealApolloProvider(apolloApiKey.trim());
  return new MockApolloProvider();
}

export async function apolloStatus(): Promise<{ configured: boolean; mode: string }> {
  const { apolloApiKey } = await getIntegrations();
  const configured = Boolean(apolloApiKey.trim());
  return { configured, mode: configured ? "live" : "mock" };
}
