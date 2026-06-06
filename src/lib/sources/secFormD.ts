import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// SEC Form D = a private securities offering (a company raising capital).
// These filings name the issuer AND its executives/directors, which makes them
// a high-intent source: companies that just raised money and the humans behind
// them. Official SEC full-text search + the structured primary_doc.xml.

const UA = "Stanford Consulting Sourcing Engine (contact@stanfordconsulting.org)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`SEC ${res.status}`);
  return res.json();
}
async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`SEC ${res.status}`);
  return res.text();
}

function tc(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmtMoney(s?: string): string {
  const n = Number(s);
  if (!n || n <= 0) return "n/a";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}
function seniorityFromRelationship(rel: string): string {
  const r = rel.toLowerCase();
  if (/executive officer/.test(r)) return "c_suite";
  if (/director/.test(r)) return "director";
  return "other";
}

interface Hit { _id?: string; _source?: { display_names?: string[]; ciks?: string[]; file_date?: string } }

export const secFormDConnector: SourceConnector = {
  key: "sec_formd",
  label: "SEC Form D (Recent Raises)",
  description:
    "Companies that just raised private capital, via SEC Form D filings. Returns the issuer + its named executives/directors, plus the offering size, industry, and HQ. Official API, high-intent. No email — enrich.",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) return { leads: [], note: "Add a keyword or industry to search Form D raises." };
    const limit = Math.max(1, Math.min(criteria.limit || 10, 50));

    const q = terms.length === 1 ? terms[0] : `"${terms.join(" ")}"`;
    const fts = (await getJson(
      `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(q)}&forms=D`
    )) as { hits?: { hits?: Hit[] } };
    const hits = fts.hits?.hits ?? [];

    const leads: RawLead[] = [];
    const seenCompanies = new Set<string>();
    let scanned = 0;

    for (const h of hits) {
      if (leads.length >= limit) break;
      const cik = h._source?.ciks?.[0];
      const accession = h._id?.split(":")[0]?.replace(/-/g, "");
      if (!cik || !accession) continue;
      scanned++;
      await sleep(120);

      let xml: string;
      try {
        xml = await getText(
          `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/primary_doc.xml`
        );
      } catch {
        continue;
      }

      const issuer = xml.match(/<entityName>([^<]+)<\/entityName>/)?.[1]?.trim();
      if (!issuer || seenCompanies.has(issuer)) continue;
      seenCompanies.add(issuer);

      const city = xml.match(/<city>([^<]+)<\/city>/)?.[1]?.trim();
      const state = xml.match(/<stateOrCountry>([^<]+)<\/stateOrCountry>/)?.[1]?.trim();
      const location = [city ? tc(city) : "", state].filter(Boolean).join(", ") || undefined;
      const industry = xml.match(/<industryGroupType>([^<]+)<\/industryGroupType>/)?.[1]?.trim();

      // Skip VC/PE funds — SC consults for operating companies, not fund LPs.
      if (industry && /investment fund|pooled/i.test(industry)) continue;
      const offering = fmtMoney(xml.match(/<totalOfferingAmount>([^<]+)<\/totalOfferingAmount>/)?.[1]);
      const date = h._source?.file_date ?? "";

      // Filter by location/industry if requested.
      if (criteria.location && location && !location.toLowerCase().includes(criteria.location.toLowerCase())) continue;
      if (criteria.industries.length && industry) {
        const ok = criteria.industries.some((i) => industry.toLowerCase().includes(i.toLowerCase()));
        if (!ok) continue;
      }

      const note = `Source: SEC Form D — private raise filed ${date}. Offering size ${offering}. Industry: ${industry ?? "n/a"}. No email — enrich.`;

      // Related persons = executives/directors/promoters. Cap per company so a
      // single filing with many officers doesn't crowd out other companies.
      const blocks = xml.match(/<relatedPersonInfo>[\s\S]*?<\/relatedPersonInfo>/g) ?? [];
      let added = false;
      let perCompany = 0;
      for (const b of blocks) {
        if (leads.length >= limit || perCompany >= 2) break;
        const first = b.match(/<firstName>([^<]*)<\/firstName>/)?.[1]?.trim();
        const last = b.match(/<lastName>([^<]*)<\/lastName>/)?.[1]?.trim();
        const rels = (b.match(/<relationship>([^<]+)<\/relationship>/g) ?? [])
          .map((r) => r.replace(/<\/?relationship>/g, "").trim());
        if (!first && !last) continue;
        const full = [first, last].filter((x): x is string => Boolean(x)).map(tc).join(" ");
        leads.push({
          firstName: first ? tc(first) : undefined,
          lastName: last ? tc(last) : undefined,
          fullName: full,
          title: rels.join(", ") || "Executive",
          seniority: seniorityFromRelationship(rels.join(" ")),
          companyName: issuer,
          industry,
          location,
          source: "sec_formd",
          verifiedEmail: false,
          warmConnectionNotes: note,
        });
        added = true;
        perCompany++;
      }
      if (!added) {
        leads.push({
          companyName: issuer, industry, location, source: "sec_formd",
          verifiedEmail: false, warmConnectionNotes: `${note} No named persons on filing.`,
        });
      }
    }

    const note = leads.length === 0 ? `Scanned ${scanned} Form D filings; none matched filters.` : undefined;
    return { leads, note };
  },
};
