"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ShieldCheck, AlertCircle } from "lucide-react";
import { signIn } from "@/server/actions/auth";
import { Button, Input, Label } from "@/components/ui";

export function AuthBrandPanel() {
  return (
    <div
      className="relative hidden w-[44%] flex-col justify-between overflow-hidden p-12 text-white lg:flex"
      style={{ background: "radial-gradient(900px 600px at 75% 15%, #5c1212 0%, #4d1414 45%, #2c0d0d 100%)" }}
    >
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
          {["13 public-data sources + your alumni sheet", "Grounded research, never fabricated", "Fully automated, with a one-click kill switch"].map((t) => (
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
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(210,194,149,.25), transparent 60%)" }}
      />
    </div>
  );
}

export function LoginForm({ demoHint }: { demoHint: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    start(async () => {
      const res = await signIn(email, password);
      if (!res.ok) { setError(res.error ?? "Sign-in failed."); return; }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-white">
      <AuthBrandPanel />

      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cardinal-700 text-sm font-bold text-white">SC</div>
            <span className="font-semibold text-slate-900">SC Sourcing Engine</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-500">Welcome back. Enter your credentials to continue.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@stanfordconsulting.org" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" required />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New here?{" "}
            <Link href="/signup" className="font-medium text-cardinal-700 hover:underline">
              Create an admin account
            </Link>{" "}
            <span className="text-slate-300">·</span> or join with an invite link from your admin.
          </p>

          {demoHint && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Demo data loaded:</span> sign in as{" "}
              <button type="button" className="font-mono text-cardinal-700 hover:underline" onClick={() => { setEmail("admin@stanfordconsulting.org"); setPassword("demo1234"); }}>
                admin@stanfordconsulting.org
              </button>{" "}
              / <span className="font-mono">demo1234</span> (other seeded accounts use the same password).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
