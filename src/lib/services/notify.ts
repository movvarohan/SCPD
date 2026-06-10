import type { Lead } from "@prisma/client";
import { getIntegrations } from "@/lib/credentials";
import { fullNameOf } from "@/lib/utils";

// Best-effort outbound notification when a call is booked. Posts a simple
// { text } payload, which Slack and Discord incoming webhooks both accept (as
// do most generic endpoints). Never throws — a notification must not block or
// fail a status change.
export async function notifyBookedCall(lead: Lead): Promise<void> {
  try {
    const { bookedWebhookUrl } = await getIntegrations();
    const url = bookedWebhookUrl.trim();
    if (!url) return;

    const name = fullNameOf(lead);
    const company = lead.companyName ? ` at ${lead.companyName}` : "";
    const role = lead.title ? ` (${lead.title})` : "";
    const text =
      `📞 Call booked — ${name}${role}${company}. ` +
      `Priority ${lead.priority ?? "—"}, score ${lead.score ?? 0}.`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Swallow — notifications are advisory only.
  }
}
