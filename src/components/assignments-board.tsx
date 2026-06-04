"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCheck, Sparkles, Plus, Save } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Select, Input, Textarea, Label, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import {
  FUNCTIONS, FUNCTION_LABELS, AVAILABILITY_OPTIONS,
} from "@/lib/types";
import { assignLeadToPD, upsertPDProfile, createPD } from "@/server/actions/assignment";

export interface PDDTO {
  id: string; name: string; email: string;
  industries: string[]; functions: string[]; availability: string;
  activeLeadCount: number; notes: string;
}
export interface AssignLeadDTO {
  id: string; name: string; company: string | null; industry: string | null;
  status: string; priority: string; assignedPDId: string | null;
  recommendation: { pdId: string; explanation: string } | null;
}

export function AssignmentsBoard({
  leads, pds,
}: {
  leads: AssignLeadDTO[]; pds: PDDTO[];
}) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Replied / booked leads to assign ({leads.filter((l) => !l.assignedPDId).length} unassigned)
        </h2>
        {leads.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-slate-400">No replied or booked leads yet. Update statuses on the Tracking page.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {leads.map((l) => (
              <AssignRow key={l.id} lead={l} pds={pds} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Project Directors ({pds.length})</h2>
          <NewPDButton />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pds.map((pd) => (
            <PDCard key={pd.id} pd={pd} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AssignRow({ lead, pds }: { lead: AssignLeadDTO; pds: PDDTO[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const recommendedPD = pds.find((p) => p.id === lead.recommendation?.pdId);

  function assign(pdId: string) {
    start(async () => {
      await assignLeadToPD(lead.id, pdId || null);
      toast(pdId ? `Assigned ${lead.name}.` : `Unassigned ${lead.name}.`, "success");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-cardinal-700">{lead.name}</Link>
            <PriorityBadge priority={lead.priority} />
            <StatusBadge status={lead.status} />
          </div>
          <p className="text-sm text-slate-500">{lead.company}{lead.industry ? ` · ${lead.industry}` : ""}</p>
          {lead.recommendation && !lead.assignedPDId && (
            <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-cardinal-50 px-2 py-1.5 text-xs text-cardinal-800">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{lead.recommendation.explanation}</span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {recommendedPD && !lead.assignedPDId && (
            <Button size="sm" onClick={() => assign(recommendedPD.id)} disabled={pending}>
              <UserCheck className="h-3.5 w-3.5" /> Assign {recommendedPD.name.split(" ")[0]}
            </Button>
          )}
          <Select
            value={lead.assignedPDId ?? ""}
            onChange={(e) => assign(e.target.value)}
            disabled={pending}
            className="w-48"
          >
            <option value="">Unassigned</option>
            {pds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.activeLeadCount})
              </option>
            ))}
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function PDCard({ pd }: { pd: PDDTO }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [editing, setEditing] = React.useState(false);
  const [industries, setIndustries] = React.useState(pd.industries.join(", "));
  const [functions, setFunctions] = React.useState<string[]>(pd.functions);
  const [availability, setAvailability] = React.useState(pd.availability);
  const [notes, setNotes] = React.useState(pd.notes);

  function toggleFn(f: string) {
    setFunctions((arr) => (arr.includes(f) ? arr.filter((x) => x !== f) : [...arr, f]));
  }
  function save() {
    start(async () => {
      await upsertPDProfile(pd.id, {
        industries: industries.split(",").map((s) => s.trim()).filter(Boolean),
        functions, availability, notes,
      });
      setEditing(false);
      toast(`${pd.name}'s profile updated.`, "success");
      router.refresh();
    });
  }

  const availTone = availability === "high" ? "green" : availability === "medium" ? "amber" : availability === "unavailable" ? "red" : "slate";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{pd.name}</CardTitle>
          <p className="text-xs text-slate-500">{pd.email}</p>
        </div>
        <Badge tone="slate">{pd.activeLeadCount} active</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!editing ? (
          <>
            <div>
              <Label>Industries</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {pd.industries.length ? pd.industries.map((i) => <Badge key={i} tone="blue">{i}</Badge>) : <span className="text-slate-400">—</span>}
              </div>
            </div>
            <div>
              <Label>Functions</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {pd.functions.length ? pd.functions.map((f) => <Badge key={f} tone="purple">{FUNCTION_LABELS[f] ?? f}</Badge>) : <span className="text-slate-400">—</span>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Availability</span>
              <Badge tone={availTone}>{pd.availability}</Badge>
            </div>
            {pd.notes && <p className="text-xs text-slate-500">{pd.notes}</p>}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit profile</Button>
          </>
        ) : (
          <>
            <div>
              <Label>Industries (comma-separated)</Label>
              <Input value={industries} onChange={(e) => setIndustries(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Functions</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {FUNCTIONS.map((f) => (
                  <button key={f} onClick={() => toggleFn(f)} className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-inset ${functions.includes(f) ? "bg-cardinal-600 text-white ring-cardinal-600" : "bg-white text-slate-600 ring-slate-200"}`}>
                    {FUNCTION_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Availability</Label>
              <Select value={availability} onChange={(e) => setAvailability(e.target.value)} className="mt-1">
                {AVAILABILITY_OPTIONS.map((a) => (<option key={a} value={a}>{a}</option>))}
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={pending}><Save className="h-3.5 w-3.5" /> Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NewPDButton() {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  function create() {
    if (!name.trim() || !email.trim()) { toast("Name and email required.", "error"); return; }
    start(async () => {
      await createPD(name.trim(), email.trim());
      toast("PD added.", "success");
      setOpen(false); setName(""); setEmail("");
      router.refresh();
    });
  }

  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Add PD</Button>;
  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-32" />
      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-44" />
      <Button size="sm" onClick={create} disabled={pending}>Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
}
