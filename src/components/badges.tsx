import { Badge } from "@/components/ui";
import { LEAD_STATUS_LABELS } from "@/lib/types";
import { GraduationCap, Handshake, Star } from "lucide-react";

const STATUS_TONES: Record<string, Parameters<typeof Badge>[0]["tone"]> = {
  sourced: "slate",
  enriched: "blue",
  drafted: "indigo",
  needs_review: "amber",
  approved: "blue",
  ready_to_send: "purple",
  sent: "blue",
  follow_up_1_sent: "blue",
  follow_up_2_sent: "blue",
  replied: "green",
  booked: "emerald",
  assigned: "cardinal",
  not_interested: "red",
  no_response: "slate",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? "slate"}>
      {LEAD_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === "High" ? "red" : priority === "Medium" ? "amber" : "slate";
  return (
    <Badge tone={tone}>
      {priority === "High" && <Star className="h-3 w-3" />}
      {priority}
    </Badge>
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
  if (!tags.length) return <span className="text-xs text-slate-400">—</span>;
  return <div className="flex flex-wrap gap-1">{tags}</div>;
}

export function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 8 ? "red" : score >= 4 ? "amber" : "slate";
  return (
    <Badge tone={tone} className="font-mono tabular-nums">
      {score}
    </Badge>
  );
}
