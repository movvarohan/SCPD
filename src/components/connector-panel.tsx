"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Database, Globe, Play } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { runConnector, type ConnectorResult } from "@/server/actions/sources";

interface ConnectorInfo {
  key: string; label: string; description: string;
  worksInSandbox: boolean; kind: "official_api" | "scraper";
}

export function ConnectorPanel({ connectors }: { connectors: ConnectorInfo[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [activeKey, setActiveKey] = React.useState(connectors[0]?.key ?? "");
  const [keywords, setKeywords] = React.useState("artificial intelligence");
  const [industries, setIndustries] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [limit, setLimit] = React.useState(10);
  const [result, setResult] = React.useState<ConnectorResult | null>(null);

  const active = connectors.find((c) => c.key === activeKey);

  function run() {
    start(async () => {
      const res = await runConnector(activeKey, {
        keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
        industries: industries.split(",").map((s) => s.trim()).filter(Boolean),
        location,
        limit,
      });
      setResult(res);
      if (res.error) toast(res.error, "error");
      else {
        if (res.note) toast(res.note, "info");
        toast(`${res.connector}: imported ${res.imported} leads (${res.duplicates} dupes).`, "success");
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <Database className="h-4 w-4 text-cardinal-600" /> Public source connectors
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-slate-500">
          Pull leads from public data the whole industry ignores — official registries and directories. These feed the same dedupe → score → draft → review pipeline.
        </p>

        {/* Connector picker */}
        <div className="flex flex-wrap gap-2">
          {connectors.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveKey(c.key)}
              className={`rounded-lg border p-3 text-left ${activeKey === c.key ? "border-cardinal-500 bg-cardinal-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {c.label}
                <Badge tone={c.kind === "official_api" ? "green" : "amber"}>
                  {c.kind === "official_api" ? "official API" : "scraper"}
                </Badge>
              </div>
              <div className="mt-0.5 max-w-md text-xs text-slate-500">{c.description}</div>
            </button>
          ))}
        </div>

        {active && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Keywords (comma-separated)</Label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. artificial intelligence, fintech" className="mt-1" />
              </div>
              <div>
                <Label>Industry filter (optional, matches SIC)</Label>
                <Input value={industries} onChange={(e) => setIndustries(e.target.value)} placeholder="e.g. software" className="mt-1" />
              </div>
              <div>
                <Label>Location filter (optional)</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. CA" className="mt-1" />
              </div>
              <div>
                <Label>Max leads</Label>
                <Input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="mt-1 w-28" />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Globe className="h-3.5 w-3.5" />
                {active.worksInSandbox ? "Official API — runs anywhere" : "Scraper — best on your own machine"}
              </span>
              <Button onClick={run} disabled={pending}>
                <Play className="h-4 w-4" /> {pending ? "Running…" : `Run ${active.label}`}
              </Button>
            </div>
          </>
        )}

        {result && !result.error && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap gap-4 text-slate-600">
              <span>Found <b className="text-slate-900">{result.found}</b></span>
              <span>Imported <b className="text-emerald-600">{result.imported}</b></span>
              <span>Duplicates <b className="text-amber-600">{result.duplicates}</b></span>
            </div>
            {result.note && <p className="mt-2 text-xs text-amber-700">{result.note}</p>}
            <p className="mt-1 text-xs text-slate-400">
              SEC doesn&apos;t publish emails — new leads have no address yet. Enrich them via Apollo/Clay (or verify) before outreach.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
