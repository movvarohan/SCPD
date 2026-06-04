"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, RefreshCw } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { updateScoringRule, resetScoringRules } from "@/server/actions/scoring";
import { rescoreAllLeads } from "@/server/actions/leads";
import { PRIORITY_THRESHOLDS } from "@/lib/types";

interface RuleDTO { id: string; key: string; label: string; weight: number; enabled: boolean }

export function ScoringEditor({ rules }: { rules: RuleDTO[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [local, setLocal] = React.useState(rules);

  function setWeight(id: string, weight: number) {
    setLocal((r) => r.map((x) => (x.id === id ? { ...x, weight } : x)));
    start(async () => { await updateScoringRule(id, { weight }); });
  }
  function setEnabled(id: string, enabled: boolean) {
    setLocal((r) => r.map((x) => (x.id === id ? { ...x, enabled } : x)));
    start(async () => { await updateScoringRule(id, { enabled }); });
  }
  function reset() {
    start(async () => {
      await resetScoringRules();
      toast("Scoring rules reset to defaults.", "success");
      router.refresh();
    });
  }
  function rescore() {
    start(async () => {
      const res = await rescoreAllLeads();
      toast(`Re-scored ${res.count} leads.`, "success");
      router.refresh();
    });
  }

  const maxScore = local.filter((r) => r.enabled).reduce((s, r) => s + Math.max(0, r.weight), 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Scoring weights</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset} disabled={pending}><RotateCcw className="h-3.5 w-3.5" /> Reset defaults</Button>
            <Button size="sm" onClick={rescore} disabled={pending}><RefreshCw className="h-3.5 w-3.5" /> Re-score all leads</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {local.map((rule) => (
            <div key={rule.id} className={`flex items-center gap-3 rounded-lg border p-3 ${rule.enabled ? "border-slate-200" : "border-slate-100 bg-slate-50 opacity-70"}`}>
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => setEnabled(rule.id, e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cardinal-600"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800">{rule.label}</div>
                <div className="text-[11px] text-slate-400">{rule.key}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">weight</span>
                <Input
                  type="number"
                  value={rule.weight}
                  onChange={(e) => setWeight(rule.id, Number(e.target.value))}
                  className="w-20 text-center"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader><CardTitle>How scoring works</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>Each lead accumulates points from the enabled rules above. The total determines a priority label:</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2">
              <Badge tone="red">High</Badge>
              <span className="font-mono text-xs">≥ {PRIORITY_THRESHOLDS.high}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2">
              <Badge tone="amber">Medium</Badge>
              <span className="font-mono text-xs">≥ {PRIORITY_THRESHOLDS.medium}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <Badge tone="slate">Low</Badge>
              <span className="font-mono text-xs">&lt; {PRIORITY_THRESHOLDS.medium}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">Maximum possible score with current rules: <span className="font-mono">{maxScore}</span>. Changes save automatically; click "Re-score all leads" to apply them across the database.</p>
        </CardContent>
      </Card>
    </div>
  );
}
