"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldBan, Plus, Trash2 } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { addSuppression, removeSuppression } from "@/server/actions/suppression";

export interface SuppressionRow {
  id: string;
  email: string;
  source: string;
  reason: string;
  createdAt: string;
}

const SOURCE_LABELS: Record<string, string> = {
  opt_out_reply: "opt-out reply",
  manual: "manual",
  bounce: "bounce",
};

export function SuppressionPanel({ rows, isAdmin }: { rows: SuppressionRow[]; isAdmin: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [email, setEmail] = React.useState("");
  const [reason, setReason] = React.useState("");

  function add() {
    start(async () => {
      const res = await addSuppression(email, reason);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) {
        setEmail("");
        setReason("");
        router.refresh();
      }
    });
  }

  function remove(addr: string) {
    start(async () => {
      const res = await removeSuppression(addr);
      toast(res.message, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <ShieldBan className="h-4 w-4 text-cardinal-700" /> Do-not-contact list
          </span>
        </CardTitle>
        <Badge tone="slate">{rows.length} address{rows.length === 1 ? "" : "es"}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[13px] text-slate-500">
          Addresses here are <span className="font-medium text-slate-700">never emailed</span> by any
          path — manual sends, auto-send, Autopilot, or follow-ups — even if the person is re-imported
          as a new lead. Opt-out replies land here automatically.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <Label>Email address</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@company.com" className="mt-1" />
          </div>
          <div className="min-w-[180px] flex-1">
            <Label>Reason (optional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. asked us to stop at an event" className="mt-1" />
          </div>
          <Button onClick={add} disabled={pending || !email.trim()} size="sm">
            <Plus className="h-3.5 w-3.5" /> Suppress
          </Button>
        </div>

        {rows.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="hidden px-3 py-2 font-semibold sm:table-cell">Reason</th>
                  <th className="px-3 py-2 font-semibold">Added</th>
                  {isAdmin && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="text-slate-700">
                    <td className="px-3 py-2 font-medium">{r.email}</td>
                    <td className="px-3 py-2">
                      <Badge tone={r.source === "opt_out_reply" ? "cardinal" : "slate"}>
                        {SOURCE_LABELS[r.source] ?? r.source}
                      </Badge>
                    </td>
                    <td className="hidden max-w-[260px] truncate px-3 py-2 text-slate-500 sm:table-cell" title={r.reason}>
                      {r.reason || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => remove(r.email)}
                          disabled={pending}
                          title="Remove from do-not-contact (admin)"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-cardinal-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400">No suppressed addresses yet. Opt-out replies are added automatically.</p>
        )}
      </CardContent>
    </Card>
  );
}
