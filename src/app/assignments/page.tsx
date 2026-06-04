import { PageHeader } from "@/components/page-header";
import { AssignmentsBoard, type PDDTO, type AssignLeadDTO } from "@/components/assignments-board";
import { db } from "@/lib/db";
import { stringToList } from "@/lib/serialization";
import { recommendPDs, explainRecommendation, type PDWithProfile } from "@/lib/services/assignment";
import { fullNameOf } from "@/lib/utils";
import { getCurrentUser, can } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const user = await getCurrentUser();
  const allowed = can(user, "assign");

  const [pdUsers, leads] = await Promise.all([
    db.user.findMany({ where: { role: "PD" }, include: { pdProfile: true } }),
    db.lead.findMany({
      where: { status: { in: ["replied", "booked", "assigned"] } },
      orderBy: [{ status: "asc" }, { score: "desc" }],
    }),
  ]);

  const pdDtos: PDDTO[] = pdUsers.map((p) => ({
    id: p.id, name: p.name, email: p.email,
    industries: stringToList(p.pdProfile?.industries),
    functions: stringToList(p.pdProfile?.functions),
    availability: p.pdProfile?.availability ?? "medium",
    activeLeadCount: p.pdProfile?.activeLeadCount ?? 0,
    notes: p.pdProfile?.notes ?? "",
  }));

  const leadDtos: AssignLeadDTO[] = leads.map((lead) => {
    const suggestions = recommendPDs(lead, pdUsers as PDWithProfile[]);
    const top = suggestions[0];
    return {
      id: lead.id,
      name: fullNameOf(lead),
      company: lead.companyName,
      industry: lead.industry,
      status: lead.status,
      priority: lead.priority,
      assignedPDId: lead.assignedPDId,
      recommendation: top && top.score > 0
        ? { pdId: top.pd.id, explanation: explainRecommendation(lead, top) }
        : null,
    };
  });

  return (
    <div>
      <PageHeader
        title="PD Assignments"
        description="Route replied and booked leads to the right Project Director based on sector fit, functional interests, availability, and current load."
      />
      {!allowed && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Assigning leads is an Admin action. You can view recommendations, but switch to the Admin role to assign.
        </div>
      )}
      <AssignmentsBoard leads={leadDtos} pds={pdDtos} />
    </div>
  );
}
