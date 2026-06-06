import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// NIH RePORTER — open API over NIH-funded research projects. Surfaces research
// organizations (universities, hospitals, biotechs) AND their named principal
// investigators, with location and a funding signal. Great for biotech /
// healthtech / research verticals. No email — enrich.

function tc(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface NihPI { full_name?: string; first_name?: string; last_name?: string }
interface NihResult {
  organization?: { org_name?: string; org_city?: string; org_state?: string };
  principal_investigators?: NihPI[];
  project_title?: string;
  agency_ic_admin?: { name?: string };
}

export const nihReporterConnector: SourceConnector = {
  key: "nih_reporter",
  label: "NIH RePORTER (Research)",
  description:
    "NIH-funded research orgs (universities, hospitals, biotechs) and their named principal investigators, via the open NIH RePORTER API. Funding signal + location. Strong for biotech/healthtech. No email — enrich.",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) return { leads: [], note: "Add a research keyword (e.g. oncology, machine learning)." };
    const limit = Math.max(1, Math.min(criteria.limit || 10, 100));

    const body = {
      criteria: {
        advanced_text_search: {
          operator: "and",
          search_field: "projecttitle,terms,abstracttext",
          search_text: terms.join(" "),
        },
      },
      limit: Math.min(limit * 2, 100),
      offset: 0,
      sort_field: "project_start_date",
      sort_order: "desc",
    };

    const res = await fetch("https://api.reporter.nih.gov/v2/projects/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`NIH RePORTER ${res.status}`);
    const data = (await res.json()) as { results?: NihResult[] };
    const results = data.results ?? [];

    const leads: RawLead[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (leads.length >= limit) break;
      const org = r.organization?.org_name ? tc(r.organization.org_name) : undefined;
      const location = [r.organization?.org_city ? tc(r.organization.org_city) : "", r.organization?.org_state]
        .filter(Boolean).join(", ") || undefined;
      if (criteria.location && location && !location.toLowerCase().includes(criteria.location.toLowerCase())) continue;

      const pi = r.principal_investigators?.[0];
      const note = `Source: NIH RePORTER — NIH-funded research${r.project_title ? ` ("${r.project_title.slice(0, 80)}")` : ""}. Funder: ${r.agency_ic_admin?.name ?? "NIH"}. No email — enrich.`;

      if (pi && (pi.first_name || pi.last_name || pi.full_name)) {
        const first = pi.first_name ? tc(pi.first_name) : undefined;
        const last = pi.last_name ? tc(pi.last_name) : undefined;
        const full = pi.full_name ? tc(pi.full_name) : [first, last].filter(Boolean).join(" ");
        const key = `${full}|${org}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        leads.push({
          firstName: first, lastName: last, fullName: full,
          title: "Principal Investigator", seniority: "other",
          companyName: org, industry: "Research / Life Sciences", location,
          source: "nih_reporter", verifiedEmail: false, warmConnectionNotes: note,
        });
      } else if (org) {
        if (seen.has(org.toLowerCase())) continue;
        seen.add(org.toLowerCase());
        leads.push({
          companyName: org, industry: "Research / Life Sciences", location,
          source: "nih_reporter", verifiedEmail: false, warmConnectionNotes: note,
        });
      }
    }

    const note = leads.length === 0 ? "No NIH-funded projects matched." : undefined;
    return { leads, note };
  },
};
