"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutDashboard, Users, Upload, Radar, PenLine, ClipboardCheck,
  Send, UserCheck, SlidersHorizontal, Settings, LifeBuoy, CornerDownLeft,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem { type: "nav"; label: string; href: string; icon: React.ElementType }
interface LeadItem { type: "lead"; id: string; name: string; company: string | null; title: string | null }
type Item = NavItem | LeadItem;

const NAV: NavItem[] = [
  { type: "nav", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { type: "nav", label: "Analytics", href: "/analytics", icon: BarChart3 },
  { type: "nav", label: "Leads", href: "/leads", icon: Users },
  { type: "nav", label: "Import", href: "/import", icon: Upload },
  { type: "nav", label: "Source Leads", href: "/source", icon: Radar },
  { type: "nav", label: "Outreach", href: "/outreach", icon: PenLine },
  { type: "nav", label: "Review Queue", href: "/review", icon: ClipboardCheck },
  { type: "nav", label: "Sending & Tracking", href: "/tracking", icon: Send },
  { type: "nav", label: "Assignments", href: "/assignments", icon: UserCheck },
  { type: "nav", label: "Scoring Rules", href: "/scoring", icon: SlidersHorizontal },
  { type: "nav", label: "Settings", href: "/settings", icon: Settings },
  { type: "nav", label: "Help & Assistant", href: "/help", icon: LifeBuoy },
];

// ⌘K / Ctrl+K command palette: jump to any page or search leads by name,
// company, title, or email.
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [leadResults, setLeadResults] = React.useState<LeadItem[]>([]);
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Global hotkey
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (open) {
      setQ(""); setLeadResults([]); setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced lead search
  React.useEffect(() => {
    if (q.trim().length < 2) { setLeadResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/leads?q=${encodeURIComponent(q.trim())}`);
        if (!res.ok) return;
        const data = await res.json();
        setLeadResults((data.results ?? []).map((r: Omit<LeadItem, "type">) => ({ type: "lead", ...r })));
      } catch { /* network hiccup — keep prior results */ }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const navMatches = NAV.filter((n) => !q.trim() || n.label.toLowerCase().includes(q.trim().toLowerCase()));
  const items: Item[] = [...navMatches, ...leadResults];

  React.useEffect(() => { setActive(0); }, [q, leadResults.length]);

  function go(item: Item) {
    setOpen(false);
    router.push(item.type === "nav" ? item.href : `/leads/${item.id}`);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && items[active]) { e.preventDefault(); go(items[active]); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/30 px-4 pt-[14vh] backdrop-blur-[2px]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Jump to a page or search leads…"
            className="h-12 w-full bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400">No matches.</p>
          )}
          {navMatches.length > 0 && (
            <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pages</div>
          )}
          {navMatches.map((n, i) => {
            const Icon = n.icon;
            const idx = i;
            return (
              <button key={n.href} onMouseEnter={() => setActive(idx)} onClick={() => go(n)}
                className={cn("flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm", idx === active ? "bg-slate-100 text-slate-900" : "text-slate-600")}>
                <Icon className="h-4 w-4 text-slate-400" />
                <span className="flex-1">{n.label}</span>
                {idx === active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-300" />}
              </button>
            );
          })}
          {leadResults.length > 0 && (
            <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Leads</div>
          )}
          {leadResults.map((l, i) => {
            const idx = navMatches.length + i;
            return (
              <button key={l.id} onMouseEnter={() => setActive(idx)} onClick={() => go(l)}
                className={cn("flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm", idx === active ? "bg-slate-100 text-slate-900" : "text-slate-600")}>
                <Users className="h-4 w-4 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{l.name}</span>
                  {l.company && <span className="text-slate-400"> · {l.company}</span>}
                </span>
                {idx === active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-300" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Small header affordance advertising the palette.
export function CommandPaletteHint() {
  return (
    <button
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
      className="hidden items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600 md:flex"
      title="Open command palette"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Search</span>
      <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">⌘K</kbd>
    </button>
  );
}
