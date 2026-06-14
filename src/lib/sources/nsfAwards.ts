import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// NSF Awards — open API over National Science Foundation grants. Surfaces the
// awardee organization (often a deep-tech small business for SBIR/STTR awards,
// or a research institution) AND the named Principal Investigator — frequently
// the founder/CTO — with a location, a funding signal, and a research abstract
// that makes an excellent, specific personalization hook. NSF publishes the
// PI's contact email, so unlike most public sources these leads often arrive
// already emailable (still marked unverified — verify before sending).
// Keyless, free, official: https://www.research.gov/common/webapi/awardapisearch-v1.htm

function tc(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function looksLikeCompany(name: string): boolean {
  // Heuristic only (used to label, never to drop): academic awardees usually
  // contain these tokens; companies tend to end in Inc/LLC/Corp/etc.
  return /\b(inc|llc|corp|co|ltd|technolog|labs?|systems|robotics|bio|ai|software|solutions)\b/i.test(name)
    && !/\b(university|college|regents|institute of technology|school|foundation|hospital)\b/i.test(name);
}

interface NsfAward {
  id?: string;
  title?: string;
  awardeeName?: string;
  awardeeCity?: string;
  awardeeStateCode?: string;
  piFirstName?: string;
  piLastName?: string;
  pdPIName?: string;
  piEmail?: string;
  fundProgramName?: string;
  fundsObligatedAmt?: string;
  startDate?: string;
}

export const nsfAwardsConnector: SourceConnector = {
  key: "nsf_awards",
  label: "NSF Awards (Deep-Tech R&D)",
  description:
    "NSF-funded organizations — deep-tech startups (SBIR/STTR) and research institutions — and their named Principal Investigators (often the founder/CTO), via the open NSF Awards API. Includes a research abstract hook and frequently a real PI email. Strong for AI, robotics, climate/energy, and hard-tech. Keyless & free.",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) {
      return { leads: [], note: "Add a keyword (e.g. robotics, climate, machine learning, SBIR)." };
    }
    const limit = Math.max(1, Math.min(criteria.limit || 10, 50));

    const params = new URLSearchParams({
      keyword: terms.join(" "),
      rpp: String(Math.min(Math.max(limit, 10), 25)), // NSF caps results-per-page at 25
      offset: "1",
      printFields: [
        "id", "title", "awardeeName", "awardeeCity", "awardeeStateCode",
        "piFirstName", "piLastName", "pdPIName", "piEmail",
        "fundProgramName", "fundsObligatedAmt", "startDate",
      ].join(","),
    });

    const res = await fetch(`https://api.nsf.gov/services/v1/awards.json?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`NSF Awards ${res.status}`);
    const data = (await res.json()) as { response?: { award?: NsfAward[] } };
    const awards = data.response?.award ?? [];

    const candidates: { lead: RawLead; isCompany: boolean }[] = [];
    const seen = new Set<string>();
    for (const a of awards) {
      const org = a.awardeeName ? tc(a.awardeeName) : undefined;
      const location = [a.awardeeCity ? tc(a.awardeeCity) : "", a.awardeeStateCode]
        .filter(Boolean).join(", ") || undefined;
      if (criteria.location && location && !location.toLowerCase().includes(criteria.location.toLowerCase())) continue;

      const first = a.piFirstName ? tc(a.piFirstName) : undefined;
      const last = a.piLastName ? tc(a.piLastName) : undefined;
      const full = [first, last].filter(Boolean).join(" ") || (a.pdPIName ? tc(a.pdPIName) : undefined);
      if (!full && !org) continue;
      const email = a.piEmail?.trim().toLowerCase() || undefined;

      // Dedupe on the strongest identifier available.
      const dedupeKey = (email || `${full}|${org}` || org || a.id || "").toLowerCase();
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const isCompany = org ? looksLikeCompany(org) : false;
      const funding = a.fundsObligatedAmt ? ` ($${Number(a.fundsObligatedAmt).toLocaleString()} obligated)` : "";
      const note =
        `Source: NSF Awards — ${a.fundProgramName ? tc(a.fundProgramName) : "NSF grant"}${funding}` +
        `${a.title ? `. Award: "${a.title.slice(0, 90)}"` : ""}` +
        `${email ? ". PI email from NSF (unverified)." : ". No email — enrich."}`;

      candidates.push({
        isCompany,
        lead: {
          firstName: first,
          lastName: last,
          fullName: full,
          email,
          title: full ? "Principal Investigator" : undefined,
          seniority: "other",
          companyName: org,
          industry: isCompany ? "Deep Tech / R&D" : "Research / Academia",
          location,
          source: "nsf_awards",
          verifiedEmail: false,
          warmConnectionNotes: note,
        },
      });
    }

    // Surface company awardees (SBIR/STTR small businesses — the real client
    // targets) ahead of academic ones, then trim to the requested count.
    candidates.sort((x, y) => Number(y.isCompany) - Number(x.isCompany));
    const leads = candidates.slice(0, limit).map((c) => c.lead);

    const companies = candidates.filter((c) => c.isCompany).length;
    const note = leads.length === 0
      ? "No NSF awards matched those keywords."
      : companies === 0
        ? "Matched NSF awards are research institutions (no companies this time). Add a keyword like “SBIR” or a product term to surface funded startups."
        : undefined;
    return { leads, note };
  },
};
