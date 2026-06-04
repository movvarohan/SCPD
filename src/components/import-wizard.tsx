"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Select, Badge, Label,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  INTERNAL_FIELDS, autoDetectMapping, mapRowToLead, validateLead,
  type InternalFieldKey,
} from "@/lib/services/csv";
import { importLeads, type ImportResult } from "@/server/actions/import";
import { DUPLICATE_REASON_LABELS } from "@/lib/services/dedupe";

type Step = "upload" | "map" | "done";

export function ImportWizard() {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("upload");
  const [type, setType] = React.useState<"alumni" | "generic">("alumni");
  const [filename, setFilename] = React.useState("");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, InternalFieldKey | "">>({});
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [pending, start] = React.useTransition();

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hdrs = (res.meta.fields ?? []).filter(Boolean);
        if (!hdrs.length) {
          toast("Could not read any columns from that file.", "error");
          return;
        }
        setHeaders(hdrs);
        setRows(res.data as Record<string, string>[]);
        setMapping(autoDetectMapping(hdrs));
        setFilename(file.name);
        setStep("map");
      },
      error: () => toast("Failed to parse CSV.", "error"),
    });
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  // Preview the first rows as mapped leads with validation.
  const preview = React.useMemo(() => {
    const source = type === "alumni" ? "csv_alumni" : "csv_generic";
    return rows.slice(0, 8).map((row) => {
      const lead = mapRowToLead(row, mapping, source);
      return { lead, errors: validateLead(lead) };
    });
  }, [rows, mapping, type]);

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  function runImport() {
    start(async () => {
      const res = await importLeads({ rows, mapping, type, filename });
      setResult(res);
      setStep("done");
      toast(`Imported ${res.importedCount} leads (${res.duplicateCount} duplicates).`, "success");
      router.refresh();
    });
  }

  function reset() {
    setStep("upload"); setRows([]); setHeaders([]); setMapping({});
    setResult(null); setFilename("");
  }

  // Stepper
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "map", label: "Map & preview" },
    { key: "done", label: "Results" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${step === s.key ? "bg-cardinal-600 text-white" : "bg-slate-100 text-slate-500"}`}>
              <span>{i + 1}</span> {s.label}
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-300" />}
          </React.Fragment>
        ))}
      </div>

      {step === "upload" && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setType("alumni")}
                className={`flex-1 rounded-lg border p-4 text-left ${type === "alumni" ? "border-cardinal-500 bg-cardinal-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <div className="text-sm font-semibold text-slate-900">SC Alumni Spreadsheet</div>
                <div className="text-xs text-slate-500">Tags rows as Stanford / SC alumni and warm connections automatically.</div>
              </button>
              <button
                onClick={() => setType("generic")}
                className={`flex-1 rounded-lg border p-4 text-left ${type === "generic" ? "border-cardinal-500 bg-cardinal-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <div className="text-sm font-semibold text-slate-900">Generic Lead CSV</div>
                <div className="text-xs text-slate-500">Any exported list (Apollo, Clay, LinkedIn, etc.).</div>
              </button>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center hover:border-cardinal-400 hover:bg-cardinal-50/40">
              <Upload className="mb-2 h-8 w-8 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Click to upload a CSV</span>
              <span className="text-xs text-slate-400">Columns are auto-detected and mapped in the next step.</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onInput} />
            </label>
          </CardContent>
        </Card>
      )}

      {step === "map" && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-cardinal-600" />
                  {filename} · {rows.length} rows · {mappedCount}/{headers.length} columns mapped
                </span>
              </CardTitle>
              <Badge tone="cardinal">{type === "alumni" ? "Alumni import" : "Generic import"}</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {headers.map((h) => (
                  <div key={h} className="rounded-lg border border-slate-200 p-2.5">
                    <Label>CSV column</Label>
                    <div className="mb-1.5 truncate text-sm font-medium text-slate-800">{h}</div>
                    <Select
                      value={mapping[h] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value as InternalFieldKey | "" }))}
                    >
                      <option value="">— Ignore this column —</option>
                      {INTERNAL_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Preview (first {preview.length} rows)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">Email</th>
                    <th className="px-2 py-1.5">Title</th>
                    <th className="px-2 py-1.5">Company</th>
                    <th className="px-2 py-1.5">Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{p.lead.fullName || `${p.lead.firstName ?? ""} ${p.lead.lastName ?? ""}`.trim() || "—"}</td>
                      <td className="px-2 py-1.5">{p.lead.email || p.lead.workEmail || "—"}</td>
                      <td className="px-2 py-1.5">{p.lead.title || "—"}</td>
                      <td className="px-2 py-1.5">{p.lead.companyName || "—"}</td>
                      <td className="px-2 py-1.5">
                        {p.errors.length ? (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3 w-3" /> {p.errors.join(", ")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-slate-400">
                Duplicates (matching email, LinkedIn, or name+company) are detected and skipped during import.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={reset}>Start over</Button>
            <Button onClick={runImport} disabled={pending}>
              {pending ? "Importing…" : `Import ${rows.length} rows`}
            </Button>
          </div>
        </>
      )}

      {step === "done" && result && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <h3 className="text-lg font-semibold text-slate-900">Import complete</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ResultStat label="Rows in file" value={result.rowCount} tone="slate" />
              <ResultStat label="Imported" value={result.importedCount} tone="green" />
              <ResultStat label="Duplicates skipped" value={result.duplicateCount} tone="amber" />
              <ResultStat label="Errors" value={result.errorCount} tone="red" />
            </div>
            {result.duplicateSamples.length > 0 && (
              <div className="mt-4">
                <Label>Sample duplicates</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {result.duplicateSamples.map((d, i) => (
                    <Badge key={i} tone="amber">
                      {d.name} · {DUPLICATE_REASON_LABELS[d.reason as keyof typeof DUPLICATE_REASON_LABELS] ?? d.reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <Button onClick={() => router.push("/leads")}>View leads</Button>
              <Button variant="outline" onClick={reset}>Import another file</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  const toneMap: Record<string, string> = {
    slate: "text-slate-700", green: "text-emerald-600", amber: "text-amber-600", red: "text-red-600",
  };
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className={`text-2xl font-semibold tabular-nums ${toneMap[tone]}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
