import { Send, MessageSquare, CalendarCheck, Percent, ShieldBan, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { TrendChart, Funnel, BreakdownChart } from "@/components/analytics-charts";
import { getAnalytics } from "@/lib/services/analytics";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  csv_alumni: "Alumni CSV",
  csv_generic: "Lead CSV",
  apollo: "Apollo",
  clay: "Clay",
  manual: "Manual",
};

function Stat({ label, value, icon: Icon, hint }: {
  label: string; value: string | number; icon: React.ElementType; hint?: string;
}) {
  return (
    <div className="h-full rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <Icon className="h-4 w-4 text-slate-300" />
      </div>
      <div className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">{value}</div>
      {hint && <div className="mt-1.5 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const a = await getAnalytics();

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Pipeline performance over time: what's being sent, who's replying, and where leads come from."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Sent (8 wks)" value={a.totals.sent} icon={Send} />
        <Stat label="Replies (8 wks)" value={a.totals.replies} icon={MessageSquare} />
        <Stat label="Calls booked" value={a.totals.booked} icon={CalendarCheck} />
        <Stat label="Reply rate" value={a.replyRate} icon={Percent} hint="replied ÷ contacted" />
        <Stat label="Avg lead score" value={a.avgScore} icon={Gauge} />
        <Stat label="Do-not-contact" value={a.suppressed} icon={ShieldBan} hint="suppressed addresses" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sends & replies — last 8 weeks</CardTitle></CardHeader>
          <CardContent><TrendChart data={a.weekly} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pipeline funnel</CardTitle></CardHeader>
          <CardContent className="pt-2">
            <Funnel stages={a.funnel} />
            <p className="mt-3 text-[11px] text-slate-400">
              Right-hand percentages are stage-to-stage conversion. Booked rate overall: {a.bookedRate}.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Leads by source</CardTitle></CardHeader>
          <CardContent>
            <BreakdownChart
              data={a.bySource.map((s) => ({ name: SOURCE_LABELS[s.source] ?? s.source, count: s.count }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Leads by industry</CardTitle></CardHeader>
          <CardContent>
            <BreakdownChart
              color="#8c1515"
              data={a.byIndustry.map((i) => ({ name: i.industry, count: i.count }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
