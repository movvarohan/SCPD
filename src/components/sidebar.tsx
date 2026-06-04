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
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/import", label: "Import", icon: Upload, admin: true },
  { href: "/source", label: "Source Leads", icon: Radar, admin: true },
  { href: "/outreach", label: "Outreach", icon: PenLine },
  { href: "/review", label: "Review Queue", icon: ClipboardCheck },
  { href: "/tracking", label: "Sending & Tracking", icon: Send },
  { href: "/assignments", label: "Assignments", icon: UserCheck, admin: true },
  { href: "/scoring", label: "Scoring Rules", icon: SlidersHorizontal, admin: true },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cardinal-600 text-sm font-bold text-white">
          SC
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">Sourcing Engine</div>
          <div className="text-[11px] text-slate-500">Stanford Consulting</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const restricted = item.admin && role !== "ADMIN";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-cardinal-50 text-cardinal-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                restricted && "opacity-60"
              )}
              title={restricted ? "Admin only — view limited" : undefined}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {restricted && (
                <span className="text-[10px] uppercase text-slate-400">admin</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3 text-[11px] text-slate-400">
        Agent-assisted sourcing · human review required before sending.
      </div>
    </aside>
  );
}
