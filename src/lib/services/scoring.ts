import type { Lead } from "@prisma/client";
import {
  PRIORITY_THRESHOLDS,
  type ScoreBreakdown,
  type ScoreBreakdownItem,
} from "@/lib/types";

// Default scoring rules. These seed the ScoringRule table and are used as a
// fallback if the table is empty.
export const DEFAULT_SCORING_RULES = [
  { key: "stanford_sc_alum", label: "Stanford / SC alum", weight: 3 },
  { key: "warm_connection", label: "Warm connection available", weight: 3 },
  { key: "prior_client_referral", label: "Prior client / referral", weight: 3 },
  { key: "founder_csuite_vp", label: "Founder / C-suite / VP", weight: 2 },
  { key: "director_head", label: "Director / Head", weight: 1 },
  { key: "strong_industry_fit", label: "Strong industry fit", weight: 2 },
  { key: "company_needs_help", label: "Company likely needs strategy/GTM/product/ops help", weight: 2 },
  { key: "company_size_fit", label: "Company size fit", weight: 1 },
  { key: "verified_email", label: "Verified email", weight: 1 },
  { key: "funding_growth_signal", label: "Recent funding / growth / hiring signal", weight: 2 },
  { key: "location_fit", label: "Location fit", weight: 1 },
];

export type RuleWeights = Record<string, { weight: number; enabled: boolean; label: string }>;

// Industries SC commonly serves well — used for the "strong industry fit" rule.
const STRONG_FIT_INDUSTRIES = [
  "fintech", "saas", "ai", "ml", "healthtech", "biotech", "climate",
  "energy", "retail", "ecommerce", "e-commerce", "logistics", "cybersecurity",
  "agtech", "marketplace", "consumer",
];

// Company sizes that are a good fit for SC engagements.
const GOOD_FIT_SIZES = ["11-50", "51-200", "201-500"];

function ruleEnabledWeight(
  weights: RuleWeights | undefined,
  key: string,
  fallback: number
): { weight: number; enabled: boolean; label: string } {
  const fallbackLabel =
    DEFAULT_SCORING_RULES.find((r) => r.key === key)?.label ?? key;
  if (weights && weights[key]) return weights[key];
  return { weight: fallback, enabled: true, label: fallbackLabel };
}

export function scoreLead(
  lead: Partial<Lead>,
  weights?: RuleWeights
): ScoreBreakdown {
  const items: ScoreBreakdownItem[] = [];
  let total = 0;

  const add = (
    key: string,
    fallbackWeight: number,
    applied: boolean,
    reason: string
  ) => {
    const rule = ruleEnabledWeight(weights, key, fallbackWeight);
    const effectiveApplied = applied && rule.enabled;
    if (effectiveApplied) total += rule.weight;
    items.push({
      key,
      label: rule.label,
      weight: rule.weight,
      applied: effectiveApplied,
      reason: applied
        ? rule.enabled
          ? reason
          : `${reason} (rule disabled)`
        : "Not applicable",
    });
  };

  // Alumni
  const isAlum = Boolean(lead.isStanfordAlum || lead.isSCAlum);
  add(
    "stanford_sc_alum",
    3,
    isAlum,
    lead.isSCAlum ? "SC alum" : "Stanford alum"
  );

  // Warm connection
  const hasWarm =
    Boolean(lead.warmConnectionType && lead.warmConnectionType !== "none") ||
    isAlum;
  add(
    "warm_connection",
    3,
    hasWarm,
    `Warm connection: ${lead.warmConnectionType || (isAlum ? "alumni" : "none")}`
  );

  // Prior client / referral
  add(
    "prior_client_referral",
    3,
    Boolean(lead.isFormerClient) || lead.warmConnectionType === "prior_client",
    "Former client or referral"
  );

  // Seniority
  const seniority = lead.seniority ?? "";
  add(
    "founder_csuite_vp",
    2,
    ["founder", "c_suite", "vp"].includes(seniority),
    `Senior decision-maker (${seniority || "n/a"})`
  );
  add(
    "director_head",
    1,
    ["director", "head"].includes(seniority),
    `Director / Head level (${seniority || "n/a"})`
  );

  // Industry fit
  const industry = (lead.industry ?? "").toLowerCase();
  const industryFit = STRONG_FIT_INDUSTRIES.some((i) => industry.includes(i));
  add(
    "strong_industry_fit",
    2,
    industryFit,
    `Industry "${lead.industry}" is a strong SC fit`
  );

  // Company likely needs help — heuristic: growth-stage size + a strategy-ish industry.
  const size = lead.companySize ?? "";
  const needsHelp = GOOD_FIT_SIZES.includes(size) || industryFit;
  add(
    "company_needs_help",
    2,
    needsHelp,
    "Growth-stage company likely to need strategy/GTM/product/ops support"
  );

  // Company size fit
  add(
    "company_size_fit",
    1,
    GOOD_FIT_SIZES.includes(size),
    `Company size ${size || "n/a"} fits SC engagement profile`
  );

  // Verified email
  add(
    "verified_email",
    1,
    Boolean(lead.verifiedEmail),
    "Email verified"
  );

  // Funding / growth signal — inferred from warm notes for the MVP; the field
  // lives on Company for richer signals.
  const notes = (lead.warmConnectionNotes ?? "").toLowerCase();
  const fundingSignal =
    notes.includes("funding") ||
    notes.includes("series") ||
    notes.includes("hiring") ||
    notes.includes("growth");
  add(
    "funding_growth_signal",
    2,
    fundingSignal,
    "Recent funding / growth / hiring signal detected"
  );

  // Location fit — US-based default.
  const location = (lead.location ?? "").toLowerCase();
  const locationFit =
    location.includes("ca") ||
    location.includes("san francisco") ||
    location.includes("palo alto") ||
    location.includes("ny") ||
    location.includes("usa") ||
    location.includes("united states") ||
    /,\s*[a-z]{2}$/.test(location);
  add("location_fit", 1, locationFit, `Location "${lead.location}" is in target geography`);

  const priority: ScoreBreakdown["priority"] =
    total >= PRIORITY_THRESHOLDS.high
      ? "High"
      : total >= PRIORITY_THRESHOLDS.medium
        ? "Medium"
        : "Low";

  return { total, priority, items };
}
