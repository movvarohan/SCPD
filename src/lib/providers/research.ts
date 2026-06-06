import { getIntegrations } from "@/lib/credentials";

// ---------------------------------------------------------------------------
// Public-presence research provider
// ---------------------------------------------------------------------------
// Gathers PUBLIC, self-published signals about a lead/company — never LinkedIn
// (ToS / anti-bot). Two sources:
//   1. The company's own website (keyless HTTP fetch).
//   2. An optional web search for recent news/funding (Tavily — TAVILY_API_KEY).
// The raw text is handed to the LLM, which is instructed to use ONLY what was
// fetched and to cite sources, so personalization stays grounded and checkable.

export interface ResearchSource {
  url: string;
  title: string;
}

// Strip a fetched HTML page down to readable text.
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Fetch a page's visible text (best-effort, capped). Ignores TLS errors are not
// possible with fetch; sandbox proxies usually still allow these GETs.
export async function fetchPageText(url: string, maxChars = 4000): Promise<string | null> {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SCSourcingBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) return null;
    const html = await res.text();
    const text = htmlToText(html);
    return text ? text.slice(0, maxChars) : null;
  } catch {
    return null;
  }
}

export interface SearchHit {
  title: string;
  url: string;
  content: string;
}

// Web search via Tavily when configured; returns [] otherwise.
export async function webSearch(query: string, max = 4): Promise<SearchHit[]> {
  const { tavilyApiKey } = await getIntegrations();
  if (!tavilyApiKey.trim()) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyApiKey.trim(),
        query,
        max_results: max,
        search_depth: "basic",
        include_answer: false,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
    return (data.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: (r.content ?? "").slice(0, 600),
    }));
  } catch {
    return [];
  }
}

export async function researchStatus(): Promise<{ search: boolean; mode: string }> {
  const { tavilyApiKey } = await getIntegrations();
  return tavilyApiKey.trim()
    ? { search: true, mode: "website + web search (Tavily)" }
    : { search: false, mode: "company website only (add TAVILY_API_KEY for news/funding)" };
}
