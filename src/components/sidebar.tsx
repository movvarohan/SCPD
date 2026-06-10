"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Upload,
  Radar,
  PenLine,
  ClipboardCheck,
  Send,
  UserCheck,
  Settings as SettingsIcon,
  SlidersHorizontal,
  LifeBuoy,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS: {
  label: string;
  items: { href: string; label: string; icon: React.ElementType; admin?: boolean }[];
}[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/leads", label: "Leads", icon: Users },
    ],
  },
  {
    label: "Acquire",
    items: [
      { href: "/import", label: "Import", icon: Upload, admin: true },
      { href: "/source", label: "Source Leads", icon: Radar, admin: true },
    ],
  },
  {
    label: "Outreach",
    items: [
      { href: "/outreach", label: "Outreach", icon: PenLine },
      { href: "/review", label: "Review Queue", icon: ClipboardCheck },
      { href: "/tracking", label: "Sending & Tracking", icon: Send },
      { href: "/assignments", label: "Assignments", icon: UserCheck, admin: true },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/scoring", label: "Scoring Rules", icon: SlidersHorizontal, admin: true },
      { href: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
  {
    label: "Support",
    items: [{ href: "/help", label: "Help & Assistant", icon: LifeBuoy }],
  },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[244px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cardinal-700 text-[13px] font-bold text-white">
          SC
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-slate-900">Sourcing Engine</div>
          <div className="text-[11px] text-slate-400">Stanford Consulting</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                const restricted = item.admin && role !== "ADMIN";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={restricted ? "Admin only — view limited" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors",
                      active
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                      restricted && "opacity-55"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-cardinal-700" />
                    )}
                    <Icon className={cn("h-[17px] w-[17px]", active ? "text-cardinal-700" : "text-slate-400 group-hover:text-slate-600")} />
                    <span className="flex-1">{item.label}</span>
                    {restricted && <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-300">admin</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 px-5 py-3 text-[11px] leading-relaxed text-slate-400">
        Automated outreach — pause any time from the dashboard kill switch.
        <div className="mt-1 text-[10px] text-slate-300">v1.0.0</div>
      </div>
    </aside>
  );
}
