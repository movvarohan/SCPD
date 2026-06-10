"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { signUp } from "@/server/actions/auth";
import { Button, Input, Label } from "@/components/ui";
import { AuthBrandPanel } from "@/components/login-form";

export function SignupForm() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    start(async () => {
      const res = await signUp(name, email, password);
      if (!res.ok) { setError(res.error ?? "Sign-up failed."); return; }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-white">
      <AuthBrandPanel />

      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create your admin account</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            You&apos;ll be the workspace admin — you can invite Reviewers and PDs from Settings once you&apos;re in.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Park" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@stanfordconsulting.org" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="password">Password (8+ characters)</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" required minLength={8} />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating account…" : "Create account & continue"} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-cardinal-700 hover:underline">Sign in</Link>
          </p>
          <p className="mt-3 text-center text-xs text-slate-400">
            Joining an existing team? Use the invite link your admin sent you.
          </p>
        </div>
      </div>
    </div>
  );
}
