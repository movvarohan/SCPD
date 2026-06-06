"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, Select, Button } from "@/components/ui";
import {
  LEAD_STATUSES, LEAD_STATUS_LABELS, SENIORITY_LABELS, SENIORITIES,
} from "@/lib/types";

const SOURCE_OPTIONS = [
  { value: "csv_alumni", label: "Alumni CSV" },
  { value: "csv_generic", label: "Lead CSV" },
  { value: "apollo", label: "Apollo" },
  { value: "clay", label: "Clay" },
  { value: "sec_edgar", label: "SEC EDGAR" },
  { value: "irs_990", label: "IRS 990" },
  { value: "yc_directory", label: "YC Directory" },
  { value: "manual", label: "Manual" },
];

export function LeadFilters({
  industries,
  pds,
}: {
  industries: string[];
  pds: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  // Debounced search.
  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) setParam("q", q);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = Array.from(params.keys()).length > 0;

  const sel = (k: string) => params.get(k) ?? "";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, company, email, title…"
          className="pl-8"
        />
      </div>

      <Select value={sel("status")} onChange={(e) => setParam("status", e.target.value)} className="w-auto">
        <option value="">All statuses</option>
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
        ))}
      </Select>

      <Select value={sel("source")} onChange={(e) => setParam("source", e.target.value)} className="w-auto">
        <option value="">All sources</option>
        {SOURCE_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </Select>

      <Select value={sel("priority")} onChange={(e) => setParam("priority", e.target.value)} className="w-auto">
        <option value="">All priority</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </Select>

      <Select value={sel("seniority")} onChange={(e) => setParam("seniority", e.target.value)} className="w-auto">
        <option value="">All seniority</option>
        {SENIORITIES.map((s) => (
          <option key={s} value={s}>{SENIORITY_LABELS[s]}</option>
        ))}
      </Select>

      <Select value={sel("industry")} onChange={(e) => setParam("industry", e.target.value)} className="w-auto">
        <option value="">All industries</option>
        {industries.map((i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </Select>

      <Select value={sel("alumni")} onChange={(e) => setParam("alumni", e.target.value)} className="w-auto">
        <option value="">Any connection</option>
        <option value="sc">SC alum</option>
        <option value="stanford">Stanford alum</option>
        <option value="warm">Warm connection</option>
      </Select>

      <Select value={sel("pd")} onChange={(e) => setParam("pd", e.target.value)} className="w-auto">
        <option value="">Any PD</option>
        <option value="unassigned">Unassigned</option>
        {pds.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>

      <Select value={sel("email")} onChange={(e) => setParam("email", e.target.value)} className="w-auto">
        <option value="">Any email</option>
        <option value="has">Has email</option>
        <option value="verified">Verified email</option>
        <option value="none">No email</option>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}
