import type { Lead, PDProfile, User } from "@prisma/client";
import { stringToList } from "@/lib/serialization";
import { FUNCTION_LABELS } from "@/lib/types";

export interface PDWithProfile extends User {
  pdProfile: PDProfile | null;
}

export interface AssignmentSuggestion {
  pd: PDWithProfile;
  score: number;
  reasons: string[];
}

const AVAILABILITY_SCORE: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
  unavailable: -5,
};

// Map a lead's likely functional needs from its industry/title for matching.
function inferLeadFunctions(lead: Lead): string[] {
  const text = `${lead.title ?? ""} ${lead.industry ?? ""}`.toLowerCase();
  const fns = new Set<string>();
  if (/ai|ml|machine learning|data/.test(text)) fns.add("ai");
  if (/market|growth|sales|gtm|revenue|partnership/.test(text)) fns.add("gtm");
  if (/product/.test(text)) fns.add("product");
  if (/ops|operation|supply|logistics/.test(text)) fns.add("operations");
  if (/engineer|technical|cto|platform|infra/.test(text)) fns.add("technical");
  if (/strategy|ceo|founder|chief|coo/.test(text)) fns.add("strategy");
  if (/research|insight|analyst/.test(text)) fns.add("market_research");
  // Default expectation: most leads benefit from strategy/gtm.
  if (fns.size === 0) {
    fns.add("strategy");
    fns.add("gtm");
  }
  return Array.from(fns);
}

export function recommendPDs(
  lead: Lead,
  pds: PDWithProfile[]
): AssignmentSuggestion[] {
  const leadIndustry = (lead.industry ?? "").toLowerCase();
  const leadFns = inferLeadFunctions(lead);

  const suggestions: AssignmentSuggestion[] = pds.map((pd) => {
    const profile = pd.pdProfile;
    const reasons: string[] = [];
    let score = 0;

    if (!profile) {
      return { pd, score: 0, reasons: ["No PD profile configured"] };
    }

    // Industry match
    const pdIndustries = stringToList(profile.industries).map((s) => s.toLowerCase());
    const industryMatch = pdIndustries.find(
      (i) => leadIndustry.includes(i) || i.includes(leadIndustry)
    );
    if (industryMatch && leadIndustry) {
      score += 4;
      reasons.push(`industry match (${lead.industry})`);
    }

    // Functional match
    const pdFns = stringToList(profile.functions);
    const fnMatches = pdFns.filter((f) => leadFns.includes(f));
    if (fnMatches.length) {
      score += 2 * fnMatches.length;
      reasons.push(
        `functional interest match (${fnMatches.map((f) => FUNCTION_LABELS[f] || f).join(", ")})`
      );
    }

    // Availability
    const avail = AVAILABILITY_SCORE[profile.availability] ?? 1;
    score += avail;
    reasons.push(`availability: ${profile.availability}`);

    // Load — fewer active leads scores higher.
    const load = profile.activeLeadCount ?? 0;
    score += Math.max(0, 3 - load * 0.5);
    reasons.push(`currently ${load} active assigned lead${load === 1 ? "" : "s"}`);

    // Warm connection ownership — if a PD already owns the relationship.
    if (lead.assignedPDId === pd.id) {
      score += 2;
      reasons.push("already owns this lead");
    }

    return { pd, score: Math.round(score * 10) / 10, reasons };
  });

  return suggestions.sort((a, b) => b.score - a.score);
}

// Build a human-readable explanation for the top recommendation.
export function explainRecommendation(
  lead: Lead,
  suggestion: AssignmentSuggestion
): string {
  const name = suggestion.pd.name;
  const reasonText = suggestion.reasons.join(", ");
  return `Recommended ${name} because ${reasonText}.`;
}
