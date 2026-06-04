import { PageHeader } from "@/components/page-header";
import { ScoringEditor } from "@/components/scoring-editor";
import { db } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ScoringPage() {
  const user = await getCurrentUser();
  const allowed = can(user, "configure_scoring");
  const rules = await db.scoringRule.findMany({ orderBy: { weight: "desc" } });

  return (
    <div>
      <PageHeader
        title="Scoring Rules"
        description="Configure how leads are prioritized. Adjust weights, toggle rules, then re-score the whole database."
      />
      {!allowed && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Editing scoring rules is restricted to Admins. Switch roles to make changes.
        </div>
      )}
      <ScoringEditor rules={rules.map((r) => ({ id: r.id, key: r.key, label: r.label, weight: r.weight, enabled: r.enabled }))} />
    </div>
  );
}
