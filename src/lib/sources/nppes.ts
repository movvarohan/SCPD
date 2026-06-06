import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// NPPES NPI Registry — the federal database of every US healthcare provider
// (the "licensing board" play from the lead-gen playbook, nationwide + open).
// Search by specialty (taxonomy) + location; get clinics (orgs) and individual
// practitioners with verified specialty + address. No email — enrich.

function tc(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface NppesResult {
  enumeration_type?: string; // "NPI-1" individual | "NPI-2" org
  basic?: { first_name?: string; last_name?: string; organization_name?: string; credential?: string };
  taxonomies?: { desc?: string; primary?: boolean }[];
  addresses?: { address_purpose?: string; city?: string; state?: string }[];
}

export const nppesConnector: SourceConnector = {
  key: "nppes",
  label: "NPPES Healthcare Registry",
  description:
    "Every US healthcare provider, via the federal NPI Registry (open API). Search by specialty + location to get clinics and individual practitioners with verified specialty and address — the 'licensing board' source. No email; enrich for contacts.",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) return { leads: [], note: "Add a specialty keyword (e.g. Dermatology, Cardiology)." };
    const limit = Math.max(1, Math.min(criteria.limit || 10, 100));

    const params = new URLSearchParams({
      version: "2.1",
      taxonomy_description: terms[0],
      limit: String(Math.min(limit * 2, 200)),
    });
    // Location: 2-letter -> state, otherwise city.
    const loc = criteria.location.trim();
    if (loc) {
      if (/^[A-Za-z]{2}$/.test(loc)) params.set("state", loc.toUpperCase());
      else params.set("city", loc);
    }

    const res = await fetch(`https://npiregistry.cms.hhs.gov/api/?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`NPPES ${res.status}`);
    const data = (await res.json()) as { results?: NppesResult[]; result_count?: number };
    const results = data.results ?? [];

    const leads: RawLead[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (leads.length >= limit) break;
      const tax = r.taxonomies?.find((t) => t.primary)?.desc || r.taxonomies?.[0]?.desc;
      const addr = r.addresses?.find((a) => a.address_purpose === "LOCATION") || r.addresses?.[0];
      const location = [addr?.city ? tc(addr.city) : "", addr?.state].filter(Boolean).join(", ") || undefined;
      const industry = tax ? `Healthcare — ${tax}` : "Healthcare";
      const b = r.basic ?? {};

      if (r.enumeration_type === "NPI-2" && b.organization_name) {
        const name = tc(b.organization_name);
        if (seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        leads.push({
          companyName: name, industry, location, source: "nppes", verifiedEmail: false,
          warmConnectionNotes: `Source: NPPES NPI Registry — healthcare organization. Specialty: ${tax ?? "n/a"}. No email — enrich for an administrator/owner contact.`,
        });
      } else if (b.first_name || b.last_name) {
        const full = `${tc(b.first_name ?? "")} ${tc(b.last_name ?? "")}`.trim();
        const key = `${full}|${location}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        leads.push({
          firstName: b.first_name ? tc(b.first_name) : undefined,
          lastName: b.last_name ? tc(b.last_name) : undefined,
          fullName: full,
          title: [b.credential, tax].filter(Boolean).join(", ") || "Practitioner",
          seniority: "other",
          industry, location, source: "nppes", verifiedEmail: false,
          warmConnectionNotes: `Source: NPPES NPI Registry — licensed practitioner. Specialty: ${tax ?? "n/a"}.${b.credential ? ` Credential: ${b.credential}.` : ""} No email — enrich.`,
        });
      }
    }

    const note = leads.length === 0
      ? "No providers matched. Try a recognized specialty (e.g. Dermatology, Cardiology, Dentist)."
      : undefined;
    return { leads, note };
  },
};
