import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fullNameOf, bestEmailOf } from "@/lib/utils";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Escape per RFC 4180.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// GET /api/leads/export -> downloads all leads as CSV. Requires a session.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const leads = await db.lead.findMany({
    orderBy: [{ score: "desc" }],
    include: { assignedPD: true },
  });

  const headers = [
    "Full Name", "First Name", "Last Name", "Title", "Seniority", "Company",
    "Company Website", "Industry", "Location", "Company Size", "Email",
    "Email Verified", "LinkedIn", "Source", "Stanford Alum", "SC Alum",
    "Warm Connection", "Score", "Priority", "Status", "Assigned PD",
  ];

  const rows = leads.map((l) =>
    [
      fullNameOf(l), l.firstName, l.lastName, l.title, l.seniority, l.companyName,
      l.companyWebsite, l.industry, l.location, l.companySize, bestEmailOf(l),
      l.verifiedEmail ? "yes" : "no", l.linkedinUrl, l.source,
      l.isStanfordAlum ? "yes" : "no", l.isSCAlum ? "yes" : "no",
      l.warmConnectionType, l.score, l.priority, l.status, l.assignedPD?.name ?? "",
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sc-leads-${date}.csv"`,
    },
  });
}
