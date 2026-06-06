import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { decodeJson } from "@/lib/serialization";
import { scoreLead } from "@/lib/services/scoring";
import { LeadDetail } from "@/components/lead-detail";
import type { ScoreBreakdown } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      assignedPD: true,
      drafts: { orderBy: { createdAt: "desc" } },
      interactions: { orderBy: { date: "desc" }, include: { createdBy: true } },
    },
  });
  if (!lead) notFound();

  const breakdown =
    decodeJson<ScoreBreakdown | null>(lead.scoreBreakdownJson, null) ??
    scoreLead(lead);

  const research = decodeJson<{
    summary: string; signals: string[]; hook: string;
    sources: { url: string; title: string }[]; groundedBy: string; at: string;
  } | null>(lead.researchJson, null);

  return (
    <LeadDetail
      lead={{
        ...lead,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      }}
      breakdown={breakdown}
      research={research}
      assignedPDName={lead.assignedPD?.name ?? null}
      drafts={lead.drafts.map((d) => ({
        id: d.id, type: d.type, subject: d.subject, body: d.body,
        followUp1: d.followUp1, followUp2: d.followUp2, status: d.status,
        confidenceScore: d.confidenceScore,
      }))}
      interactions={lead.interactions.map((i) => ({
        id: i.id, type: i.type, notes: i.notes,
        date: i.date.toISOString(), by: i.createdBy?.name ?? null,
      }))}
    />
  );
}
