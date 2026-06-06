"use server";

import { revalidatePath } from "next/cache";
import { getConnector } from "@/lib/sources/registry";
import { persistRawLeads } from "@/lib/services/persistLeads";
import type { SourceCriteria } from "@/lib/sources/types";

export interface ConnectorResult {
  ok: boolean;
  connector: string;
  found: number;
  imported: number;
  duplicates: number;
  note?: string;
  error?: string;
}

export async function runConnector(
  key: string,
  criteria: SourceCriteria
): Promise<ConnectorResult> {
  const connector = getConnector(key);
  if (!connector) return { ok: false, connector: key, found: 0, imported: 0, duplicates: 0, error: "Unknown connector." };

  let leads;
  let note: string | undefined;
  try {
    const res = await connector.search(criteria);
    leads = res.leads;
    note = res.note;
  } catch (err) {
    return {
      ok: false, connector: connector.label, found: 0, imported: 0, duplicates: 0,
      error: (err as Error).message.slice(0, 240),
    };
  }

  const persisted = await persistRawLeads(leads, { defaultStatus: "sourced" });

  revalidatePath("/leads");
  revalidatePath("/source");
  revalidatePath("/");

  return {
    ok: true,
    connector: connector.label,
    found: persisted.found,
    imported: persisted.imported,
    duplicates: persisted.duplicates,
    note,
  };
}
