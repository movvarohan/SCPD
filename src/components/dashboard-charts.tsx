"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { LEAD_STATUS_LABELS } from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  csv_alumni: "Alumni CSV",
  csv_generic: "Lead CSV",
  apollo: "Apollo",
  clay: "Clay",
  manual: "Manual",
};

const PRIORITY_COLORS: Record<string, string> = {
  High: "#dc2626",
  Medium: "#f59e0b",
  Low: "#94a3b8",
};

export function StatusChart({ data }: { data: { status: string; count: number }[] }) {
  const chartData = data
    .map((d) => ({ name: LEAD_STATUS_LABELS[d.status] ?? d.status, count: d.count }))
    .sort((a, b) => b.count - a.count);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          angle={-35}
          textAnchor="end"
          interval={0}
          height={60}
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip
          cursor={{ fill: "#f8fafc" }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey="count" fill="#8c1515" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SourceChart({ data }: { data: { source: string; count: number }[] }) {
  const chartData = data.map((d) => ({
    name: SOURCE_LABELS[d.source] ?? d.source,
    count: d.count,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis
          type="category"
          dataKey="name"
          width={80}
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <Tooltip
          cursor={{ fill: "#f8fafc" }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey="count" fill="#475569" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PriorityChart({ data }: { data: { priority: string; count: number }[] }) {
  const order = ["High", "Medium", "Low"];
  const chartData = order
    .map((p) => ({ name: p, value: data.find((d) => d.priority === p)?.count ?? 0 }))
    .filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
