import { PageHeader } from "@/components/page-header";
import { TrackingTable } from "@/components/tracking-table";
import { db } from "@/lib/db";
import { emailStatus } from "@/lib/providers/email";
import { fullNameOf, bestEmailOf } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PIPELINE_STATUSES = [
  "approved", "ready_to_send", "sent", "follow_up_1_sent",
  "follow_up_2_sent", "replied", "booked", "not_interested", "no_response",
];

export default async function TrackingPage() {
  const leads = await db.lead.findMany({
    where: { status: { in: PIPELINE_STATUSES } },
    orderBy: { updatedAt: "desc" },
    include: { assignedPD: true, drafts: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  const email = await emailStatus();

  return (
    <div>
      <PageHeader
        title="Sending & Outreach Tracking"
        description="Move leads through the outbound pipeline. Update statuses as emails are sent, replied to, and calls are booked."
      />
      <TrackingTable
        emailMode={email.mode}
        emailLive={email.configured}
        rows={leads.map((l) => ({
          id: l.id,
          name: fullNameOf(l),
          company: l.companyName,
          email: bestEmailOf(l),
          status: l.status,
          draftStatus: l.drafts[0]?.status ?? null,
          draftId: l.drafts[0]?.id ?? null,
          assignedPD: l.assignedPD?.name ?? null,
        }))}
      />
    </div>
  );
}
