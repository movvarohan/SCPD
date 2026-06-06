import type { Lead } from "@prisma/client";
import type { AutoSendConfig } from "@/lib/services/settings";
import { bestEmailOf } from "@/lib/utils";

// Decide whether a freshly generated draft should be auto-sent (vs. routed to
// the Review Queue). Returns a clear reason either way for the audit trail.
export function autoSendDecision(
  lead: Lead,
  warnings: string[],
  cfg: AutoSendConfig
): { send: boolean; reason: string } {
  if (!cfg.enabled) return { send: false, reason: "auto-send is off" };

  if (!bestEmailOf(lead)) return { send: false, reason: "no email address" };
  if (cfg.requireVerifiedEmail && !lead.verifiedEmail)
    return { send: false, reason: "email not verified" };
  if (cfg.skipIfWarnings && warnings.length > 0)
    return { send: false, reason: "draft has missing-data warnings" };
  if ((lead.score ?? 0) < cfg.minScore)
    return { send: false, reason: `score ${lead.score} below minimum ${cfg.minScore}` };

  if (cfg.industries.length) {
    const ind = (lead.industry ?? "").toLowerCase();
    if (!cfg.industries.some((i) => ind.includes(i.toLowerCase())))
      return { send: false, reason: "industry not in rule" };
  }
  if (cfg.companySizes.length) {
    if (!cfg.companySizes.includes(lead.companySize ?? ""))
      return { send: false, reason: "company size not in rule" };
  }
  if (cfg.seniorities.length) {
    if (!cfg.seniorities.includes(lead.seniority ?? ""))
      return { send: false, reason: "role/seniority not in rule" };
  }

  return { send: true, reason: "matched auto-send rule" };
}
