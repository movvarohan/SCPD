"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { encodeJson } from "@/lib/serialization";
import {
  mapRowToLead,
  validateLead,
  type InternalFieldKey,
} from "@/lib/services/csv";
import { buildDedupeIndex, dedupeLeads } from "@/lib/services/dedupe";
import { scoreLead } from "@/lib/services/scoring";
import { getRuleWeights } from "./scoring";
import type { RawLead } from "@/lib/types";

export interface ImportPayload {
  rows: Record<string, string>[];
  mapping: Record<string, InternalFieldKey | "">;
  type: "alumni" | "generic";
  filename: string;
}

export interface ImportResult {
  ok: boolean;
  rowCount: number;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  duplicateSamples: { name: string; reason: string }[];
}

export async function importLeads(payload: ImportPayload): Promise<ImportResult> {
  const { rows, mapping, type, filename } = payload;
  const source = type === "alumni" ? "csv_alumni" : "csv_generic";

  // Map + validate.
  const mapped: RawLead[] = [];
  let errorCount = 0;
  for (const row of rows) {
    const lead = mapRowToLead(row, mapping, source);
    if (type === "alumni") {
      // Alumni imports are tagged as SC alumni + warm connection by default.
      lead.isStanfordAlum = true;
      lead.isSCAlum = true;
      if (lead.warmConnectionType === undefined || lead.warmConnectionType === "none") {
        lead.warmConnectionType = "alumni";
      }
    }
    const errors = validateLead(lead);
    if (errors.length) {
      errorCount++;
      continue;
    }
    mapped.push(lead);
  }

  // Dedupe against existing DB rows + within the batch.
  const existing = await db.lead.findMany({
    select: {
      email: true, workEmail: true, personalEmail: true, linkedinUrl: true,
      fullName: true, firstName: true, lastName: true, companyName: true,
    },
  });
  const index = buildDedupeIndex(existing);
  const { unique, duplicates } = dedupeLeads(mapped, index);

  // Score + persist unique leads.
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
        source,
        isStanfordAlum: lead.isStanfordAlum ?? false,
        isSCAlum: lead.isSCAlum ?? false,
        isFormerClient: lead.isFormerClient ?? false,
        warmConnectionType: lead.warmConnectionType ?? "none",
        warmConnectionNotes: lead.warmConnectionNotes ?? "",
        verifiedEmail: lead.verifiedEmail ?? false,
        status: "sourced",
        score: breakdown.total,
        priority: breakdown.priority,
        scoreBreakdownJson: encodeJson(breakdown),
      },
    });
  }

  await db.importJob.create({
    data: {
      type,
      filename,
      rowCount: rows.length,
      importedCount: unique.length,
      duplicateCount: duplicates.length,
      errorCount,
      status: "completed",
    },
  });

  revalidatePath("/leads");
  revalidatePath("/import");
  revalidatePath("/");

  return {
    ok: true,
    rowCount: rows.length,
    importedCount: unique.length,
    duplicateCount: duplicates.length,
    errorCount,
    duplicateSamples: duplicates.slice(0, 10).map((d) => ({
      name:
        d.lead.fullName ||
        [d.lead.firstName, d.lead.lastName].filter(Boolean).join(" ") ||
        d.lead.email ||
        "Unknown",
      reason: d.reason,
    })),
  };
}
