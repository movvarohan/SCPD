import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// Hacker News monthly "Ask HN: Who is hiring?" threads list companies actively
// hiring — a strong intent signal. We use the free HN Algolia Search API and
// keep only comments from hiring threads, then best-effort parse the company.
// Company-level + a website when present; enrich for named contacts.

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/").replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function firstUrl(html: string): string | undefined {
  const m = html.match(/href="([^"]+)"/);
  if (!m) return undefined;
  const u = m[1].replace(/&#x2F;/g, "/").replace(/&amp;/g, "&");
  return /^https?:\/\//.test(u) ? u : undefined;
}

// HN hiring posts usually start "Company | Location | Role | ...".
function parseCompany(text: string): string | undefined {
  let firstLine = text.split(/[|\n•—–]/)[0].trim();
  // Strip trailing bracketed/parenthesised URLs e.g. "FundApps [ http://… ]".
  firstLine = firstLine.replace(/\[[^\]]*\]/g, "").replace(/\((?:https?:)?[^)]*\)/g, "").trim();
  // Strip a trailing " - role/location" tail.
  firstLine = firstLine.split(/\s+-\s+/)[0].trim();
  if (firstLine.length < 2 || firstLine.length > 60) return undefined;
  // Reject prose openers.
  if (/^(we|i'm|i |our|the company|hi|hello|looking|hiring|come|join|apply|remote|onsite|location)\b/i.test(firstLine)) return undefined;
  if (/[.?!]$/.test(firstLine)) return undefined;
  if (!/[a-z]/i.test(firstLine)) return undefined;
  // Reject lines that are really a job title (a short phrase ending in a role
  // noun, e.g. "Software Engineer", "GPU Infrastructure Engineer").
  const words = firstLine.split(/\s+/);
  const endsInRole = /\b(engineers?|developers?|designers?|scientists?|architects?|programmers?|interns?|managers?|analysts?|specialists?|administrators?|recruiters?|leads?|consultants?|roles?|positions?)$/i.test(firstLine);
  if (endsInRole && words.length <= 5) return undefined;
  return firstLine.replace(/\s+/g, " ");
}

interface HnHit { comment_text?: string; story_title?: string; created_at?: string; objectID?: string }

export const hnHiringConnector: SourceConnector = {
  key: "hn_hiring",
  label: "HN Who's Hiring",
  description:
    "Companies actively hiring for your keyword, parsed from Hacker News 'Who is hiring' threads (free HN Algolia API). Strong intent signal. Best-effort company parse + website; company-level, enrich for contacts.",
  worksInSandbox: true,
  kind: "official_api",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    if (!terms.length) return { leads: [], note: "Add a keyword to search hiring posts." };
    const limit = Math.max(1, Math.min(criteria.limit || 10, 50));
    const q = terms.join(" ");

    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=comment&hitsPerPage=${Math.min(limit * 5, 200)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HN ${res.status}`);
    const data = (await res.json()) as { hits?: HnHit[] };
    const hits = data.hits ?? [];

    const leads: RawLead[] = [];
    const seen = new Set<string>();
    let scanned = 0;
    for (const h of hits) {
      if (leads.length >= limit) break;
      // Only consider comments from "Who is/'s hiring" threads.
      if (!/who'?s?\s+(is\s+)?hiring/i.test(h.story_title ?? "")) continue;
      if (!h.comment_text) continue;
      scanned++;

      const text = stripHtml(h.comment_text);
      const company = parseCompany(text);
      if (!company) continue;
      const key = company.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const website = firstUrl(h.comment_text);
      const month = (h.created_at ?? "").slice(0, 7);
      leads.push({
        companyName: company,
        companyWebsite: website,
        source: "hn_hiring",
        verifiedEmail: false,
        warmConnectionNotes:
          `Source: Hacker News "Who is hiring" (${month}). Actively hiring — intent signal. ` +
          `Post: "${text.slice(0, 160)}…" No email — enrich for named contacts.`,
      });
    }

    const note = leads.length === 0
      ? `Scanned ${scanned} hiring comments but couldn't confidently parse a company. Try a broader keyword.`
      : undefined;
    return { leads, note };
  },
};
