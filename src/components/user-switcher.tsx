"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { switchUser } from "@/server/actions/auth";
import { initialsOf } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SwitchUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLE_TONE: Record<string, string> = {
  ADMIN: "bg-cardinal-50 text-cardinal-700",
  PD: "bg-blue-50 text-blue-700",
  REVIEWER: "bg-amber-50 text-amber-700",
};

export function UserSwitcher({
  users,
  current,
}: {
  users: SwitchUser[];
  current: SwitchUser;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function select(id: string) {
    startTransition(async () => {
      await switchUser(id);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:bg-slate-50"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
          {initialsOf(current.name)}
        </div>
        <div className="hidden leading-tight sm:block">
          <div className="text-xs font-semibold text-slate-900">{current.name}</div>
          <div className="text-[11px] text-slate-500">{current.role}</div>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Switch role (mock auth)
          </div>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => select(u.id)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                {initialsOf(u.name)}
              </div>
              <div className="flex-1 leading-tight">
                <div className="text-sm font-medium text-slate-900">{u.name}</div>
                <div className="text-[11px] text-slate-500">{u.email}</div>
              </div>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  ROLE_TONE[u.role] ?? "bg-slate-100 text-slate-600"
                )}
              >
                {u.role}
              </span>
              {u.id === current.id && <Check className="h-4 w-4 text-cardinal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
