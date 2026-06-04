import { PageHeader } from "@/components/page-header";
import { ImportWizard } from "@/components/import-wizard";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { db } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await getCurrentUser();
  const allowed = can(user, "import");
  const jobs = await db.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 8 });

  return (
    <div>
      <PageHeader
        title="Import Contacts"
        description="Upload the SC alumni spreadsheet or any lead CSV. Columns are auto-mapped, rows are validated, and duplicates are skipped."
      />

      {!allowed && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          You are viewing as a non-admin. Importing is restricted to Admins — switch to the Admin role (top right) to import.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ImportWizard />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Recent imports</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {jobs.length === 0 && <p className="text-sm text-slate-400">No imports yet.</p>}
              {jobs.map((j) => (
                <div key={j.id} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-medium text-slate-800">{j.filename}</span>
                    <Badge tone={j.type === "alumni" ? "cardinal" : "slate"}>{j.type}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {j.importedCount} imported · {j.duplicateCount} dupes · {j.errorCount} errors
                  </div>
                  <div className="text-[11px] text-slate-400">{formatDateTime(j.createdAt)}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Need a sample file?</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600">
              A sample alumni CSV ships in the repo at{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/samples/sc_alumni_sample.csv</code>.
              It intentionally uses messy column names so you can see auto-mapping in action.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
