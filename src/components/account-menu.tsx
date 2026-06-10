"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { initialsOf, cn } from "@/lib/utils";

const ROLE_TONE: Record<string, string> = {
  ADMIN: "bg-cardinal-50 text-cardinal-700 ring-cardinal-100",
  PD: "bg-blue-50 text-blue-700 ring-blue-100",
  REVIEWER: "bg-amber-50 text-amber-700 ring-amber-100",
};

export function AccountMenu({
  current,
}: {
  current: { id: string; name: string; email: string; role: string };
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

  function doSignOut() {
    startTransition(async () => {
      await signOut();
      setOpen(false);
      router.push("/login");
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
          <div className="text-[11px] text-slate-400">{current.role}</div>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
              {initialsOf(current.name)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-slate-900">{current.name}</div>
              <div className="truncate text-[11px] text-slate-500">{current.email}</div>
            </div>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                ROLE_TONE[current.role] ?? "bg-slate-100 text-slate-600 ring-slate-200"
              )}
            >
              {current.role}
            </span>
          </div>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={doSignOut}
            disabled={pending}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4 text-slate-400" /> {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
