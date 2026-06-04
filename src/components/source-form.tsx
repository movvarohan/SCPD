"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Radar, Sparkles } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Label, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { sourceLeads, type SourcingResult } from "@/server/actions/sourcing";
import { SENIORITIES, SENIORITY_LABELS, COMPANY_SIZES } from "@/lib/types";

export function SourceForm({
  apolloMode, clayMode,
}: {
  apolloMode: string; clayMode: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [result, setResult] = React.useState<SourcingResult | null>(null);

  const [industries, setIndustries] = React.useState("Fintech, SaaS");
  const [titles, setTitles] = React.useState("VP of Product, Head of Growth");
  const [seniority, setSeniority] = React.useState<string[]>(["vp", "director"]);
  const [companySize, setCompanySize] = React.useState<string[]>(["11-50", "51-200"]);
  const [location, setLocation] = React.useState("San Francisco, CA");
  const [keywords, setKeywords] = React.useState("");
  const [stanfordPref, setStanfordPref] = React.useState(true);
  const [limit, setLimit] = React.useState(15);
  const [enrichWithClay, setEnrichWithClay] = React.useState(true);

  function toggle(arr: string[], value: string, set: (v: string[]) => void) {
    set(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  }

  function submit() {
    start(async () => {
      const res = await sourceLeads(
        {
          industries: industries.split(",").map((s) => s.trim()).filter(Boolean),
          titles: titles.split(",").map((s) => s.trim()).filter(Boolean),
          seniority,
          companySize,
          location,
          keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
          stanfordPreference: stanfordPref,
          limit,
        },
        { enrichWithClay }
      );
      setResult(res);
      if (res.note) toast(res.note, "info");
      toast(`Sourced ${res.imported} new leads (${res.duplicates} duplicates skipped).`, "success");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Sourcing criteria</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Target industries (comma-separated)</Label>
              <Input value={industries} onChange={(e) => setIndustries(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Target titles (comma-separated)</Label>
              <Input value={titles} onChange={(e) => setTitles(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Seniority</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SENIORITIES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggle(seniority, s, setSeniority)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${seniority.includes(s) ? "bg-cardinal-600 text-white ring-cardinal-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
                >
                  {SENIORITY_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Company size</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {COMPANY_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggle(companySize, s, setCompanySize)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${companySize.includes(s) ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Keywords (comma-separated)</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. payments, B2B" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Number of leads to pull</Label>
              <Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} className="mt-1">
                {[5, 10, 15, 25, 50].map((n) => (<option key={n} value={n}>{n}</option>))}
              </Select>
            </div>
            <div className="flex flex-col justify-end gap-2 pt-1">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={stanfordPref} onChange={(e) => setStanfordPref(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-600" />
                Prefer Stanford / alumni connections
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={enrichWithClay} onChange={(e) => setEnrichWithClay(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cardinal-600" />
                Enrich with Clay (research notes)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">Leads are deduped and scored automatically on import.</p>
            <Button onClick={submit} disabled={pending}>
              <Radar className="h-4 w-4" /> {pending ? "Sourcing…" : "Source leads"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Provider status</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ProviderRow name="Apollo" mode={apolloMode} />
            <ProviderRow name="Clay" mode={clayMode} />
            <p className="pt-1 text-xs text-slate-400">
              No keys required — mock providers generate realistic leads. Add{" "}
              <code className="rounded bg-slate-100 px-1 text-[11px]">APOLLO_API_KEY</code> /{" "}
              <code className="rounded bg-slate-100 px-1 text-[11px]">CLAY_API_KEY</code> in{" "}
              <code className="rounded bg-slate-100 px-1 text-[11px]">.env</code> to go live.
            </p>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader><CardTitle><span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-cardinal-600" /> Last run</span></CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm text-slate-600">
              <div className="flex justify-between"><span>Found</span><span className="font-medium">{result.found}</span></div>
              <div className="flex justify-between"><span>Imported</span><span className="font-medium text-emerald-600">{result.imported}</span></div>
              <div className="flex justify-between"><span>Duplicates</span><span className="font-medium text-amber-600">{result.duplicates}</span></div>
              <div className="flex justify-between"><span>Provider</span><span className="font-mono text-xs">{result.provider}</span></div>
              {result.note && (
                <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-700">{result.note}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProviderRow({ name, mode }: { name: string; mode: string }) {
  const live = !mode.includes("mock");
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-700">{name}</span>
      <Badge tone={live ? "green" : "slate"}>{mode}</Badge>
    </div>
  );
}
