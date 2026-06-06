import { db } from "@/lib/db";
import { encodeJson } from "@/lib/serialization";
import { buildDedupeIndex, dedupeLeads } from "@/lib/services/dedupe";
import { scoreLead } from "@/lib/services/scoring";
import { getRuleWeights } from "@/server/actions/scoring";
import type { RawLead } from "@/lib/types";

export interface PersistResult {
  found: number;
  imported: number;
  duplicates: number;
}

// Shared pipeline used by Apollo sourcing AND public-source connectors:
// dedupe against the DB + within the batch, score, then persist.
export async function persistRawLeads(
  leads: RawLead[],
  opts: { defaultStatus?: string } = {}
): Promise<PersistResult> {
  const existing = await db.lead.findMany({
    select: {
      email: true, workEmail: true, personalEmail: true, linkedinUrl: true,
      fullName: true, firstName: true, lastName: true, companyName: true,
    },
  });
  const index = buildDedupeIndex(existing);
  const { unique, duplicates } = dedupeLeads(leads, index);

  const weights = await getRuleWeights();
  for (const lead of unique) {
    const breakdown = scoreLead(lead as never, weights);
    await db.lead.create({
      data: {
        firstName: lead.firstName ?? null,
        lastName: lead.lastName ?? null,
        fullName: lead.fullName ?? null,
        email: lead.email ?? null,
        personalEmail: lead.personalEmail ?? null,
        workEmail: lead.workEmail ?? null,
        linkedinUrl: lead.linkedinUrl ?? null,
        title: lead.title ?? null,
        seniority: lead.seniority ?? null,
        companyName: lead.companyName ?? null,
        companyWebsite: lead.companyWebsite ?? null,
        industry: lead.industry ?? null,
        location: lead.location ?? null,
        companySize: lead.companySize ?? null,
        source: lead.source ?? "manual",
        isStanfordAlum: lead.isStanfordAlum ?? false,
        isSCAlum: lead.isSCAlum ?? false,
        isFormerClient: lead.isFormerClient ?? false,
        warmConnectionType: lead.warmConnectionType ?? "none",
        warmConnectionNotes: lead.warmConnectionNotes ?? "",
        verifiedEmail: lead.verifiedEmail ?? false,
        status: opts.defaultStatus ?? "sourced",
        score: breakdown.total,
        priority: breakdown.priority,
        scoreBreakdownJson: encodeJson(breakdown),
      },
    });
  }

  return { found: leads.length, imported: unique.length, duplicates: duplicates.length };
}
