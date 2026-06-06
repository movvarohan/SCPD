import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// Generic directory / event-page scraper (Playwright). Point it at any public
// page that lists organizations — a conference exhibitor/sponsor list, an
// accelerator cohort page, a "portfolio" page, an association member roster —
// and it extracts the outbound org links as company-level leads.
//
// This is the "any of the other 40 lakes" tool: instead of one connector per
// site, you bring the URL. Heuristic by nature; review the imported leads.

const NAV_DENY = /^(home|about|about us|contact|contact us|login|log in|sign in|sign up|register|privacy|terms|cookie|menu|search|blog|news|careers|jobs|faq|support|help|subscribe|newsletter|donate|more|read more|learn more|view all|see all|back|next|previous|share|tweet|facebook|twitter|linkedin|instagram|youtube)$/i;

function hostnameOf(href: string): string | null {
  try { return new URL(href).hostname.replace(/^www\./, ""); } catch { return null; }
}

export const genericDirectoryConnector: SourceConnector = {
  key: "generic_directory",
  label: "Directory / Event Scraper",
  description:
    "Bring any public list page — conference exhibitors/sponsors, accelerator cohort, association roster, portfolio page — and this extracts the linked organizations as leads. Playwright; best on your own machine. Heuristic; review results.",
  worksInSandbox: false,
  kind: "scraper",
  needsUrl: true,

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const target = (criteria.url || "").trim();
    if (!target || !/^https?:\/\//.test(target)) {
      return { leads: [], note: "Enter a full target URL (https://…) for this scraper." };
    }
    const limit = Math.max(1, Math.min(criteria.limit || 20, 100));
    const kw = [...criteria.keywords, ...criteria.industries].map((s) => s.toLowerCase()).filter(Boolean);

    let chromium;
    try {
      ({ chromium } = await import("playwright"));
    } catch {
      return { leads: [], note: "Playwright isn't installed. Run `npm i playwright && npx playwright install chromium`." };
    }

    const browser = await chromium.launch({ args: ["--no-sandbox", "--ignore-certificate-errors"] });
    try {
      const ctx = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      });
      const page = await ctx.newPage();
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(2500);
      // Scroll a few times in case the list lazy-loads.
      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(900);
      }

      const pageHost = hostnameOf(target);
      const raw: { text: string; href: string }[] = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("a[href]"))
          .map((a) => ({
            text: (a as HTMLElement).innerText.trim().replace(/\s+/g, " "),
            href: (a as HTMLAnchorElement).href,
          }))
          .filter((x) => x.text && x.href.startsWith("http"));
      });

      // Keep outbound links (likely company sites) with sensible anchor text.
      const seen = new Set<string>();
      const leads: RawLead[] = [];
      for (const item of raw) {
        if (leads.length >= limit) break;
        const host = hostnameOf(item.href);
        if (!host || host === pageHost) continue; // skip internal nav
        if (item.text.length < 2 || item.text.length > 60) continue;
        if (NAV_DENY.test(item.text)) continue;
        if (/^https?:\/\//i.test(item.text)) continue; // raw URL as text
        if (kw.length) {
          const hay = `${item.text} ${host}`.toLowerCase();
          if (!kw.some((k) => hay.includes(k))) continue;
        }
        const key = host.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        leads.push({
          companyName: item.text,
          companyWebsite: `https://${host}`,
          source: "generic_directory",
          verifiedEmail: false,
          warmConnectionNotes: `Source: scraped directory ${target}. Linked org "${item.text}" (${host}). Review + enrich for contacts. No email.`,
        });
      }

      const note = leads.length === 0
        ? "No outbound organization links found on that page. Try a page that lists companies as links (exhibitors, sponsors, portfolio, members)."
        : `Extracted ${leads.length} linked organizations from ${pageHost}. Heuristic — review before outreach.`;
      return { leads, note };
    } finally {
      await browser.close().catch(() => {});
    }
  },
};
