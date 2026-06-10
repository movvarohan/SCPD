import { db } from "@/lib/db";

// Aggregations for the Analytics page. Computed from interactions (the
// immutable event log) rather than lead statuses, so history doesn't shift
// when a lead moves forward in the pipeline.

export interface WeekPoint {
  week: string; // e.g. "Mar 3"
  sent: number;
  replies: number;
}

export interface FunnelStage {
  label: string;
  count: number;
}

export interface AnalyticsData {
  weekly: WeekPoint[];
  funnel: FunnelStage[];
  bySource: { source: string; count: number }[];
  byIndustry: { industry: string; count: number }[];
  replyRate: string;
  bookedRate: string;
  avgScore: number;
  suppressed: number;
  totals: { sent: number; replies: number; booked: number };
}

const WEEKS = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const since = new Date(Date.now() - WEEKS * WEEK_MS);

  const [events, leads, suppressed] = await Promise.all([
    db.interaction.findMany({
      where: { type: { in: ["email_sent", "reply"] }, date: { gte: since } },
      select: { type: true, date: true },
    }),
    db.lead.findMany({
      select: {
        status: true, source: true, industry: true, score: true,
        email: true, workEmail: true, personalEmail: true,
      },
    }),
    db.suppression.count(),
  ]);

  // Weekly buckets, oldest → newest, aligned to "now minus N weeks".
  const buckets: WeekPoint[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const start = new Date(Date.now() - (i + 1) * WEEK_MS);
    buckets.push({ week: weekLabel(start), sent: 0, replies: 0 });
  }
  for (const e of events) {
    const age = Date.now() - new Date(e.date).getTime();
    const idx = WEEKS - 1 - Math.floor(age / WEEK_MS);
    if (idx < 0 || idx >= WEEKS) continue;
    if (e.type === "email_sent") buckets[idx].sent++;
    else buckets[idx].replies++;
  }

  // Funnel from current lead states (point-in-time snapshot).
  const CONTACTED = ["sent", "follow_up_1_sent", "follow_up_2_sent", "replied", "booked", "not_interested", "no_response"];
  const withEmail = leads.filter((l) => l.email || l.workEmail || l.personalEmail).length;
  const contacted = leads.filter((l) => CONTACTED.includes(l.status)).length;
  const replied = leads.filter((l) => ["replied", "booked"].includes(l.status)).length;
  const booked = leads.filter((l) => l.status === "booked").length;
  const funnel: FunnelStage[] = [
    { label: "Leads", count: leads.length },
    { label: "Have email", count: withEmail },
    { label: "Contacted", count: contacted },
    { label: "Replied", count: replied },
    { label: "Booked", count: booked },
  ];

  const bySourceMap = new Map<string, number>();
  const byIndustryMap = new Map<string, number>();
  let scoreSum = 0;
  for (const l of leads) {
    bySourceMap.set(l.source, (bySourceMap.get(l.source) ?? 0) + 1);
    const ind = l.industry?.trim() || "Unknown";
    byIndustryMap.set(ind, (byIndustryMap.get(ind) ?? 0) + 1);
    scoreSum += l.score ?? 0;
  }
  const top = (m: Map<string, number>, n: number) =>
    Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);

  return {
    weekly: buckets,
    funnel,
    bySource: top(bySourceMap, 8).map(([source, count]) => ({ source, count })),
    byIndustry: top(byIndustryMap, 8).map(([industry, count]) => ({ industry, count })),
    replyRate: contacted > 0 ? `${Math.round((replied / contacted) * 100)}%` : "—",
    bookedRate: contacted > 0 ? `${Math.round((booked / contacted) * 100)}%` : "—",
    avgScore: leads.length ? Math.round((scoreSum / leads.length) * 10) / 10 : 0,
    suppressed,
    totals: {
      sent: events.filter((e) => e.type === "email_sent").length,
      replies: events.filter((e) => e.type === "reply").length,
      booked,
    },
  };
}
