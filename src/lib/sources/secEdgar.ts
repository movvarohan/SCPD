import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// SEC requires a descriptive User-Agent with contact info, and rate-limits to
// ~10 requests/sec. We stay well under that with small delays.
const UA = "Stanford Consulting Sourcing Engine (contact@stanfordconsulting.org)";
const HEADERS = { "User-Agent": UA, Accept: "application/json" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`SEC ${res.status} ${url}`);
  return res.json();
}
async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`SEC ${res.status} ${url}`);
  return res.text();
}

// --- helpers ---------------------------------------------------------------

// "TESLA MOTORS INC  (TSLA)  (CIK 0001318605)" -> { name, cik }
function parseDisplayName(s: string): { name: string; cik: string } | null {
  const cikMatch = s.match(/\(CIK (\d+)\)/);
  if (!cikMatch) return null;
  const name = s.split("  (")[0].trim();
  return { name: titleCaseCompany(name), cik: cikMatch[1] };
}

function titleCaseCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Inc|Llc|Lp|Plc|Corp|Co|Ltd)\b/g, (m) => m.toUpperCase());
}

// SEC person names are "LAST FIRST MIDDLE" in caps. Best-effort split.
function parsePersonName(raw: string): { first?: string; last?: string; full: string } {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const tc = cleaned
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const parts = tc.split(" ");
  if (parts.length < 2) return { full: tc };
  const last = parts[0];
  const rest = parts.slice(1);
  const first = rest[0];
  return { first, last, full: `${rest.join(" ")} ${last}` };
}

function seniorityFromTitle(title: string, isDirector: boolean): string {
  const t = title.toLowerCase();
  if (/chief|ceo|cfo|coo|cto|chairman|president|founder/.test(t)) return "c_suite";
  if (/vice president|vp\b/.test(t)) return "vp";
  if (/director of|head of/.test(t)) return "director";
  if (isDirector) return "director"; // board member
  if (/manager/.test(t)) return "manager";
  return "other";
}

// Pull the most recent Form 4 reporting owner (an officer/director) for a CIK.
async function latestOfficer(
  cik: string,
  filings: { form: string[]; accessionNumber: string[]; primaryDocument: string[]; filingDate: string[] }
): Promise<{ name: string; title: string; isDirector: boolean; date: string } | null> {
  const idx = filings.form.findIndex((f) => f === "4");
  if (idx === -1) return null;
  const accession = filings.accessionNumber[idx].replace(/-/g, "");
  let doc = filings.primaryDocument[idx];
  // primaryDocument is the XSL viewer path (e.g. "xslF345X06/form4.xml"); the
  // raw XML is the basename in the same accession folder.
  if (doc.includes("/")) doc = doc.split("/").pop() as string;
  const cikNum = String(Number(cik));
  const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accession}/${doc}`;
  try {
    const xml = await getText(url);
    const name = xml.match(/<rptOwnerName>([^<]+)<\/rptOwnerName>/)?.[1]?.trim();
    if (!name) return null;
    const title = xml.match(/<officerTitle>([^<]*)<\/officerTitle>/)?.[1]?.trim() ?? "";
    const isDirector = /<isDirector>\s*(1|true)\s*<\/isDirector>/i.test(xml);
    const isOfficer = /<isOfficer>\s*(1|true)\s*<\/isOfficer>/i.test(xml);
    if (!title && !isDirector && !isOfficer) return null;
    return { name, title, isDirector, date: filings.filingDate[idx] };
  } catch {
    return null;
  }
}

interface Submissions {
  name?: string;
  sicDescription?: string;
  addresses?: { business?: { city?: string; stateOrCountry?: string } };
  filings?: { recent?: { form: string[]; accessionNumber: string[]; primaryDocument: string[]; filingDate: string[] } };
}

export const secEdgarConnector: SourceConnector = {
  key: "sec_edgar",
  label: "SEC EDGAR",
  description:
    "Official SEC full-text search. Finds public companies whose filings match your keywords, then pulls a named executive (officer/director) from their latest Form 4. Free, official API, no email (enrich separately).",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) {
      return { leads: [], note: "Add at least one keyword or industry to search SEC filings." };
    }
    const limit = Math.max(1, Math.min(criteria.limit || 10, 50));

    // 1) Full-text search of 10-K filings for the keywords -> candidate companies.
    const q = terms.length === 1 ? terms[0] : `"${terms.join(" ")}"`;
    const ftsUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(q)}&forms=10-K`;
    const fts = (await getJson(ftsUrl)) as { hits?: { hits?: { _source?: { display_names?: string[] } }[] } };
    const hits = fts.hits?.hits ?? [];

    // Unique companies by CIK, in relevance order.
    const seen = new Set<string>();
    const companies: { name: string; cik: string }[] = [];
    for (const h of hits) {
      const dn = h._source?.display_names?.[0];
      if (!dn) continue;
      const parsed = parseDisplayName(dn);
      if (!parsed || seen.has(parsed.cik)) continue;
      seen.add(parsed.cik);
      companies.push(parsed);
      if (companies.length >= limit * 2) break; // headroom for industry/location filtering
    }

    // 2) Enrich each company via submissions + latest Form 4 officer.
    const leads: RawLead[] = [];
    let scanned = 0;
    for (const co of companies) {
      if (leads.length >= limit) break;
      scanned++;
      await sleep(120); // be polite to SEC
      let sub: Submissions;
      try {
        sub = (await getJson(
          `https://data.sec.gov/submissions/CIK${co.cik.padStart(10, "0")}.json`
        )) as Submissions;
      } catch {
        continue;
      }

      const industry = sub.sicDescription || undefined;
      const biz = sub.addresses?.business;
      const location = [biz?.city, biz?.stateOrCountry].filter(Boolean).join(", ") || undefined;

      // Optional client-side filters.
      if (criteria.industries.length && industry) {
        const ok = criteria.industries.some((i) => industry.toLowerCase().includes(i.toLowerCase()));
        if (!ok) continue;
      }
      if (criteria.location && location) {
        if (!location.toLowerCase().includes(criteria.location.toLowerCase())) continue;
      }

      const recent = sub.filings?.recent;
      let officer = null as Awaited<ReturnType<typeof latestOfficer>>;
      if (recent) {
        await sleep(120);
        officer = await latestOfficer(co.cik, recent);
      }

      const note = `Source: SEC EDGAR — 10-K full-text match for "${terms.join(", ")}".`;
      if (officer) {
        const nm = parsePersonName(officer.name);
        leads.push({
          firstName: nm.first,
          lastName: nm.last,
          fullName: nm.full,
          title: officer.title || (officer.isDirector ? "Board Director" : undefined),
          seniority: seniorityFromTitle(officer.title, officer.isDirector),
          companyName: sub.name || co.name,
          industry,
          location,
          source: "sec_edgar",
          verifiedEmail: false,
          warmConnectionNotes: `${note} Officer per Form 4 filed ${officer.date}. Email not provided by SEC — enrich via Apollo/Clay.`,
        });
      } else {
        // Company-level lead (no named person yet) — still a real target.
        leads.push({
          companyName: sub.name || co.name,
          industry,
          location,
          source: "sec_edgar",
          verifiedEmail: false,
          warmConnectionNotes: `${note} No recent Form 4 officer found — company-level target. Enrich for contacts.`,
        });
      }
    }

    const note =
      leads.length === 0
        ? `Searched ${scanned} SEC filers but none matched your industry/location filters.`
        : undefined;
    return { leads, note };
  },
};
