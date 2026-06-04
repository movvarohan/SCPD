import { PageHeader } from "@/components/page-header";
import { OutreachGenerator } from "@/components/outreach-generator";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrgSettings } from "@/lib/services/settings";
import { llmStatus } from "@/lib/providers/llm";
import { fullNameOf } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const [user, leads, settings] = await Promise.all([
    getCurrentUser(),
    db.lead.findMany({
      orderBy: [{ score: "desc" }],
      take: 200,
      include: { drafts: { select: { id: true } } },
    }),
    getOrgSettings(),
  ]);

  const llm = llmStatus();

  return (
    <div>
      <PageHeader
        title="Outreach Generator"
        description="Select leads and generate personalized first emails and follow-ups. Every draft is routed to the Review Queue before it can be sent."
      />
      <OutreachGenerator
        llmMode={llm.mode}
        defaultSender={{ name: user?.name ?? "Stanford Consulting PD", role: "Project Director" }}
        leads={leads.map((l) => ({
          id: l.id,
          name: fullNameOf(l),
          title: l.title,
          company: l.companyName,
          industry: l.industry,
          priority: l.priority,
          score: l.score,
          isStanfordAlum: l.isStanfordAlum,
          isSCAlum: l.isSCAlum,
          warmConnectionType: l.warmConnectionType,
          hasDraft: l.drafts.length > 0,
        }))}
      />
    </div>
  );
}
