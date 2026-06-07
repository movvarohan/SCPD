"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Wand2 } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Label, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PriorityBadge, AlumniBadge } from "@/components/badges";
import {
  OUTREACH_TYPES, OUTREACH_TYPE_LABELS, OUTREACH_GOALS, OUTREACH_GOAL_LABELS,
  OUTREACH_TONES, type OutreachType,
} from "@/lib/types";
import { generateDraftsForLeads } from "@/server/actions/outreach";
import { Zap } from "lucide-react";
import type { AutoSendConfig } from "@/lib/services/settings";

interface LeadOption {
  id: string; name: string; title: string | null; company: string | null;
  industry: string | null; companySize: string | null; seniority: string | null;
  verifiedEmail: boolean; hasEmail: boolean;
  priority: string; score: number;
  isStanfordAlum: boolean; isSCAlum: boolean; warmConnectionType: string;
  hasDraft: boolean;
}

// Client mirror of the server's auto-send decision (warnings are only known at
// send time, so this is a "would auto-send" preview).
function wouldAutoSend(l: LeadOption, cfg?: AutoSendConfig): boolean {
  if (!cfg?.enabled || !l.hasEmail) return false;
  if (cfg.requireVerifiedEmail && !l.verifiedEmail) return false;
  if (l.score < cfg.minScore) return false;
  if (cfg.industries.length && !cfg.industries.some((i) => (l.industry ?? "").toLowerCase().includes(i.toLowerCase()))) return false;
  if (cfg.companySizes.length && !cfg.companySizes.includes(l.companySize ?? "")) return false;
  if (cfg.seniorities.length && !cfg.seniorities.includes(l.seniority ?? "")) return false;
  return true;
}

export function OutreachGenerator({
  leads, defaultSender, llmMode, autoSend,
}: {
  leads: LeadOption[]; defaultSender: { name: string; role: string }; llmMode: string; autoSend?: AutoSendConfig;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");

  const [senderName, setSenderName] = React.useState(defaultSender.name);
  const [senderRole, setSenderRole] = React.useState(defaultSender.role);
  const [type, setType] = React.useState<OutreachType>("stanford_alum");
  const [goal, setGoal] = React.useState("intro_call");
  const [tone, setTone] = React.useState("professional");

  const filtered = leads.filter((l) => {
    if (!q) return true;
    const hay = `${l.name} ${l.company ?? ""} ${l.title ?? ""} ${l.industry ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const autoPreviewCount = React.useMemo(
    () => leads.filter((l) => selected.has(l.id) && wouldAutoSend(l, autoSend)).length,
    [leads, selected, autoSend]
  );

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAll() { setSelected(new Set(filtered.map((l) => l.id))); }
  function clear() { setSelected(new Set()); }

  function generate() {
    if (selected.size === 0) { toast("Select at least one lead.", "error"); return; }
    start(async () => {
      const res = await generateDraftsForLeads({
        leadIds: Array.from(selected),
        senderName, senderRole, type, goal, tone,
      });
      if (res.autoSent && res.autoSent > 0) {
        toast(`Generated ${res.created} drafts — ${res.autoSent} auto-sent, ${res.toReview} to review.`, "success");
      } else {
        toast(`Generated ${res.created} drafts. Sent to the Review Queue.`, "success");
      }
      clear();
      router.refresh();
      router.push(res.autoSent && res.autoSent > 0 ? "/tracking" : "/review");
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Lead picker */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Select leads ({selected.size} selected)</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>Select all</Button>
            <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter leads…" className="pl-8" />
          </div>
          <div className="max-h-[460px] space-y-1 overflow-y-auto">
            {filtered.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No leads found.</p>}
            {filtered.map((l) => (
              <label
                key={l.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 ${selected.has(l.id) ? "border-cardinal-300 bg-cardinal-50/50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="h-4 w-4 rounded border-slate-300 text-cardinal-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">{l.name}</span>
                    {l.hasDraft && <Badge tone="blue">has draft</Badge>}
                    {wouldAutoSend(l, autoSend) && (
                      <Badge tone="cardinal"><Zap className="h-3 w-3" /> auto</Badge>
                    )}
                  </div>
                  <div className="truncate text-xs text-slate-500">{l.title}{l.company ? ` · ${l.company}` : ""}</div>
                </div>
                <AlumniBadge isStanfordAlum={l.isStanfordAlum} isSCAlum={l.isSCAlum} warmConnectionType={l.warmConnectionType} />
                <PriorityBadge priority={l.priority} />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Config */}
      <Card className="h-fit">
        <CardHeader><CardTitle>Outreach settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Sender name</Label>
              <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Sender role</Label>
              <Input value={senderRole} onChange={(e) => setSenderRole(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Email type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as OutreachType)} className="mt-1">
              {OUTREACH_TYPES.map((t) => (<option key={t} value={t}>{OUTREACH_TYPE_LABELS[t]}</option>))}
            </Select>
          </div>
          <div>
            <Label>Goal</Label>
            <Select value={goal} onChange={(e) => setGoal(e.target.value)} className="mt-1">
              {OUTREACH_GOALS.map((g) => (<option key={g} value={g}>{OUTREACH_GOAL_LABELS[g]}</option>))}
            </Select>
          </div>
          <div>
            <Label>Tone</Label>
            <Select value={tone} onChange={(e) => setTone(e.target.value)} className="mt-1">
              {OUTREACH_TONES.map((t) => (<option key={t} value={t}>{t.replace("_", " ")}</option>))}
            </Select>
          </div>

          <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>LLM engine</span>
              <Badge tone={llmMode === "mock" ? "slate" : "green"}>{llmMode}</Badge>
            </div>
            <p className="mt-1">Drafts use only stored facts and never invent details.</p>
          </div>

          {autoSend?.enabled && autoPreviewCount > 0 ? (
            <div className="rounded-lg border border-cardinal-200 bg-cardinal-50 p-2.5 text-xs text-cardinal-800">
              <div className="flex items-center gap-1.5 font-semibold">
                <Zap className="h-3.5 w-3.5" /> Dry-run preview
              </div>
              <p className="mt-1">
                <span className="font-semibold">{autoPreviewCount}</span> of {selected.size} selected match your auto-send rule and will <span className="font-semibold">send immediately</span> (pending the missing-data check). The other {selected.size - autoPreviewCount} go to the Review Queue.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Each draft goes to the Review Queue — nothing is sent automatically.</p>
          )}

          <Button className="w-full" onClick={generate} disabled={pending}>
            <Wand2 className="h-4 w-4" /> {pending ? "Generating…" : `Generate ${selected.size || ""} drafts`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
