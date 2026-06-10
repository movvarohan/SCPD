"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Zap, Save, AlertTriangle } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { updateAutoSend } from "@/server/actions/settings";
import type { AutoSendConfig } from "@/lib/services/settings";
import { COMPANY_SIZES, SENIORITIES, SENIORITY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AutoSendPanel({ config, emailLive }: { config: AutoSendConfig; emailLive: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [cfg, setCfg] = React.useState<AutoSendConfig>(config);
  const [industries, setIndustries] = React.useState(config.industries.join(", "));

  function set<K extends keyof AutoSendConfig>(k: K, v: AutoSendConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
  }
  function toggleIn(key: "companySizes" | "seniorities", v: string) {
    setCfg((c) => ({ ...c, [key]: c[key].includes(v) ? c[key].filter((x) => x !== v) : [...c[key], v] }));
  }

  function save() {
    start(async () => {
      await updateAutoSend({
        ...cfg,
        industries: industries.split(",").map((s) => s.trim()).filter(Boolean),
        minScore: Number(cfg.minScore) || 0,
        dailyCap: Number(cfg.dailyCap) || 0,
      });
      toast(cfg.enabled ? "Auto-send rule saved — matching drafts will send automatically." : "Auto-send saved (off).", "success");
      router.refresh();
    });
  }

  return (
    <Card className={cn(cfg.enabled && "ring-1 ring-cardinal-200")}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle><span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-cardinal-700" /> Auto-send rules</span></CardTitle>
        <Badge tone={cfg.enabled ? "cardinal" : "slate"}>{cfg.enabled ? "ON" : "off"}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[13px] text-slate-500">
          Outreach is <span className="font-medium text-slate-700">fully automated</span>: generated drafts send immediately when they match the rules below, and Autopilot drafts &amp; sends for your top leads daily. The Review Queue catches only exceptions. Pause everything any time from the dashboard.
        </p>

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-700" />
          <div>
            <div className="text-sm font-semibold text-slate-800">Automatic sending</div>
            <div className="text-xs text-slate-500">On by default. Turning this off routes every draft to the Review Queue for manual approval.</div>
          </div>
        </label>

        {cfg.enabled && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Auto-sent emails are not reviewed by a person. Cold email at volume can hurt deliverability and the SC brand — keep the cap conservative and the guardrails on.
              {!emailLive && <span className="font-medium"> Email isn&apos;t connected, so sends are simulated until you connect Gmail.</span>}
            </span>
          </div>
        )}

        {/* Criteria */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Industries (comma-separated · blank = any)</Label>
            <Input value={industries} onChange={(e) => setIndustries(e.target.value)} placeholder="e.g. Fintech, SaaS" className="mt-1" />
          </div>
          <div>
            <Label>Company size (blank = any)</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {COMPANY_SIZES.map((sz) => (
                <button key={sz} type="button" onClick={() => toggleIn("companySizes", sz)}
                  className={cn("rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset", cfg.companySizes.includes(sz) ? "bg-cardinal-700 text-white ring-cardinal-700" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>{sz}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Role / seniority (blank = any)</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SENIORITIES.map((sn) => (
                <button key={sn} type="button" onClick={() => toggleIn("seniorities", sn)}
                  className={cn("rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset", cfg.seniorities.includes(sn) ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>{SENIORITY_LABELS[sn]}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Guardrails */}
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Guardrails</div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Minimum lead score</Label>
              <Input type="number" value={cfg.minScore} onChange={(e) => set("minScore", Number(e.target.value))} className="mt-1 w-28" />
            </div>
            <div>
              <Label>Daily send cap</Label>
              <Input type="number" value={cfg.dailyCap} onChange={(e) => set("dailyCap", Number(e.target.value))} className="mt-1 w-28" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={cfg.requireVerifiedEmail} onChange={(e) => set("requireVerifiedEmail", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-700" />
              Only send to verified emails
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={cfg.skipIfWarnings} onChange={(e) => set("skipIfWarnings", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-700" />
              Skip drafts with missing-data warnings
            </label>
          </div>
        </div>

        {/* Follow-ups */}
        <div className="rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <input type="checkbox" checked={cfg.autoFollowUps} onChange={(e) => set("autoFollowUps", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-700" />
            Automatic follow-ups for sent leads
          </label>
          <p className="mt-1 text-xs text-slate-500">Sends follow-up 1 and 2 on this cadence (run from Sending &amp; Tracking → “Send due follow-ups”). Skips anyone who replied, booked, or opted out.</p>
          {cfg.autoFollowUps && (
            <>
              <div className="mt-2 flex flex-wrap items-end gap-4">
                <div>
                  <Label>Follow-up 1 (days after first email)</Label>
                  <Input type="number" value={cfg.followUpDays1} onChange={(e) => set("followUpDays1", Number(e.target.value))} className="mt-1 w-28" />
                </div>
                <div>
                  <Label>Follow-up 2 (days after first email)</Label>
                  <Input type="number" value={cfg.followUpDays2} onChange={(e) => set("followUpDays2", Number(e.target.value))} className="mt-1 w-28" />
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <input type="checkbox" checked={cfg.autoRunFollowUps} onChange={(e) => set("autoRunFollowUps", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-700" />
                  Run follow-ups automatically (hands-off)
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  When on, a background scheduler sends due follow-ups on its own — no button needed. When off, click “Send due follow-ups” on Sending &amp; Tracking.
                </p>
                {cfg.autoRunFollowUps && (
                  <div className="mt-2 flex items-end gap-2">
                    <div>
                      <Label>Check every (minutes)</Label>
                      <Input type="number" value={cfg.runIntervalMinutes} onChange={(e) => set("runIntervalMinutes", Number(e.target.value))} className="mt-1 w-28" />
                    </div>
                    <Badge tone="cardinal" className="mb-1.5">automated</Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Send window */}
        <div className="rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <input type="checkbox" checked={cfg.sendWindowEnabled} onChange={(e) => set("sendWindowEnabled", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-700" />
            Business-hours send window
          </label>
          <p className="mt-1 text-xs text-slate-500">
            Automated sends (Autopilot, scheduled follow-ups) only go out during these hours — a 9am email reads like a person, a 3am one reads like a bot. Manual sends are never blocked.
          </p>
          {cfg.sendWindowEnabled && (
            <div className="mt-2 flex flex-wrap items-end gap-4">
              <div>
                <Label>From (hour, 0–23)</Label>
                <Input type="number" min={0} max={23} value={cfg.sendWindowStart} onChange={(e) => set("sendWindowStart", Number(e.target.value))} className="mt-1 w-24" />
              </div>
              <div>
                <Label>Until (hour, 0–23)</Label>
                <Input type="number" min={0} max={23} value={cfg.sendWindowEnd} onChange={(e) => set("sendWindowEnd", Number(e.target.value))} className="mt-1 w-24" />
              </div>
              <div>
                <Label>Timezone (IANA)</Label>
                <Input value={cfg.sendTimezone} onChange={(e) => set("sendTimezone", e.target.value)} placeholder="America/Los_Angeles" className="mt-1 w-52" />
              </div>
              <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={cfg.sendWeekdaysOnly} onChange={(e) => set("sendWeekdaysOnly", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-700" />
                Weekdays only
              </label>
            </div>
          )}
        </div>

        {/* Autopilot */}
        <div className="rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <input type="checkbox" checked={cfg.autopilot} onChange={(e) => set("autopilot", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-700" />
            Autopilot — fully hands-off outreach
          </label>
          <p className="mt-1 text-xs text-slate-500">
            Once a mailbox is connected, a daily job picks your top-scored uncontacted leads, researches them, writes the email, and sends it — within the daily cap. Anything it can&apos;t send lands in the Review Queue.
          </p>
          {cfg.autopilot && (
            <div className="mt-2">
              <Label>Leads per day</Label>
              <Input type="number" value={cfg.autopilotDailyTarget} onChange={(e) => set("autopilotDailyTarget", Number(e.target.value))} className="mt-1 w-28" />
            </div>
          )}
        </div>

        <Button onClick={save} disabled={pending}><Save className="h-4 w-4" /> Save auto-send rules</Button>
      </CardContent>
    </Card>
  );
}
