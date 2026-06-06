import type { RawLead } from "@/lib/types";

// Criteria a public-source connector accepts. Connectors interpret these
// best-effort against whatever the source actually supports.
export interface SourceCriteria {
  keywords: string[];
  industries: string[];
  location: string;
  limit: number;
  // Used by URL-driven connectors (e.g. the generic directory scraper).
  url?: string;
}

// A pluggable public-data lead source (SEC EDGAR, IRS 990, directories, …).
// Each connector returns RawLeads that flow into the same dedupe → score →
// enrich → draft → review pipeline as Apollo/Clay/CSV.
export interface SourceConnector {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  // Official APIs work from anywhere (incl. this sandbox); scrapers may need
  // a real machine / proxies.
  readonly worksInSandbox: boolean;
  // Free, official API vs. scraping — surfaced in the UI.
  readonly kind: "official_api" | "scraper";
  // When true, the UI shows a target-URL input (e.g. a conference page).
  readonly needsUrl?: boolean;
  search(criteria: SourceCriteria): Promise<{ leads: RawLead[]; note?: string }>;
}
