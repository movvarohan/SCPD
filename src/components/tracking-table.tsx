"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card, Table, THead, TH, TR, TD, Select, EmptyState, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/badges";
import { Send } from "lucide-react";
import { TRACKING_STATUSES, LEAD_STATUS_LABELS } from "@/lib/types";
import { setLeadStatus } from "@/server/actions/leads";

interface Row {
  id: string; name: string; company: string | null; email: string | null;
  status: string; draftStatus: string | null; assignedPD: string | null;
}

export function TrackingTable({ rows, emailMode }: { rows: Row[]; emailMode: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm">
        <span className="font-medium text-slate-700">Email provider:</span>{" "}
        <Badge tone={emailMode.includes("mock") ? "slate" : "green"}>{emailMode}</Badge>
        <span className="ml-2 text-xs text-slate-400">
          Sending is manual in the MVP. Real Gmail / Smartlead adapters are stubbed in
          <code className="mx-1 rounded bg-slate-100 px-1 text-[11px]">src/lib/providers/email.ts</code>.
        </span>
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Send className="h-8 w-8" />}
              title="No emails in the sending pipeline yet"
              description="Approve drafts in the Review Queue to move leads into tracking."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Lead</TH>
                <TH>Company</TH>
                <TH>Email</TH>
                <TH>Draft</TH>
                <TH>PD</TH>
                <TH>Current status</TH>
                <TH>Update status</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((r) => (
                <RowItem key={r.id} row={r} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function RowItem({ row }: { row: Row }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function update(status: string) {
    start(async () => {
      await setLeadStatus(row.id, status as never);
      toast(`${row.name} → ${LEAD_STATUS_LABELS[status]}`, "success");
      router.refresh();
    });
  }

  return (
    <TR>
      <TD>
        <Link href={`/leads/${row.id}`} className="font-medium text-slate-900 hover:text-cardinal-700">{row.name}</Link>
      </TD>
      <TD className="text-slate-600">{row.company ?? "—"}</TD>
      <TD className="max-w-[180px] truncate text-slate-600">{row.email ?? "—"}</TD>
      <TD>{row.draftStatus ? <Badge tone="slate">{row.draftStatus.replace(/_/g, " ")}</Badge> : <span className="text-slate-300">—</span>}</TD>
      <TD className="text-slate-600">{row.assignedPD ?? <span className="text-slate-300">—</span>}</TD>
      <TD><StatusBadge status={row.status} /></TD>
      <TD>
        <Select value="" onChange={(e) => e.target.value && update(e.target.value)} disabled={pending} className="w-44">
          <option value="">Set status…</option>
          {TRACKING_STATUSES.map((s) => (<option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>))}
        </Select>
      </TD>
    </TR>
  );
}
