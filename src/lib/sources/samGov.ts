import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";
import { getIntegrations } from "@/lib/credentials";

// SAM.gov Entity Management API — every entity registered to do business with
// the US federal government. Requires a free SAM.gov API key (set SAM_API_KEY
// or paste it in Settings). Without a key this connector returns a clear note.
//
// Get a key: https://sam.gov/content/api-keys (after a free login).

function tc(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SamEntity {
  entityRegistration?: { legalBusinessName?: string; registrationStatus?: string };
  coreData?: {
    physicalAddress?: { city?: string; stateOrProvinceCode?: string; countryCode?: string };
    businessTypes?: { businessTypeList?: { businessTypeDesc?: string }[] };
  };
}

export const samGovConnector: SourceConnector = {
  key: "sam_gov",
  label: "SAM.gov (Federal Registrants)",
  description:
    "Entities registered to do business with the US government, via the SAM.gov Entity API. Legal name + HQ + business type. Requires a free SAM_API_KEY (Settings or .env). No email — enrich.",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const { samApiKey } = await getIntegrations();
    if (!samApiKey.trim()) {
      return { leads: [], note: "SAM.gov needs a free API key. Add SAM_API_KEY in Settings → API keys, then re-run." };
    }
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) return { leads: [], note: "Add a keyword to search SAM.gov registrants." };
    const limit = Math.max(1, Math.min(criteria.limit || 10, 100));

    const params = new URLSearchParams({
      api_key: samApiKey.trim(),
      q: terms.join(" "),
      registrationStatus: "A",
      includeSections: "entityRegistration,coreData",
      page: "0",
      size: String(Math.min(limit, 100)),
    });
    if (criteria.location && /^[A-Za-z]{2}$/.test(criteria.location.trim())) {
      params.set("physicalAddressProvinceOrStateCode", criteria.location.trim().toUpperCase());
    }

    const res = await fetch(`https://api.sam.gov/entity-information/v3/entities?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text();
      return { leads: [], note: `SAM.gov error ${res.status}: ${text.slice(0, 160)}` };
    }
    const data = (await res.json()) as { entityData?: SamEntity[] };
    const entities = data.entityData ?? [];

    const leads: RawLead[] = [];
    const seen = new Set<string>();
    for (const e of entities) {
      if (leads.length >= limit) break;
      const name = e.entityRegistration?.legalBusinessName;
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      const addr = e.coreData?.physicalAddress;
      const location = [addr?.city ? tc(addr.city) : "", addr?.stateOrProvinceCode || addr?.countryCode]
        .filter(Boolean).join(", ") || undefined;
      const bt = e.coreData?.businessTypes?.businessTypeList?.[0]?.businessTypeDesc;
      leads.push({
        companyName: tc(name),
        industry: bt,
        location,
        source: "sam_gov",
        verifiedEmail: false,
        warmConnectionNotes: `Source: SAM.gov — registered federal vendor${bt ? ` (${bt})` : ""}. Company-level — enrich for contacts. No email.`,
      });
    }

    const note = leads.length === 0 ? "No SAM.gov registrants matched." : undefined;
    return { leads, note };
  },
};
