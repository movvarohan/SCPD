import { db } from "@/lib/db";

export interface DashboardMetrics {
  totalLeads: number;
  highPriority: number;
  drafted: number;
  pendingReview: number;
  approved: number;
  sent: number;
  replies: number;
  booked: number;
  assigned: number;
  sentToday: number;
  autoSentToday: number;
  replyRate: string;
  bookedRate: string;
  bySource: { source: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

const SENT_STATUSES = ["sent", "follow_up_1_sent", "follow_up_2_sent", "replied", "booked"];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    totalLeads,
    highPriority,
    pendingReview,
    approved,
    sentCount,
    replies,
    booked,
    assigned,
    leads,
    pendingDrafts,
    sentToday,
    autoSentToday,
  ] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { priority: "High" } }),
    db.outreachDraft.count({ where: { status: "needs_review" } }),
    db.outreachDraft.count({ where: { status: { in: ["approved", "ready_to_send"] } } }),
    db.lead.count({ where: { status: { in: SENT_STATUSES } } }),
    db.lead.count({ where: { status: { in: ["replied", "booked"] } } }),
    db.lead.count({ where: { status: "booked" } }),
    db.lead.count({ where: { assignedPDId: { not: null } } }),
    db.lead.findMany({ select: { source: true, status: true, priority: true } }),
    db.outreachDraft.count(),
    db.interaction.count({ where: { type: "email_sent", date: { gte: startOfToday() } } }),
    db.interaction.count({ where: { type: "email_sent", notes: { contains: "Auto-sent" }, date: { gte: startOfToday() } } }),
  ]);

  const bySourceMap = new Map<string, number>();
  const byStatusMap = new Map<string, number>();
  const byPriorityMap = new Map<string, number>();
  for (const l of leads) {
    bySourceMap.set(l.source, (bySourceMap.get(l.source) ?? 0) + 1);
    byStatusMap.set(l.status, (byStatusMap.get(l.status) ?? 0) + 1);
    byPriorityMap.set(l.priority, (byPriorityMap.get(l.priority) ?? 0) + 1);
  }

  const replyRate =
    sentCount > 0 ? `${Math.round((replies / sentCount) * 100)}%` : "0%";
  const bookedRate =
    sentCount > 0 ? `${Math.round((booked / sentCount) * 100)}%` : "0%";

  return {
    totalLeads,
    highPriority,
    drafted: pendingDrafts,
    pendingReview,
    approved,
    sent: sentCount,
    replies,
    booked,
    assigned,
    sentToday,
    autoSentToday,
    replyRate,
    bookedRate,
    bySource: Array.from(bySourceMap, ([source, count]) => ({ source, count })),
    byStatus: Array.from(byStatusMap, ([status, count]) => ({ status, count })),
    byPriority: Array.from(byPriorityMap, ([priority, count]) => ({ priority, count })),
  };
}
