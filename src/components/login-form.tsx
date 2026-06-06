"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { switchUser } from "@/server/actions/auth";
import { initialsOf, cn } from "@/lib/utils";

interface LoginUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-cardinal-50 text-cardinal-700 ring-cardinal-200",
  REVIEWER: "bg-amber-50 text-amber-700 ring-amber-200",
  PD: "bg-blue-50 text-blue-700 ring-blue-200",
};
const ROLE_DESC: Record<string, string> = {
  ADMIN: "Source, import, configure, approve & assign",
  REVIEWER: "Review and approve outreach drafts",
  PD: "Own assigned leads & booked calls",
};

export function LoginForm({ users }: { users: LoginUser[] }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [selected, setSelected] = React.useState<string | null>(null);

  function signIn(id: string) {
    setSelected(id);
    start(async () => {
      await switchUser(id);
      router.push("/");
      router.refresh();
    });
  }

  // Order: Admin, Reviewer, PDs
  const order = { ADMIN: 0, REVIEWER: 1, PD: 2 } as Record<string, number>;
  const sorted = [...users].sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));

  return (
    <div className="fixed inset-0 z-50 flex bg-white">
      {/* Left brand panel */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{ background: "radial-gradient(900px 600px at 75% 15%, #5c1212 0%, #4d1414 45%, #2c0d0d 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-extrabold tracking-wide ring-1 ring-white/20">SC</div>
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Stanford Consulting</div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">SC Sourcing Engine</h1>
          <p className="mt-4 text-lg leading-relaxed text-white/75">
            Agent-assisted client sourcing — find leads, research them, draft outreach, and book calls. With a human in the loop.
          </p>
          <ul className="mt-8 space-y-3 text-[15px] text-white/80">
            {["12 public-data sources + your alumni sheet", "Grounded research, never fabricated", "Every email reviewed before it sends"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15"><Check className="h-3 w-3" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/55">
          <ShieldCheck className="h-4 w-4" /> Internal tool · authorized SC members only
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(210,194,149,.25), transparent 60%)" }} />
      </div>

      {/* Right sign-in card */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cardinal-600 text-sm font-bold text-white">SC</div>
            <span className="font-semibold text-slate-900">SC Sourcing Engine</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-500">Choose your profile to continue. You can switch roles any time.</p>

          <div className="mt-7 space-y-2.5">
            {sorted.map((u) => (
              <button
                key={u.id}
                onClick={() => signIn(u.id)}
                disabled={pending}
                className={cn(
                  "group flex w-full items-center gap-3.5 rounded-xl border bg-white px-4 py-3.5 text-left transition-all",
                  "hover:border-cardinal-300 hover:shadow-md",
                  selected === u.id ? "border-cardinal-400 shadow-md" : "border-slate-200",
                  pending && selected !== u.id && "opacity-50"
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {initialsOf(u.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-900">{u.name}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset", ROLE_BADGE[u.role] ?? "bg-slate-100 text-slate-600 ring-slate-200")}>{u.role}</span>
                  </div>
                  <div className="truncate text-xs text-slate-500">{ROLE_DESC[u.role] ?? u.email}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-cardinal-600" />
              </button>
            ))}
          </div>

          <p className="mt-7 text-center text-xs text-slate-400">
            Demo sign-in (mock auth). Production swaps in Google / Stanford SSO — see <code className="rounded bg-slate-100 px-1">src/lib/auth.ts</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
