import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// openFDA — open FDA API. The device registration endpoint lists medical-device
// manufacturers by device name; great for medtech targeting. Company-level
// (FDA-registered manufacturer + state). No email — enrich.

function tc(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface FdaResult {
  registration?: { name?: string; us_state?: string; iso_country_code?: string };
  products?: { openfda?: { device_name?: string } }[];
}

export const openFdaConnector: SourceConnector = {
  key: "openfda",
  label: "openFDA (Medical Device)",
  description:
    "FDA-registered medical device manufacturers for your keyword, via the open openFDA API. Company-level targets with state, strong for medtech. No key. No email — enrich.",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) return { leads: [], note: "Add a device keyword (e.g. insulin, catheter, imaging)." };
    const limit = Math.max(1, Math.min(criteria.limit || 10, 100));

    const phrase = terms.join(" ");
    const search = `products.openfda.device_name:"${phrase}"`;
    const url = `https://api.fda.gov/device/registrationlisting.json?search=${encodeURIComponent(search)}&limit=${Math.min(limit * 2, 100)}`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 404) return { leads: [], note: `No FDA-registered manufacturers found for "${phrase}".` };
    if (!res.ok) throw new Error(`openFDA ${res.status}`);
    const data = (await res.json()) as { results?: FdaResult[] };
    const results = data.results ?? [];

    const leads: RawLead[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (leads.length >= limit) break;
      const name = r.registration?.name;
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const state = r.registration?.us_state;
      const location = state || r.registration?.iso_country_code || undefined;
      if (criteria.location && location && !criteria.location.toUpperCase().includes(location.toUpperCase())) continue;
      const device = r.products?.[0]?.openfda?.device_name;

      leads.push({
        companyName: tc(name),
        industry: "Medical Devices",
        location,
        source: "openfda",
        verifiedEmail: false,
        warmConnectionNotes: `Source: openFDA — FDA-registered medical device manufacturer${device ? ` (device: ${device})` : ""}. Company-level — enrich for contacts. No email.`,
      });
    }

    const note = leads.length === 0 ? `No manufacturers matched "${phrase}".` : undefined;
    return { leads, note };
  },
};
