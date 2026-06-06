import type { RawLead } from "@/lib/types";
import type { SourceConnector, SourceCriteria } from "./types";

// Y Combinator startup directory scraper (Playwright). This is the "hard site"
// case from the lead-gen playbook: a JS-rendered, infinite-scroll directory.
// Founders aren't reliably selectable on the list, so we capture company +
// website + location + industry, then enrich for contacts/emails later.
//
// NOTE: Playwright + Chromium are heavy and Node-only. We dynamic-import inside
// search() so the app bundle never pulls them in, and declare playwright as a
// server external package in next.config.mjs. This connector runs best on your
// own machine; from inside a TLS-intercepting sandbox we ignore cert errors.

const SOCIAL_DENYLIST = [
  "ycombinator", "startupschool", "twitter.com", "x.com", "linkedin.com",
  "facebook.com", "instagram.com", "github.com", "youtube.com", "crunchbase.com",
  "bookface", "mailto:",
  // news/press domains that can appear before the real company site
  "wsj.com", "techcrunch.com", "bloomberg.com", "forbes.com", "reuters.com",
  "nytimes.com", "cnbc.com", "businessinsider.com", "medium.com", "substack.com",
];

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ycDirectoryConnector: SourceConnector = {
  key: "yc_directory",
  label: "Y Combinator Directory",
  description:
    "Scrapes the public YC startup directory (Playwright). Pulls company, website, HQ, and industry tags for startups matching your keywords — SC's sweet spot. Best run on your own machine. No email — enrich for contacts.",
  worksInSandbox: false,
  kind: "scraper",

  async search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }> {
    const terms = [...criteria.keywords, ...criteria.industries].filter(Boolean);
    const limit = Math.max(1, Math.min(criteria.limit || 10, 40));

    let chromium;
    try {
      ({ chromium } = await import("playwright"));
    } catch {
      return { leads: [], note: "Playwright isn't installed. Run `npm i playwright && npx playwright install chromium`." };
    }

    const browser = await chromium.launch({
      args: ["--no-sandbox", "--ignore-certificate-errors"],
    });
    try {
      const ctx = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      });
      const page = await ctx.newPage();

      const query = terms.join(" ");
      const url = `https://www.ycombinator.com/companies${query ? `?query=${encodeURIComponent(query)}` : ""}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      // Wait for the directory to hydrate (company names render client-side).
      await page.waitForSelector('[class*="_coName_"]', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // Infinite scroll until we have enough cards (or we stop making progress).
      let prev = 0;
      for (let i = 0; i < 10; i++) {
        const count = await page.evaluate(
          () => document.querySelectorAll('a[href^="/companies/"]').length
        );
        if (count >= limit + 5) break;
        if (count === prev && i > 1) break;
        prev = count;
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1500);
      }

      // Extract list cards. CSS-module class hashes change between builds, so we
      // match on the stable module-name substring (_coName_, _coLocation_).
      const cards: { name: string; href: string; location: string; tags: string[] }[] =
        await page.evaluate(() => {
          const links = Array.from(
            document.querySelectorAll('a[href^="/companies/"]')
          ).filter((a) => (a.getAttribute("href") || "").split("/").length === 3);
          const seen = new Set<string>();
          const out: { name: string; href: string; location: string; tags: string[] }[] = [];
          const batchRe = /^(winter|spring|summer|fall)\s+\d{4}$/i;
          for (const a of links) {
            const href = a.getAttribute("href") || "";
            if (seen.has(href)) continue;
            seen.add(href);
            const name = a.querySelector('[class*="_coName_"]')?.textContent?.trim() || "";
            const location = a.querySelector('[class*="_coLocation_"]')?.textContent?.trim() || "";
            // Pills render as separate lines in innerText: [name+loc, desc, BATCH, ...tags].
            // Tags are the lines after the batch line.
            const lines = (a as HTMLElement).innerText.split("\n").map((s) => s.trim()).filter(Boolean);
            const batchIdx = lines.findIndex((l) => batchRe.test(l));
            const tags = batchIdx >= 0 ? lines.slice(batchIdx + 1) : [];
            if (name) out.push({ name, href, location, tags });
          }
          return out;
        });

      const chosen = cards.slice(0, limit);
      const leads: RawLead[] = [];

      for (const c of chosen) {
        // Visit the detail page to grab the real company website.
        let website: string | undefined;
        let description: string | undefined;
        try {
          await page.goto(`https://www.ycombinator.com${c.href}`, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          await page.waitForTimeout(1800);
          const detail = await page.evaluate(
            ({ deny, coName }: { deny: string[]; coName: string }) => {
              const links = Array.from(document.querySelectorAll('a[href^="http"]'))
                .map((a) => (a as HTMLAnchorElement).href)
                .filter((h) => !deny.some((d) => h.toLowerCase().includes(d)));
              // Prefer a link whose domain matches the company name (e.g. brex.com),
              // which beats stray press links; else fall back to the first.
              const key = coName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
              const matching = key
                ? links.find((h) => {
                    try { return new URL(h).hostname.replace(/[^a-z0-9]/g, "").includes(key); }
                    catch { return false; }
                  })
                : undefined;
              const desc =
                document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
              return { site: matching || links[0], desc };
            },
            { deny: SOCIAL_DENYLIST, coName: c.name }
          );
          website = detail.site;
          description = detail.desc?.slice(0, 200);
        } catch {
          /* keep company-level */
        }

        // Industry = first tag after the batch line.
        const industryTag = c.tags[0];
        leads.push({
          companyName: c.name,
          companyWebsite: website,
          location: c.location || undefined,
          industry: industryTag ? titleCase(industryTag) : undefined,
          source: "yc_directory",
          verifiedEmail: false,
          warmConnectionNotes:
            `Source: Y Combinator directory.${description ? ` ${description}` : ""}` +
            ` Tags: ${c.tags.join(", ") || "n/a"}. No email — enrich via Apollo/Clay using the website domain.`,
        });
      }

      const note =
        leads.length === 0
          ? "No YC companies matched — try broader keywords."
          : undefined;
      return { leads, note };
    } finally {
      await browser.close().catch(() => {});
    }
  },
};
