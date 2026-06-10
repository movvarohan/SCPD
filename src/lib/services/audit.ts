import { db } from "@/lib/db";

// Workspace audit trail. Fire-and-forget: auditing must never break the
// action being audited.
export async function audit(
  action: string,
  detail: string,
  actor?: { id?: string | null; name?: string | null } | null
): Promise<void> {
  try {
    await db.auditEvent.create({
      data: {
        action,
        detail: detail.slice(0, 500),
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? null,
      },
    });
  } catch {
    // swallow — observability should not take down the operation
  }
}
