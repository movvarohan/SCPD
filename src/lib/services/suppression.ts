import type { Lead, Suppression } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/utils";
import { audit } from "@/lib/services/audit";

// ---------------------------------------------------------------------------
// Do-not-contact registry
// ---------------------------------------------------------------------------
// The suppression list is the platform's hardest guarantee: once an address is
// on it, no send path will email it again — manual send, auto-send, Autopilot,
// or follow-ups — even if the person is re-imported as a brand-new lead.

export type SuppressionSource = "opt_out_reply" | "manual" | "bounce";

// Add one address. Idempotent: re-suppressing updates the reason.
export async function suppressEmail(
  email: string,
  source: SuppressionSource,
  reason: string,
  actorName?: string
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  await db.suppression.upsert({
    where: { email: normalized },
    create: { email: normalized, source, reason },
    update: { source, reason },
  });
  await audit(
    "suppression.added",
    `${normalized} added to do-not-contact (${source}${reason ? `: ${reason}` : ""})`,
    actorName ? { name: actorName } : undefined
  );
}

// Suppress every address attached to a lead (work, personal, primary).
export async function suppressLead(lead: Lead, source: SuppressionSource, reason: string): Promise<void> {
  for (const e of [lead.email, lead.workEmail, lead.personalEmail]) {
    if (e) await suppressEmail(e, source, reason);
  }
}

export async function unsuppressEmail(email: string, actorName?: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const res = await db.suppression.deleteMany({ where: { email: normalized } });
  if (res.count > 0) {
    await audit(
      "suppression.removed",
      `${normalized} removed from do-not-contact`,
      actorName ? { name: actorName } : undefined
    );
  }
  return res.count > 0;
}

// The final pre-send gate: is this exact address on the list?
export async function isSuppressed(email: string | null | undefined): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const hit = await db.suppression.findUnique({ where: { email: normalized } });
  return Boolean(hit);
}

// Batch check for sourcing/import flows: returns the suppressed subset.
export async function findSuppressed(emails: (string | null | undefined)[]): Promise<Set<string>> {
  const normalized = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
  if (!normalized.length) return new Set();
  const rows = await db.suppression.findMany({ where: { email: { in: normalized } } });
  return new Set(rows.map((r) => r.email));
}

export async function listSuppressions(): Promise<Suppression[]> {
  return db.suppression.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
}
