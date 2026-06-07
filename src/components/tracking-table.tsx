"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card, Table, THead, TH, TR, TD, Select, EmptyState, Badge, Button,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/badges";
import { Send, Inbox, Clock } from "lucide-react";
import { TRACKING_STATUSES, LEAD_STATUS_LABELS } from "@/lib/types";
import { setLeadStatus } from "@/server/actions/leads";
import { sendOutreach, syncReplies, sendDueFollowUps } from "@/server/actions/integrations";

interface Row {
  id: string; name: string; company: string | null; email: string | null;
  status: string; draftStatus: string | null; draftId: string | null; assignedPD: string | null;
}

export function TrackingTable({
  rows, emailMode, emailLive,
}: {
  rows: Row[]; emailMode: string; emailLive: boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [syncing, startSync] = React.useTransition();
  const [followingUp, startFollowUp] = React.useTransition();

  function doSync() {
    startSync(async () => {
      const res = await syncReplies();
      toast(res.message, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  function doFollowUps() {
    startFollowUp(async () => {
      const res = await sendDueFollowUps();
      toast(res.message, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-medium text-slate-700">Mailbox:</span>{" "}
          <Badge tone={emailLive ? "green" : "slate"}>{emailMode}</Badge>
          {!emailLive && (
            <span className="ml-2 text-xs text-slate-400">
              Connect a mailbox in <Link href="/settings" className="text-cardinal-700 hover:underline">Settings</Link> to send for real.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={doFollowUps} disabled={followingUp}>
            <Clock className="h-3.5 w-3.5" /> {followingUp ? "Sending…" : "Send due follow-ups"}
          </Button>
          <Button variant="outline" size="sm" onClick={doSync} disabled={syncing || !emailLive}>
            <Inbox className="h-3.5 w-3.5" /> {syncing ? "Syncing…" : "Sync replies from inbox"}
          </Button>
        </div>
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
                <TH>Send</TH>
                <TH>Update status</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((r) => (
                <RowItem key={r.id} row={r} emailLive={emailLive} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function RowItem({ row, emailLive }: { row: Row; emailLive: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [sending, startSend] = React.useTransition();

  function update(status: string) {
    start(async () => {
      await setLeadStatus(row.id, status as never);
      toast(`${row.name} → ${LEAD_STATUS_LABELS[status]}`, "success");
      router.refresh();
    });
  }

  function send() {
    if (!row.email) { toast("No email address for this lead.", "error"); return; }
    if (!confirm(`Send the approved email to ${row.email}? This sends a real email.`)) return;
    startSend(async () => {
      const res = await sendOutreach(row.id, row.draftId ?? undefined);
      toast(res.message, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  const canSend = ["approved", "ready_to_send"].includes(row.status) ||
    (row.draftStatus !== null && ["approved", "ready_to_send"].includes(row.draftStatus));
  const alreadySent = ["sent", "follow_up_1_sent", "follow_up_2_sent", "replied", "booked"].includes(row.status);

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
        {alreadySent ? (
          <span className="text-xs text-emerald-600">✓ sent</span>
        ) : canSend ? (
          <Button size="sm" onClick={send} disabled={sending || !row.email} title={emailLive ? "Send real email" : "Mailbox is mock — will simulate"}>
            <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Send"}
          </Button>
        ) : (
          <span className="text-xs text-slate-400">approve first</span>
        )}
      </TD>
      <TD>
        <Select value="" onChange={(e) => e.target.value && update(e.target.value)} disabled={pending} className="w-44">
          <option value="">Set status…</option>
          {TRACKING_STATUSES.map((s) => (<option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>))}
        </Select>
      </TD>
    </TR>
  );
}
