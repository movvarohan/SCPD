import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

const UA = "Stanford Consulting Sourcing Engine (contact@stanfordconsulting.org)";
const HEADERS = { "User-Agent": UA, Accept: "application/json" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// NTEE major-group letter -> readable category.
const NTEE_CATEGORIES: Record<string, string> = {
  A: "Arts & Culture", B: "Education", C: "Environment", D: "Animal-Related",
  E: "Health Care", F: "Mental Health", G: "Disease & Disorders", H: "Medical Research",
  I: "Crime & Legal", J: "Employment", K: "Food & Agriculture", L: "Housing",
  M: "Public Safety & Disaster", N: "Recreation & Sports", O: "Youth Development",
  P: "Human Services", Q: "International Affairs", R: "Civil Rights", S: "Community Improvement",
  T: "Philanthropy & Grantmaking", U: "Science & Technology", V: "Social Science",
  W: "Public & Societal Benefit", X: "Religion", Y: "Membership Benefit", Z: "Unknown",
};

function nteeIndustry(code?: string): string | undefined {
  if (!code) return "Nonprofit";
  const cat = NTEE_CATEGORIES[code[0]?.toUpperCase()];
  return cat ? `Nonprofit — ${cat}` : "Nonprofit";
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Decide whether a 990 "care of" value is a person (usable as a contact) vs an
// org/department name.
const ORGISH = /\b(inc|llc|lp|corp|co|center|centre|services|foundation|company|trust|bank|group|the|department|office|associates|partners|fund|society|council|committee|board|llp)\b/i;
function asPerson(careofname?: string | null): { first?: string; last?: string; full: string } | null {
  if (!careofname) return null;
  // IRS "care of" values are often prefixed with "% " or "C/O".
  const v = careofname.trim().replace(/^%\s*/, "").replace(/^c\/o\s*/i, "").trim();
  if (!v || v.length < 4) return null;
  if (ORGISH.test(v)) return null;
  const parts = v.split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return null;
  const tc = titleCase(v);
  const toks = tc.split(" ");
  return { first: toks[0], last: toks[toks.length - 1], full: tc };
}

interface SearchOrg { ein: number; name: string; city?: string; state?: string; ntee_code?: string }
interface OrgDetail {
  name?: string; city?: string; state?: string; ntee_code?: string;
  careofname?: string | null; revenue_amount?: number; income_amount?: number;
}

function fmtRevenue(n?: number): string {
  if (!n || n <= 0) return "n/a";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

export const irs990Connector: SourceConnector = {
  key: "irs_990",
  label: "IRS 990 (Nonprofits)",
  description:
    "ProPublica Nonprofit Explorer (official API over IRS Form 990 data). Finds US nonprofits matching your keywords with category (NTEE), location, and revenue. Org-level targets — enrich for contacts. No email.",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) return { leads: [], note: "Add at least one keyword to search nonprofits." };
    const limit = Math.max(1, Math.min(criteria.limit || 10, 50));
    const q = terms.join(" ");

    const searchUrl = `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(q)}`;
    const res = await fetch(searchUrl, { headers: HEADERS });
    if (!res.ok) throw new Error(`ProPublica search ${res.status}`);
    const data = (await res.json()) as { organizations?: SearchOrg[] };
    const orgs = data.organizations ?? [];

    const leads: RawLead[] = [];
    let scanned = 0;
    for (const org of orgs) {
      if (leads.length >= limit) break;
      scanned++;

      // Client-side location filter on the cheap search fields.
      const searchLoc = [org.city, org.state].filter(Boolean).join(", ");
      if (criteria.location && searchLoc && !searchLoc.toLowerCase().includes(criteria.location.toLowerCase())) {
        continue;
      }

      // Detail call for revenue + care-of contact.
      await sleep(120);
      let detail: OrgDetail = {};
      try {
        const dRes = await fetch(
          `https://projects.propublica.org/nonprofits/api/v2/organizations/${org.ein}.json`,
          { headers: HEADERS }
        );
        if (dRes.ok) detail = ((await dRes.json()) as { organization?: OrgDetail }).organization ?? {};
      } catch {
        /* best-effort */
      }

      const industry = nteeIndustry(detail.ntee_code || org.ntee_code);
      if (criteria.industries.length && industry) {
        const ok = criteria.industries.some((i) => industry.toLowerCase().includes(i.toLowerCase()));
        if (!ok) continue;
      }

      const location = [detail.city || org.city, detail.state || org.state].filter(Boolean).join(", ") || undefined;
      const revenue = fmtRevenue(detail.revenue_amount ?? detail.income_amount);
      const ein = String(org.ein).padStart(9, "0").replace(/^(\d{2})(\d{7})$/, "$1-$2");
      const note = `Source: IRS Form 990 via ProPublica. EIN ${ein}. Annual revenue ~${revenue}.`;

      const person = asPerson(detail.careofname);
      if (person) {
        leads.push({
          firstName: person.first, lastName: person.last, fullName: person.full,
          title: "Principal Officer / Contact",
          seniority: "c_suite",
          companyName: detail.name || org.name,
          industry, location, source: "irs_990", verifiedEmail: false,
          warmConnectionNotes: `${note} Contact from 990 "care of" field. No email — enrich via Apollo/Clay.`,
        });
      } else {
        leads.push({
          companyName: detail.name || org.name,
          industry, location, source: "irs_990", verifiedEmail: false,
          warmConnectionNotes: `${note} Org-level target — enrich for named contacts (990 officer XML is access-gated).`,
        });
      }
    }

    const note = leads.length === 0
      ? `Searched ${scanned} nonprofits but none matched your filters.`
      : undefined;
    return { leads, note };
  },
};
