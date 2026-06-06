import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// GLEIF — the Global Legal Entity Identifier registry (open, no key). The open
// analog of a business registry: every LEI-registered legal entity with its
// official legal name, jurisdiction, and registered HQ address. Name-based
// lookup — great for confirming a corporate entity and its registered office.

function tc(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface LeiRecord {
  attributes?: {
    entity?: {
      legalName?: { name?: string };
      jurisdiction?: string;
      status?: string;
      legalAddress?: { city?: string; region?: string; country?: string };
      headquartersAddress?: { city?: string; region?: string; country?: string };
    };
  };
}

export const gleifConnector: SourceConnector = {
  key: "gleif",
  label: "Company Registry (GLEIF)",
  description:
    "Global legal-entity registry (GLEIF, open API) — the open analog of a business registry. Look up registered companies by name to get the official legal name, jurisdiction, and HQ. Name-based; company-level; no email.",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) return { leads: [], note: "Enter a company name to look up in the registry." };
    const limit = Math.max(1, Math.min(criteria.limit || 10, 50));
    const q = terms.join(" ");

    const url = `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(q)}&page[size]=${Math.min(limit * 2, 100)}`;
    const res = await fetch(url, { headers: { Accept: "application/vnd.api+json" } });
    if (!res.ok) throw new Error(`GLEIF ${res.status}`);
    const data = (await res.json()) as { data?: LeiRecord[] };
    const records = data.data ?? [];

    const leads: RawLead[] = [];
    const seen = new Set<string>();
    for (const r of records) {
      if (leads.length >= limit) break;
      const e = r.attributes?.entity;
      const name = e?.legalName?.name;
      if (!name) continue;
      const addr = e?.headquartersAddress || e?.legalAddress;
      const location = [addr?.city ? tc(addr.city) : "", addr?.region, addr?.country]
        .filter(Boolean).join(", ") || undefined;
      const key = `${name}|${location}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (criteria.location && location && !location.toLowerCase().includes(criteria.location.toLowerCase())) continue;

      leads.push({
        companyName: tc(name),
        location,
        source: "gleif",
        verifiedEmail: false,
        warmConnectionNotes: `Source: GLEIF legal-entity registry. Jurisdiction: ${e?.jurisdiction ?? "n/a"}. Registration status: ${e?.status ?? "n/a"}. Company-level — enrich for contacts. No email.`,
      });
    }

    const note = leads.length === 0 ? `No registered entities matched "${q}".` : undefined;
    return { leads, note };
  },
};
