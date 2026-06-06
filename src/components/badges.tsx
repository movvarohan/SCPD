import { Badge } from "@/components/ui";
import { LEAD_STATUS_LABELS } from "@/lib/types";
import { GraduationCap, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";

// Status is conveyed by a small colored dot on a neutral pill — restrained and
// consistent, rather than a different bright fill per status.
const STATUS_DOT: Record<string, string> = {
  sourced: "bg-slate-400",
  enriched: "bg-sky-500",
  drafted: "bg-indigo-500",
  needs_review: "bg-amber-500",
  approved: "bg-blue-500",
  ready_to_send: "bg-violet-500",
  sent: "bg-blue-500",
  follow_up_1_sent: "bg-blue-400",
  follow_up_2_sent: "bg-blue-400",
  replied: "bg-emerald-500",
  booked: "bg-emerald-600",
  assigned: "bg-cardinal-600",
  not_interested: "bg-red-500",
  no_response: "bg-slate-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status] ?? "bg-slate-400")} />
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const dot = priority === "High" ? "bg-red-500" : priority === "Medium" ? "bg-amber-500" : "bg-slate-300";
  const text = priority === "High" ? "text-red-700" : priority === "Medium" ? "text-amber-700" : "text-slate-500";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-slate-200", text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {priority}
    </span>
  );
}

export function AlumniBadge({
  isStanfordAlum,
  isSCAlum,
  warmConnectionType,
}: {
  isStanfordAlum?: boolean;
  isSCAlum?: boolean;
  warmConnectionType?: string;
}) {
  const tags: React.ReactNode[] = [];
  if (isSCAlum)
    tags.push(
      <Badge key="sc" tone="cardinal">
        <GraduationCap className="h-3 w-3" /> SC Alum
      </Badge>
    );
  else if (isStanfordAlum)
    tags.push(
      <Badge key="stanford" tone="cardinal">
        <GraduationCap className="h-3 w-3" /> Stanford
      </Badge>
    );
  if (warmConnectionType && warmConnectionType !== "none" && warmConnectionType !== "alumni")
    tags.push(
      <Badge key="warm" tone="green">
        <Handshake className="h-3 w-3" /> Warm
      </Badge>
    );
  if (!tags.length) return <span className="text-xs text-slate-300">—</span>;
  return <div className="flex flex-wrap gap-1">{tags}</div>;
}

export function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 8 ? "text-red-700" : score >= 4 ? "text-amber-700" : "text-slate-500";
  return <span className={cn("font-mono text-[13px] font-semibold tabular-nums", tone)}>{score}</span>;
}
