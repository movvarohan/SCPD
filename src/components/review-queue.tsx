"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check, X, RefreshCw, Send, AlertTriangle, Pencil, ClipboardCheck, Save,
} from "lucide-react";
import {
  Card, CardContent, Button, Input, Textarea, Badge, Label, EmptyState,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { AlumniBadge, PriorityBadge } from "@/components/badges";
import { OUTREACH_TYPE_LABELS } from "@/lib/types";
import {
  reviewDraft, regenerateDraft, updateDraft, type ReviewAction,
} from "@/server/actions/outreach";
import { sendOutreach } from "@/server/actions/integrations";

export interface ReviewDraftDTO {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string | null;
  title: string | null;
  company: string | null;
  industry: string | null;
  priority: string;
  score: number;
  isStanfordAlum: boolean;
  isSCAlum: boolean;
  warmConnectionType: string;
  type: string;
  subject: string;
  body: string;
  followUp1: string;
  followUp2: string;
  personalizationNote: string;
  confidenceScore: number;
  warnings: string[];
  selectionReason: string;
}

export function ReviewQueue({ drafts, emailLive }: { drafts: ReviewDraftDTO[]; emailLive: boolean }) {
  if (drafts.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="h-8 w-8" />}
        title="Review queue is empty"
        description="Generate drafts from the Outreach page and they'll appear here for review before sending."
      />
    );
  }
  return (
    <div className="space-y-4">
      {drafts.map((d) => (
        <DraftCard key={d.id} draft={d} emailLive={emailLive} />
      ))}
    </div>
  );
}

function DraftCard({ draft, emailLive }: { draft: ReviewDraftDTO; emailLive: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [editing, setEditing] = React.useState(false);
  const [subject, setSubject] = React.useState(draft.subject);
  const [body, setBody] = React.useState(draft.body);
  const [fu1, setFu1] = React.useState(draft.followUp1);
  const [fu2, setFu2] = React.useState(draft.followUp2);
  const [showFollowUps, setShowFollowUps] = React.useState(false);

  const edits = { subject, body, followUp1: fu1, followUp2: fu2 };

  function act(action: ReviewAction) {
    start(async () => {
      await reviewDraft(draft.id, action, edits);
      const verb = action === "approve" ? "approved" : action === "reject" ? "rejected" : "marked ready to send";
      toast(`Draft ${verb}.`, action === "reject" ? "info" : "success");
      router.refresh();
    });
  }
  function saveEdits() {
    start(async () => {
      await updateDraft(draft.id, edits);
      setEditing(false);
      toast("Draft saved.", "success");
      router.refresh();
    });
  }
  function regen() {
    start(async () => {
      await regenerateDraft(draft.id);
      toast("Draft regenerated.", "success");
      router.refresh();
    });
  }
  function approveAndSend() {
    if (!draft.leadEmail) { toast("This lead has no email address.", "error"); return; }
    const real = emailLive ? "This sends a REAL email" : "Mailbox is mock — this will simulate a send";
    if (!confirm(`Approve and send to ${draft.leadEmail}? ${real}.`)) return;
    start(async () => {
      // Persist any edits, approve, then send.
      await reviewDraft(draft.id, "approve", edits);
      const res = await sendOutreach(draft.leadId, draft.id);
      toast(res.message, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  const confTone = draft.confidenceScore >= 75 ? "green" : draft.confidenceScore >= 50 ? "amber" : "red";

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Left: context */}
          <div className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{draft.leadName}</span>
              <PriorityBadge priority={draft.priority} />
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{draft.title}{draft.company ? ` · ${draft.company}` : ""}</p>
            <div className="mt-2"><AlumniBadge isStanfordAlum={draft.isStanfordAlum} isSCAlum={draft.isSCAlum} warmConnectionType={draft.warmConnectionType} /></div>

            <div className="mt-3 space-y-2 text-xs">
              <div>
                <Label>Why this lead</Label>
                <p className="text-slate-600">{draft.selectionReason}</p>
              </div>
              <div>
                <Label>Personalization source</Label>
                <p className="text-slate-600">{draft.personalizationNote || "—"}</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Badge tone="slate">{OUTREACH_TYPE_LABELS[draft.type] ?? draft.type}</Badge>
                <Badge tone={confTone}>confidence {draft.confidenceScore}</Badge>
              </div>
            </div>

            {draft.warnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" /> Warnings
                </div>
                <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700">
                  {draft.warnings.map((w, i) => (<li key={i}>{w}</li>))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: editable draft */}
          <div className="p-4 lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <Label>Subject</Label>
              {!editing ? (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={saveEdits} disabled={pending}><Save className="h-3.5 w-3.5" /> Save edits</Button>
              )}
            </div>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!editing} className="mb-3" />
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={!editing} rows={8} className="mt-1 font-mono text-[13px]" />

            <button onClick={() => setShowFollowUps((s) => !s)} className="mt-2 text-xs font-medium text-cardinal-700 hover:underline">
              {showFollowUps ? "Hide" : "Show"} follow-ups
            </button>
            {showFollowUps && (
              <div className="mt-2 space-y-2">
                <div>
                  <Label>Follow-up 1</Label>
                  <Textarea value={fu1} onChange={(e) => setFu1(e.target.value)} disabled={!editing} rows={4} className="mt-1 font-mono text-[13px]" />
                </div>
                <div>
                  <Label>Follow-up 2</Label>
                  <Textarea value={fu2} onChange={(e) => setFu2(e.target.value)} disabled={!editing} rows={4} className="mt-1 font-mono text-[13px]" />
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="success" size="sm" onClick={() => act("approve")} disabled={pending}><Check className="h-3.5 w-3.5" /> Approve</Button>
              <Button variant="primary" size="sm" onClick={approveAndSend} disabled={pending || !draft.leadEmail} title={draft.leadEmail ? "" : "No email on file"}><Send className="h-3.5 w-3.5" /> Approve &amp; send</Button>
              <Button variant="secondary" size="sm" onClick={() => act("ready_to_send")} disabled={pending}>Mark ready</Button>
              <Button variant="outline" size="sm" onClick={regen} disabled={pending}><RefreshCw className="h-3.5 w-3.5" /> Regenerate</Button>
              <Button variant="danger" size="sm" onClick={() => act("reject")} disabled={pending}><X className="h-3.5 w-3.5" /> Reject</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
