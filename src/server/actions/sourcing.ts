"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { encodeJson } from "@/lib/serialization";
import { getApolloProvider } from "@/lib/providers/apollo";
import { getClayProvider } from "@/lib/providers/clay";
import { buildDedupeIndex, dedupeLeads } from "@/lib/services/dedupe";
import { scoreLead } from "@/lib/services/scoring";
import { getRuleWeights } from "./scoring";
import type { SourcingCriteria } from "@/lib/types";

export interface SourcingResult {
  ok: boolean;
  found: number;
  imported: number;
  duplicates: number;
  provider: string;
}

export async function sourceLeads(
  criteria: SourcingCriteria,
  options: { enrichWithClay: boolean }
): Promise<SourcingResult> {
  const apollo = getApolloProvider();
  let found = await apollo.searchPeople(criteria);

  // Enrich via Apollo (fills gaps).
  found = await apollo.bulkEnrich(found);

  // Optionally run the Clay workflow for extra enrichment + research notes.
  if (options.enrichWithClay) {
    const clay = getClayProvider();
    found = await clay.runWorkflow(found);
    for (const lead of found) {
      const notes = await clay.generateResearchNotes(lead);
      lead.warmConnectionNotes = [lead.warmConnectionNotes, notes]
        .filter(Boolean)
        .join(" | ");
    }
  }

  // Dedupe against existing.
  const existing = await db.lead.findMany({
    select: {
      email: true, workEmail: true, personalEmail: true, linkedinUrl: true,
      fullName: true, firstName: true, lastName: true, companyName: true,
    },
  });
  const index = buildDedupeIndex(existing);
  const { unique, duplicates } = dedupeLeads(found, index);

  const weights = await getRuleWeights();
  for (const lead of unique) {
    const breakdown = scoreLead(lead as never, weights);
    await db.lead.create({
      data: {
        firstName: lead.firstName ?? null,
        lastName: lead.lastName ?? null,
        fullName: lead.fullName ?? null,
        email: lead.email ?? null,
        workEmail: lead.workEmail ?? null,
        linkedinUrl: lead.linkedinUrl ?? null,
        title: lead.title ?? null,
        seniority: lead.seniority ?? null,
        companyName: lead.companyName ?? null,
        companyWebsite: lead.companyWebsite ?? null,
        industry: lead.industry ?? null,
        location: lead.location ?? null,
        companySize: lead.companySize ?? null,
        source: lead.source ?? "apollo",
        isStanfordAlum: lead.isStanfordAlum ?? false,
        isSCAlum: lead.isSCAlum ?? false,
        warmConnectionType: lead.warmConnectionType ?? "none",
        warmConnectionNotes: lead.warmConnectionNotes ?? "",
        verifiedEmail: lead.verifiedEmail ?? false,
        status: options.enrichWithClay ? "enriched" : "sourced",
        score: breakdown.total,
        priority: breakdown.priority,
        scoreBreakdownJson: encodeJson(breakdown),
      },
    });
  }

  revalidatePath("/leads");
  revalidatePath("/source");
  revalidatePath("/");

  return {
    ok: true,
    found: found.length,
    imported: unique.length,
    duplicates: duplicates.length,
    provider: apollo.name,
  };
}
