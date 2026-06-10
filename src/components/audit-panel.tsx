import { ScrollText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export interface AuditDTO {
  id: string;
  action: string;
  detail: string;
  actorName: string | null;
  createdAt: string;
}

const TONE: Record<string, "red" | "amber" | "green" | "slate" | "cardinal"> = {
  "auth.signin_failed": "amber",
  "auth.lockout": "red",
  "auth.signin_locked": "red",
  "team.member_removed": "red",
  "auth.signup": "green",
  "team.invite_accepted": "green",
  "automation.autopilot": "cardinal",
  "automation.paused": "amber",
};

// Admin-only: the workspace audit trail (auth, team, automation events).
export function AuditPanel({ events }: { events: AuditDTO[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle><span className="inline-flex items-center gap-1.5"><ScrollText className="h-4 w-4" /> Audit log</span></CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">No events yet — sign-ins, invites, role changes, and automation activity will appear here.</p>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-[13px] hover:bg-slate-50">
                <Badge tone={TONE[e.action] ?? "slate"} className="w-44 shrink-0 justify-center font-mono text-[10px]">
                  {e.action}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-slate-600" title={e.detail}>{e.detail}</span>
                <span className="hidden shrink-0 text-xs text-slate-400 sm:block">{e.actorName ?? "system"}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{formatDateTime(e.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
