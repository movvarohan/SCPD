import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// USAspending.gov — fully open federal spending API (no key). Surfaces
// companies winning federal contracts/grants for a topic: real organizations
// with a clear budget signal and location. Company-level; enrich for contacts.

const STATE_NAMES: Record<string, string> = {
  AL: "AL", AK: "AK", AZ: "AZ", AR: "AR", CA: "CA", CO: "CO", CT: "CT", DE: "DE",
  FL: "FL", GA: "GA", HI: "HI", ID: "ID", IL: "IL", IN: "IN", IA: "IA", KS: "KS",
  KY: "KY", LA: "LA", ME: "ME", MD: "MD", MA: "MA", MI: "MI", MN: "MN", MS: "MS",
  MO: "MO", MT: "MT", NE: "NE", NV: "NV", NH: "NH", NJ: "NJ", NM: "NM", NY: "NY",
  NC: "NC", ND: "ND", OH: "OH", OK: "OK", OR: "OR", PA: "PA", RI: "RI", SC: "SC",
  SD: "SD", TN: "TN", TX: "TX", UT: "UT", VT: "VT", VA: "VA", WA: "WA", WV: "WV",
  WI: "WI", WY: "WY", DC: "DC",
};

function tc(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmtMoney(n?: number): string {
  if (!n || n <= 0) return "n/a";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

interface AwardRow {
  "Recipient Name"?: string;
  "Award Amount"?: number;
  "Place of Performance State Code"?: string;
  "Awarding Agency"?: string;
}

export const usaSpendingConnector: SourceConnector = {
  key: "usaspending",
  label: "USAspending (Federal $)",
  description:
    "Companies winning federal contracts & grants for your topic, via the open USAspending.gov API. Strong budget signal + location. No key, runs anywhere. Company-level — enrich for contacts. No email.",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) return { leads: [], note: "Add a keyword to search federal awards." };
    const limit = Math.max(1, Math.min(criteria.limit || 10, 50));

    const body = {
      filters: {
        keywords: terms,
        award_type_codes: ["A", "B", "C", "D"], // contracts
      },
      fields: [
        "Recipient Name", "Award Amount", "Place of Performance State Code", "Awarding Agency",
      ],
      page: 1,
      limit: Math.min(limit * 2, 100),
      sort: "Award Amount",
      order: "desc",
    };

    const res = await fetch("https://api.usaspending.gov/api/v2/search/spending_by_award/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`USAspending ${res.status}`);
    const data = (await res.json()) as { results?: AwardRow[] };
    const rows = data.results ?? [];

    const leads: RawLead[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      if (leads.length >= limit) break;
      const name = r["Recipient Name"];
      if (!name || name.toUpperCase() === "MULTIPLE RECIPIENTS") continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const state = r["Place of Performance State Code"];
      const location = state && STATE_NAMES[state] ? state : undefined;
      if (criteria.location && location && !criteria.location.toUpperCase().includes(location)) continue;

      leads.push({
        companyName: tc(name),
        location,
        source: "usaspending",
        verifiedEmail: false,
        warmConnectionNotes:
          `Source: USAspending.gov — federal award recipient for "${terms.join(", ")}". ` +
          `Award ~${fmtMoney(r["Award Amount"])} from ${r["Awarding Agency"] ?? "a federal agency"}. ` +
          `Company-level — enrich for named contacts. No email.`,
      });
    }

    const note = leads.length === 0 ? "No federal award recipients matched." : undefined;
    return { leads, note };
  },
};
