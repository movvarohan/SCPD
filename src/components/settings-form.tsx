"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Label, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { updateOrgSettings, updateEmailTemplate } from "@/server/actions/settings";
import type { OrgSettings } from "@/lib/services/settings";
import { OUTREACH_TYPE_LABELS } from "@/lib/types";

interface TemplateDTO {
  id: string; name: string; type: string; subjectTemplate: string;
  bodyTemplate: string; followUp1Template: string; followUp2Template: string; enabled: boolean;
}
interface ProviderStatus { name: string; configured: boolean; mode: string }

export function SettingsForm({
  settings, templates, providers, permissions,
}: {
  settings: OrgSettings;
  templates: TemplateDTO[];
  providers: ProviderStatus[];
  permissions: { role: string; abilities: string[] }[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [form, setForm] = React.useState<OrgSettings>(settings);
  const [industries, setIndustries] = React.useState(settings.targetIndustries.join(", "));

  function set<K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    start(async () => {
      await updateOrgSettings({
        ...form,
        targetIndustries: industries.split(",").map((s) => s.trim()).filter(Boolean),
      });
      toast("Settings saved.", "success");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Organization & outreach identity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Organization name</Label>
              <Input value={form.orgName} onChange={(e) => set("orgName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Short description (used in every email)</Label>
              <Textarea value={form.orgDescription} onChange={(e) => set("orgDescription", e.target.value)} rows={3} className="mt-1" />
            </div>
            <div>
              <Label>Default sender signature</Label>
              <Textarea value={form.senderSignature} onChange={(e) => set("senderSignature", e.target.value)} rows={2} className="mt-1" />
            </div>
            <div>
              <Label>Allowed claims about SC</Label>
              <Textarea value={form.allowedClaims} onChange={(e) => set("allowedClaims", e.target.value)} rows={3} className="mt-1" />
              <p className="mt-1 text-xs text-slate-400">The LLM is instructed to never exceed these claims. Do not add specific client names unless they are approved to be referenced.</p>
            </div>
            <div>
              <Label>Target industries (comma-separated)</Label>
              <Input value={industries} onChange={(e) => setIndustries(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={save} disabled={pending}><Save className="h-4 w-4" /> Save settings</Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle><span className="inline-flex items-center gap-1.5"><KeyRound className="h-4 w-4" /> API key status</span></CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {providers.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{p.name}</span>
                  <span className="flex items-center gap-1.5">
                    {p.configured ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-300" />}
                    <Badge tone={p.configured ? "green" : "slate"}>{p.mode}</Badge>
                  </span>
                </div>
              ))}
              <p className="pt-1 text-xs text-slate-400">
                Keys are read from <code className="rounded bg-slate-100 px-1 text-[11px]">.env</code>. See README for setup.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Role permissions</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {permissions.map((p) => (
                <div key={p.role}>
                  <Badge tone={p.role === "ADMIN" ? "cardinal" : p.role === "REVIEWER" ? "amber" : "blue"}>{p.role}</Badge>
                  <ul className="mt-1 list-inside list-disc text-slate-500">
                    {p.abilities.map((a) => (<li key={a}>{a}</li>))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Email templates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {templates.map((t) => (
            <TemplateEditor key={t.id} template={t} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateEditor({ template }: { template: TemplateDTO }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [subject, setSubject] = React.useState(template.subjectTemplate);
  const [body, setBody] = React.useState(template.bodyTemplate);
  const [enabled, setEnabled] = React.useState(template.enabled);

  function save() {
    start(async () => {
      await updateEmailTemplate(template.id, { subjectTemplate: subject, bodyTemplate: body, enabled });
      toast(`Template "${template.name}" saved.`, "success");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-slate-200">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-medium text-slate-800">{OUTREACH_TYPE_LABELS[template.type] ?? template.name}</span>
        <Badge tone={enabled ? "green" : "slate"}>{enabled ? "enabled" : "disabled"}</Badge>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-100 p-4">
          <div>
            <Label>Subject template</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Body template</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="mt-1 font-mono text-[13px]" />
            <p className="mt-1 text-xs text-slate-400">Placeholders: {"{{firstName}}"}, {"{{company}}"}, {"{{industry}}"}, {"{{senderName}}"}, {"{{senderRole}}"}, {"{{signature}}"}.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-600" />
            Enabled
          </label>
          <div><Button size="sm" onClick={save} disabled={pending}><Save className="h-3.5 w-3.5" /> Save template</Button></div>
        </div>
      )}
    </div>
  );
}
