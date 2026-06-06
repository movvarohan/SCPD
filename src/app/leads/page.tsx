import Link from "next/link";
import { Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import {
  Card, Table, THead, TH, TR, TD, EmptyState, Badge,
} from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { LeadFilters } from "@/components/lead-filters";
import { EnrichButton, VerifyEmailsButton } from "@/components/enrich-button";
import { StatusBadge, PriorityBadge, AlumniBadge, ScoreBadge } from "@/components/badges";
import { db } from "@/lib/db";
import { fullNameOf, bestEmailOf } from "@/lib/utils";
import { SENIORITY_LABELS } from "@/lib/types";
import { Linkedin, Download } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

function buildWhere(sp: SP): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  const and: Prisma.LeadWhereInput[] = [];

  if (sp.status) where.status = sp.status;
  if (sp.source) where.source = sp.source;
  if (sp.priority) where.priority = sp.priority;
  if (sp.seniority) where.seniority = sp.seniority;
  if (sp.industry) where.industry = sp.industry;

  if (sp.pd === "unassigned") where.assignedPDId = null;
  else if (sp.pd) where.assignedPDId = sp.pd;

  if (sp.alumni === "sc") where.isSCAlum = true;
  else if (sp.alumni === "stanford") where.isStanfordAlum = true;
  else if (sp.alumni === "warm")
    where.warmConnectionType = { notIn: ["none"] };

  if (sp.email === "has")
    and.push({ OR: [{ email: { not: null } }, { workEmail: { not: null } }] });
  else if (sp.email === "verified") where.verifiedEmail = true;
  else if (sp.email === "none")
    and.push({ email: null, workEmail: null, personalEmail: null });

  if (sp.q) {
    const q = sp.q;
    and.push({
      OR: [
        { fullName: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
        { companyName: { contains: q } },
        { title: { contains: q } },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const where = buildWhere(sp);

  const [leads, industriesRaw, pds, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      take: 300,
      include: { assignedPD: true },
    }),
    db.lead.findMany({
      where: { industry: { not: null } },
      select: { industry: true },
      distinct: ["industry"],
    }),
    db.user.findMany({ where: { role: "PD" }, select: { id: true, name: true } }),
    db.lead.count(),
  ]);

  const industries = industriesRaw
    .map((i) => i.industry)
    .filter((i): i is string => Boolean(i))
    .sort();

  return (
    <div>
      <PageHeader
        title="Lead Database"
        description={`${leads.length} of ${total} leads shown. Click any row for full detail.`}
        actions={
          <>
            <a
              href="/api/leads/export"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </a>
            <EnrichButton />
            <VerifyEmailsButton />
          </>
        }
      />

      <LeadFilters industries={industries} pds={pds} />

      <Card>
        {leads.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No leads match your filters"
              description="Try clearing filters, importing a CSV, or sourcing new leads."
              action={
                <div className="flex gap-2">
                  <Link href="/import" className="text-sm font-medium text-cardinal-700 hover:underline">Import CSV</Link>
                  <span className="text-slate-300">·</span>
                  <Link href="/source" className="text-sm font-medium text-cardinal-700 hover:underline">Source leads</Link>
                </div>
              }
            />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Title</TH>
                <TH>Company</TH>
                <TH>Email</TH>
                <TH>Li</TH>
                <TH>Source</TH>
                <TH>Connection</TH>
                <TH>Score</TH>
                <TH>Status</TH>
                <TH>PD</TH>
              </tr>
            </THead>
            <tbody>
              {leads.map((lead) => {
                const email = bestEmailOf(lead);
                return (
                  <TR key={lead.id} className="cursor-pointer">
                    <TD>
                      <Link href={`/leads/${lead.id}`} className="block">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 hover:text-cardinal-700">
                            {fullNameOf(lead)}
                          </span>
                          <PriorityBadge priority={lead.priority} />
                        </div>
                        <div className="text-xs text-slate-400">{SENIORITY_LABELS[lead.seniority ?? ""] ?? ""}</div>
                      </Link>
                    </TD>
                    <TD className="max-w-[160px] truncate text-slate-600">{lead.title ?? "—"}</TD>
                    <TD className="text-slate-700">{lead.companyName ?? "—"}</TD>
                    <TD className="max-w-[180px] truncate">
                      {email ? (
                        <span className="flex items-center gap-1 text-slate-600">
                          {lead.verifiedEmail && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Verified" />}
                          {email}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TD>
                    <TD>
                      {lead.linkedinUrl ? (
                        <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TD>
                    <TD><Badge tone="slate">{sourceLabel(lead.source)}</Badge></TD>
                    <TD>
                      <AlumniBadge
                        isStanfordAlum={lead.isStanfordAlum}
                        isSCAlum={lead.isSCAlum}
                        warmConnectionType={lead.warmConnectionType}
                      />
                    </TD>
                    <TD><ScoreBadge score={lead.score} /></TD>
                    <TD><StatusBadge status={lead.status} /></TD>
                    <TD className="text-slate-600">
                      {lead.assignedPD ? lead.assignedPD.name.split(" ")[0] : <span className="text-slate-300">—</span>}
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    csv_alumni: "Alumni", csv_generic: "CSV", apollo: "Apollo", clay: "Clay",
    manual: "Manual", sec_edgar: "SEC EDGAR", sec_formd: "SEC Form D", irs_990: "IRS 990",
    usaspending: "USAspending", nppes: "NPPES Health", nih_reporter: "NIH RePORTER",
    openfda: "openFDA", gleif: "GLEIF Registry", sam_gov: "SAM.gov",
    hn_hiring: "HN Hiring", yc_directory: "YC Directory", generic_directory: "Scraped Directory",
  };
  return map[source] ?? source;
}
