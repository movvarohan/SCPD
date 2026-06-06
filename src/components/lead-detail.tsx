"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Linkedin, Globe, Mail, Building2, MapPin,
  Pencil, MessageSquarePlus, Trash2,
} from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Select,
  Textarea, Label, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { StatusBadge, PriorityBadge, AlumniBadge } from "@/components/badges";
import {
  LEAD_STATUSES, LEAD_STATUS_LABELS, SENIORITIES, SENIORITY_LABELS,
  WARM_CONNECTION_TYPES, WARM_CONNECTION_LABELS, COMPANY_SIZES,
  type ScoreBreakdown,
} from "@/lib/types";
import { updateLead, addInteraction, setLeadStatus, deleteLead, findEmailForLead } from "@/server/actions/leads";
import { fullNameOf, formatDateTime } from "@/lib/utils";

interface LeadDTO {
  id: string;
  firstName: string | null; lastName: string | null; fullName: string | null;
  email: string | null; personalEmail: string | null; workEmail: string | null;
  linkedinUrl: string | null; title: string | null; seniority: string | null;
  companyName: string | null; companyWebsite: string | null; industry: string | null;
  location: string | null; companySize: string | null; source: string;
  isStanfordAlum: boolean; isSCAlum: boolean; isFormerClient: boolean;
  warmConnectionType: string; warmConnectionNotes: string; verifiedEmail: boolean;
  score: number; priority: string; status: string; createdAt: string; updatedAt: string;
}

interface DraftDTO {
  id: string; type: string; subject: string; body: string;
  followUp1: string; followUp2: string; status: string; confidenceScore: number;
}
interface InteractionDTO { id: string; type: string; notes: string; date: string; by: string | null }

export function LeadDetail({
  lead, breakdown, drafts, interactions, assignedPDName,
}: {
  lead: LeadDTO;
  breakdown: ScoreBreakdown;
  drafts: DraftDTO[];
  interactions: InteractionDTO[];
  assignedPDName: string | null;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [form, setForm] = React.useState(lead);
  const [note, setNote] = React.useState("");

  function field<K extends keyof LeadDTO>(key: K, value: LeadDTO[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    start(async () => {
      await updateLead(lead.id, form as unknown as Record<string, unknown>);
      toast("Lead updated and re-scored.", "success");
      setEditing(false);
      router.refresh();
    });
  }

  function changeStatus(status: string) {
    start(async () => {
      await setLeadStatus(lead.id, status as never);
      toast(`Status set to ${LEAD_STATUS_LABELS[status]}.`, "success");
      router.refresh();
    });
  }

  function submitNote() {
    if (!note.trim()) return;
    start(async () => {
      await addInteraction(lead.id, note);
      setNote("");
      toast("Note added.", "success");
      router.refresh();
    });
  }

  function findEmail() {
    start(async () => {
      const res = await findEmailForLead(lead.id);
      toast(res.message, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  function removeLead() {
    if (!confirm("Delete this lead permanently?")) return;
    start(async () => {
      await deleteLead(lead.id);
      toast("Lead deleted.", "success");
      router.push("/leads");
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Back to leads
        </Link>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setForm(lead); setEditing(false); }}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={pending}>
                <Save className="h-3.5 w-3.5" /> Save changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={findEmail} disabled={pending} title="Find/verify email via Hunter (or guess from domain)">
                <Mail className="h-3.5 w-3.5" /> {lead.email || lead.workEmail ? "Verify email" : "Find email"}
              </Button>
              <Button variant="danger" size="sm" onClick={removeLead}><Trash2 className="h-3.5 w-3.5" /></Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Header card */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{fullNameOf(lead)}</h1>
              <PriorityBadge priority={lead.priority} />
              <Badge tone="cardinal" className="font-mono">Score {lead.score}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {lead.title}{lead.companyName ? ` · ${lead.companyName}` : ""}
            </p>
            <div className="mt-2">
              <AlumniBadge isStanfordAlum={lead.isStanfordAlum} isSCAlum={lead.isSCAlum} warmConnectionType={lead.warmConnectionType} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
              {lead.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lead.email}</span>}
              {lead.linkedinUrl && <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline"><Linkedin className="h-3.5 w-3.5" />LinkedIn</a>}
              {lead.companyWebsite && <a href={lead.companyWebsite} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-600 hover:underline"><Globe className="h-3.5 w-3.5" />Website</a>}
              {lead.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{lead.location}</span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2">
            <Label>Status</Label>
            <Select value={lead.status} onChange={(e) => changeStatus(e.target.value)} disabled={pending} className="w-48">
              {LEAD_STATUSES.map((s) => (<option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>))}
            </Select>
            {assignedPDName && <Badge tone="slate">Assigned: {assignedPDName}</Badge>}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: editable info */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Person & company</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldRow label="First name" editing={editing} value={form.firstName} onChange={(v) => field("firstName", v)} />
              <FieldRow label="Last name" editing={editing} value={form.lastName} onChange={(v) => field("lastName", v)} />
              <FieldRow label="Email" editing={editing} value={form.email} onChange={(v) => field("email", v)} />
              <FieldRow label="Work email" editing={editing} value={form.workEmail} onChange={(v) => field("workEmail", v)} />
              <FieldRow label="Personal email" editing={editing} value={form.personalEmail} onChange={(v) => field("personalEmail", v)} />
              <FieldRow label="LinkedIn URL" editing={editing} value={form.linkedinUrl} onChange={(v) => field("linkedinUrl", v)} />
              <FieldRow label="Title" editing={editing} value={form.title} onChange={(v) => field("title", v)} />
              <SelectRow label="Seniority" editing={editing} value={form.seniority ?? ""} onChange={(v) => field("seniority", v)} options={SENIORITIES.map((s) => ({ value: s, label: SENIORITY_LABELS[s] }))} />
              <FieldRow label="Company" editing={editing} value={form.companyName} onChange={(v) => field("companyName", v)} />
              <FieldRow label="Company website" editing={editing} value={form.companyWebsite} onChange={(v) => field("companyWebsite", v)} />
              <FieldRow label="Industry" editing={editing} value={form.industry} onChange={(v) => field("industry", v)} />
              <FieldRow label="Location" editing={editing} value={form.location} onChange={(v) => field("location", v)} />
              <SelectRow label="Company size" editing={editing} value={form.companySize ?? ""} onChange={(v) => field("companySize", v)} options={COMPANY_SIZES.map((s) => ({ value: s, label: s }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Alumni & warm connection</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-4">
                <Toggle label="Stanford alum" editing={editing} checked={form.isStanfordAlum} onChange={(v) => field("isStanfordAlum", v)} />
                <Toggle label="SC alum" editing={editing} checked={form.isSCAlum} onChange={(v) => field("isSCAlum", v)} />
                <Toggle label="Former client" editing={editing} checked={form.isFormerClient} onChange={(v) => field("isFormerClient", v)} />
                <Toggle label="Verified email" editing={editing} checked={form.verifiedEmail} onChange={(v) => field("verifiedEmail", v)} />
              </div>
              <SelectRow label="Warm connection type" editing={editing} value={form.warmConnectionType} onChange={(v) => field("warmConnectionType", v)} options={WARM_CONNECTION_TYPES.map((w) => ({ value: w, label: WARM_CONNECTION_LABELS[w] }))} />
              <div>
                <Label>Personalization / warm notes</Label>
                {editing ? (
                  <Textarea rows={3} value={form.warmConnectionNotes} onChange={(e) => field("warmConnectionNotes", e.target.value)} className="mt-1" />
                ) : (
                  <p className="mt-1 text-sm text-slate-600">{form.warmConnectionNotes || "—"}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Drafts */}
          <Card>
            <CardHeader><CardTitle>Outreach drafts ({drafts.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {drafts.length === 0 && (
                <p className="text-sm text-slate-400">No drafts yet. Generate one from the <Link href="/outreach" className="text-cardinal-700 hover:underline">Outreach</Link> page.</p>
              )}
              {drafts.map((d) => (
                <div key={d.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{d.subject || "(no subject)"}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">conf {d.confidenceScore}</Badge>
                      <StatusBadge status={d.status} />
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-xs text-slate-600">{d.body}</p>
                </div>
              ))}
              <Link href="/review" className="text-xs font-medium text-cardinal-700 hover:underline">Open Review Queue →</Link>
            </CardContent>
          </Card>
        </div>

        {/* Right: score, timeline, notes */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Lead score breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums text-slate-900">{breakdown.total}</span>
                <PriorityBadge priority={breakdown.priority} />
              </div>
              <div className="space-y-1.5">
                {breakdown.items.map((item) => (
                  <div key={item.key} className={`flex items-start justify-between gap-2 rounded-md px-2 py-1.5 text-xs ${item.applied ? "bg-emerald-50" : "bg-slate-50"}`}>
                    <div className="min-w-0">
                      <div className={item.applied ? "font-medium text-slate-800" : "text-slate-500"}>{item.label}</div>
                      <div className="text-[11px] text-slate-400">{item.reason}</div>
                    </div>
                    <span className={`shrink-0 font-mono ${item.applied ? "text-emerald-700" : "text-slate-300"}`}>
                      {item.applied ? `+${item.weight}` : `0`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes & comments</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" onKeyDown={(e) => e.key === "Enter" && submitNote()} />
                <Button size="icon" onClick={submitNote} disabled={pending}><MessageSquarePlus className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Status timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {interactions.map((i) => (
                  <li key={i.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cardinal-500" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700">{i.notes}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDateTime(i.date)}{i.by ? ` · ${i.by}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
                {interactions.length === 0 && <p className="text-sm text-slate-400">No activity yet.</p>}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, editing, onChange }: { label: string; value: string | null; editing: boolean; onChange: (v: string) => void; }) {
  return (
    <div>
      <Label>{label}</Label>
      {editing ? (
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1" />
      ) : (
        <p className="mt-1 truncate text-sm text-slate-700">{value || "—"}</p>
      )}
    </div>
  );
}

function SelectRow({ label, value, editing, onChange, options }: { label: string; value: string; editing: boolean; onChange: (v: string) => void; options: { value: string; label: string }[]; }) {
  return (
    <div>
      <Label>{label}</Label>
      {editing ? (
        <Select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1">
          <option value="">—</option>
          {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </Select>
      ) : (
        <p className="mt-1 text-sm text-slate-700">{options.find((o) => o.value === value)?.label || "—"}</p>
      )}
    </div>
  );
}

function Toggle({ label, checked, editing, onChange }: { label: string; checked: boolean; editing: boolean; onChange: (v: boolean) => void; }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} disabled={!editing} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-600 focus:ring-cardinal-500 disabled:opacity-60" />
      {label}
    </label>
  );
}
