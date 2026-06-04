import Link from "next/link";
import {
  Users, Star, PenLine, ClipboardCheck, CheckCircle2, Send,
  MessageSquare, CalendarCheck, UserCheck, TrendingUp, Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { StatusChart, SourceChart, PriorityChart } from "@/components/dashboard-charts";
import { getDashboardMetrics } from "@/lib/services/metrics";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fullNameOf } from "@/lib/utils";
import { StatusBadge, PriorityBadge } from "@/components/badges";

export const dynamic = "force-dynamic";

function Stat({
  label, value, icon: Icon, href, tone = "slate", hint,
}: {
  label: string; value: string | number; icon: React.ElementType;
  href?: string; tone?: string; hint?: string;
}) {
  const toneMap: Record<string, string> = {
    slate: "text-slate-500 bg-slate-100",
    cardinal: "text-cardinal-700 bg-cardinal-50",
    amber: "text-amber-700 bg-amber-50",
    green: "text-emerald-700 bg-emerald-50",
    blue: "text-blue-700 bg-blue-50",
  };
  const body = (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
          <div className="truncate text-xs font-medium text-slate-500">{label}</div>
          {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function DashboardPage() {
  const [m, user, highLeads, recent] = await Promise.all([
    getDashboardMetrics(),
    getCurrentUser(),
    db.lead.findMany({
      where: { priority: "High" },
      orderBy: { score: "desc" },
      take: 6,
      include: { assignedPD: true },
    }),
    db.lead.findMany({ orderBy: { updatedAt: "desc" }, take: 6 }),
  ]);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "PD"}`}
        description="Your sourcing pipeline at a glance — from sourced leads to booked calls."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Leads" value={m.totalLeads} icon={Users} href="/leads" tone="cardinal" />
        <Stat label="High Priority" value={m.highPriority} icon={Star} href="/leads?priority=High" tone="amber" />
        <Stat label="Emails Drafted" value={m.drafted} icon={PenLine} href="/review" tone="blue" />
        <Stat label="Pending Review" value={m.pendingReview} icon={ClipboardCheck} href="/review" tone="amber" />
        <Stat label="Approved" value={m.approved} icon={CheckCircle2} href="/tracking" tone="green" />
        <Stat label="Sent" value={m.sent} icon={Send} href="/tracking" tone="blue" />
        <Stat label="Replies" value={m.replies} icon={MessageSquare} href="/tracking" tone="green" />
        <Stat label="Calls Booked" value={m.booked} icon={CalendarCheck} href="/assignments" tone="cardinal" />
        <Stat label="Assigned Leads" value={m.assigned} icon={UserCheck} href="/assignments" tone="slate" />
        <Stat label="Reply Rate" value={m.replyRate} icon={Percent} tone="green" hint="of sent emails" />
        <Stat label="Booked Conversion" value={m.bookedRate} icon={TrendingUp} tone="cardinal" hint="sent → booked" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Pipeline by status</CardTitle></CardHeader>
          <CardContent><StatusChart data={m.byStatus} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Leads by priority</CardTitle></CardHeader>
          <CardContent><PriorityChart data={m.byPriority} /></CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Leads by source</CardTitle></CardHeader>
          <CardContent><SourceChart data={m.bySource} /></CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Top high-priority leads</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {highLeads.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">No high-priority leads yet.</p>
            )}
            {highLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{fullNameOf(lead)}</div>
                  <div className="truncate text-xs text-slate-500">
                    {lead.title}{lead.companyName ? ` · ${lead.companyName}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lead.assignedPD && (
                    <Badge tone="slate">{lead.assignedPD.name.split(" ")[0]}</Badge>
                  )}
                  <StatusBadge status={lead.status} />
                  <Badge tone="red" className="font-mono">{lead.score}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Recently updated</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {recent.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              <span className="truncate text-sm text-slate-700">
                {fullNameOf(lead)}
                <span className="text-slate-400"> · {lead.companyName}</span>
              </span>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={lead.priority} />
                <StatusBadge status={lead.status} />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
