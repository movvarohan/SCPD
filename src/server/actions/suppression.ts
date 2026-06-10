"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, can } from "@/lib/auth";
import { suppressEmail, unsuppressEmail } from "@/lib/services/suppression";
import { normalizeEmail } from "@/lib/utils";

// Anyone on the team can ADD to the do-not-contact list (an opt-out fielded by
// a PD must take effect immediately); only admins can remove from it.

export async function addSuppression(email: string, reason: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }
  await suppressEmail(normalized, "manual", reason || "Added manually", user.name);
  revalidatePath("/settings");
  return { ok: true, message: `${normalized} will never be contacted.` };
}

export async function removeSuppression(email: string) {
  const user = await getCurrentUser();
  if (!can(user, "manage_team")) {
    return { ok: false, message: "Only admins can remove an address from the do-not-contact list." };
  }
  const removed = await unsuppressEmail(email, user?.name);
  revalidatePath("/settings");
  return removed
    ? { ok: true, message: `${email} removed — they can be contacted again.` }
    : { ok: false, message: "Address not found on the list." };
}
