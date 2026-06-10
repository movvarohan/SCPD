"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { WeekPoint, FunnelStage } from "@/lib/services/analytics";

const tooltipStyle = { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 };

export function TrendChart({ data }: { data: WeekPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8c1515" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#8c1515" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="replyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="sent" name="Emails sent" stroke="#8c1515" strokeWidth={2} fill="url(#sentFill)" />
        <Area type="monotone" dataKey="replies" name="Replies" stroke="#0f766e" strokeWidth={2} fill="url(#replyFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Horizontal funnel: width of each bar is proportional to the top stage.
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, stages[0]?.count ?? 1);
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = Math.max(4, Math.round((s.count / max) * 100));
        const conversion = i > 0 && stages[i - 1].count > 0
          ? `${Math.round((s.count / stages[i - 1].count) * 100)}%`
          : null;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right text-xs font-medium text-slate-500">{s.label}</div>
            <div className="relative h-8 flex-1 overflow-hidden rounded-md bg-slate-50">
              <div
                className="flex h-full items-center rounded-md bg-cardinal-700 pl-3 text-xs font-semibold text-white transition-all"
                style={{ width: `${pct}%`, opacity: 1 - i * 0.13 }}
              >
                {s.count.toLocaleString()}
              </div>
            </div>
            <div className="w-12 shrink-0 text-xs text-slate-400">{conversion ?? ""}</div>
          </div>
        );
      })}
    </div>
  );
}

export function BreakdownChart({ data, color = "#475569" }: { data: { name: string; count: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={tooltipStyle} />
        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
