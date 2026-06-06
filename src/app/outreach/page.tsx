import { PageHeader } from "@/components/page-header";
import { OutreachGenerator } from "@/components/outreach-generator";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrgSettings, getAutoSendConfig } from "@/lib/services/settings";
import { llmStatus } from "@/lib/providers/llm";
import { fullNameOf } from "@/lib/utils";
import { Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const [user, leads, , autoSend] = await Promise.all([
    getCurrentUser(),
    db.lead.findMany({
      orderBy: [{ score: "desc" }],
      take: 200,
      include: { drafts: { select: { id: true } } },
    }),
    getOrgSettings(),
    getAutoSendConfig(),
  ]);

  const llm = await llmStatus();

  return (
    <div>
      <PageHeader
        title="Outreach Generator"
        description="Select leads and generate personalized first emails and follow-ups. Drafts route to the Review Queue unless they match an auto-send rule."
      />
      {autoSend.enabled && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-cardinal-200 bg-cardinal-50 px-4 py-2.5 text-[13px] text-cardinal-800">
          <Zap className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">Auto-send is ON.</span> Generated drafts that match your rule (score ≥ {autoSend.minScore}
            {autoSend.industries.length ? `, ${autoSend.industries.join("/")}` : ""}
            {autoSend.companySizes.length ? `, ${autoSend.companySizes.join("/")}` : ""}) and pass the guardrails will be <span className="font-semibold">sent immediately</span>, up to {autoSend.dailyCap}/day. Others go to review. Manage this in <a href="/settings" className="underline">Settings</a>.
          </span>
        </div>
      )}
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
