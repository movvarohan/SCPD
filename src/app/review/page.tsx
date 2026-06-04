import { PageHeader } from "@/components/page-header";
import { ReviewQueue, type ReviewDraftDTO } from "@/components/review-queue";
import { Badge } from "@/components/ui";
import { db } from "@/lib/db";
import { decodeJson } from "@/lib/serialization";
import { fullNameOf } from "@/lib/utils";

export const dynamic = "force-dynamic";

function selectionReason(lead: {
  isSCAlum: boolean; isStanfordAlum: boolean; warmConnectionType: string;
  priority: string; score: number; industry: string | null; title: string | null;
}): string {
  const bits: string[] = [];
  if (lead.isSCAlum) bits.push("SC alum");
  else if (lead.isStanfordAlum) bits.push("Stanford alum");
  if (lead.warmConnectionType && lead.warmConnectionType !== "none" && lead.warmConnectionType !== "alumni")
    bits.push(`warm connection (${lead.warmConnectionType})`);
  if (lead.industry) bits.push(`${lead.industry} fit`);
  bits.push(`${lead.priority.toLowerCase()} priority (score ${lead.score})`);
  return `Selected as ${bits.join(", ")}.`;
}

export default async function ReviewPage() {
  const drafts = await db.outreachDraft.findMany({
    where: { status: "needs_review" },
    orderBy: { createdAt: "desc" },
    include: { lead: true },
  });

  const dto: ReviewDraftDTO[] = drafts.map((d) => ({
    id: d.id,
    leadId: d.leadId,
    leadName: fullNameOf(d.lead),
    title: d.lead.title,
    company: d.lead.companyName,
    industry: d.lead.industry,
    priority: d.lead.priority,
    score: d.lead.score,
    isStanfordAlum: d.lead.isStanfordAlum,
    isSCAlum: d.lead.isSCAlum,
    warmConnectionType: d.lead.warmConnectionType,
    type: d.type,
    subject: d.subject,
    body: d.body,
    followUp1: d.followUp1,
    followUp2: d.followUp2,
    personalizationNote: d.personalizationNote,
    confidenceScore: d.confidenceScore,
    warnings: decodeJson<string[]>(d.warningsJson, []),
    selectionReason: selectionReason(d.lead),
  }));

  return (
    <div>
      <PageHeader
        title="Review Queue"
        description="Human approval before anything goes out. Edit, approve, regenerate, or reject each draft."
        actions={<Badge tone="amber">{dto.length} awaiting review</Badge>}
      />
      <ReviewQueue drafts={dto} />
    </div>
  );
}
