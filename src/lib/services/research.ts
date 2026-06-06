import type { Lead } from "@prisma/client";
import { getLLMProvider, llmIsLive } from "@/lib/providers/llm";
import {
  fetchPageText, webSearch, type ResearchSource,
} from "@/lib/providers/research";
import { domainFromWebsite } from "@/lib/services/enrich";
import { fullNameOf } from "@/lib/utils";

export interface ResearchResult {
  summary: string;
  signals: string[];
  hook: string; // one specific, truthful sentence to reference in outreach
  sources: ResearchSource[];
  groundedBy: "llm" | "heuristic" | "none";
  at: string;
}

const RESEARCH_SYSTEM = `You are a research assistant for Stanford Consulting. You extract ONLY grounded, public facts about a company from the text provided to you (its own website and public news snippets). Rules: use ONLY the provided text; never invent funding, clients, metrics, or relationships; if the text is thin, return fewer signals; prefer concrete specifics (what they build, who they serve, recent launches/scale) over fluff. Return strictly valid JSON.`;

// Run grounded research on a lead using public sources only (never LinkedIn).
export async function researchLead(lead: Lead): Promise<ResearchResult> {
  const sources: ResearchSource[] = [];
  let corpus = "";

  // 1) Company website (keyless).
  const domain = domainFromWebsite(lead.companyWebsite) ||
    (lead.companyWebsite ? null : null);
  const siteUrl = lead.companyWebsite || (domain ? `https://${domain}` : null);
  if (siteUrl) {
    const text = await fetchPageText(siteUrl);
    if (text) {
      corpus += `COMPANY WEBSITE (${siteUrl}):\n${text}\n\n`;
      sources.push({ url: siteUrl, title: `${lead.companyName ?? "Company"} — website` });
      // Try an /about page too for a richer summary.
      const aboutText = await fetchPageText(`${siteUrl.replace(/\/$/, "")}/about`);
      if (aboutText && aboutText.length > 200) {
        corpus += `ABOUT PAGE:\n${aboutText}\n\n`;
      }
    }
  }

  // 2) Optional web search for recent public news (Tavily).
  if (lead.companyName) {
    const hits = await webSearch(`${lead.companyName} company news funding product`, 4);
    for (const h of hits) {
      if (!h.url) continue;
      corpus += `NEWS (${h.url}): ${h.title}. ${h.content}\n\n`;
      sources.push({ url: h.url, title: h.title || h.url });
    }
  }

  const at = new Date().toISOString();

  if (!corpus.trim()) {
    return {
      summary: "No public web text could be fetched for this lead (no company website on file, or the site blocked the request).",
      signals: [],
      hook: "",
      sources,
      groundedBy: "none",
      at,
    };
  }

  // Ground with the LLM if available.
  if (await llmIsLive()) {
    try {
      const llm = await getLLMProvider();
      const userPrompt = `Lead: ${fullNameOf(lead)}${lead.title ? `, ${lead.title}` : ""} at ${lead.companyName ?? "their company"}.

Below is public text gathered from the company's own website and public news. Extract grounded research for outreach.

${corpus.slice(0, 9000)}

Return STRICT JSON:
{
  "summary": string,        // 1-2 sentences on what the company does, from the text only
  "signals": string[],      // up to 3 concrete, grounded facts (launches, scale, focus). [] if thin.
  "hook": string            // ONE specific, truthful sentence a student could reference when reaching out (no flattery, no invented facts). "" if nothing solid.
}`;
      const raw = await llm.complete(
        [
          { role: "system", content: RESEARCH_SYSTEM },
          { role: "user", content: userPrompt },
        ],
        { json: true }
      );
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned) as { summary?: string; signals?: string[]; hook?: string };
      return {
        summary: parsed.summary?.trim() || "",
        signals: Array.isArray(parsed.signals) ? parsed.signals.filter(Boolean).slice(0, 3) : [],
        hook: parsed.hook?.trim() || "",
        sources,
        groundedBy: "llm",
        at,
      };
    } catch {
      // fall through to heuristic
    }
  }

  // Heuristic fallback (no LLM): use the opening of the website text.
  const first = corpus.replace(/^COMPANY WEBSITE[^\n]*\n/i, "").slice(0, 240).trim();
  return {
    summary: first ? `${first}…` : "",
    signals: [],
    hook: "",
    sources,
    groundedBy: "heuristic",
    at,
  };
}
