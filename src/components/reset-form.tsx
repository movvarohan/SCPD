"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, KeyRound } from "lucide-react";
import { completePasswordReset } from "@/server/actions/auth";
import { Button, Input, Label } from "@/components/ui";
import { AuthBrandPanel } from "@/components/login-form";

export function ResetForm({ token, email, invalid }: { token: string; email: string; invalid?: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    start(async () => {
      const res = await completePasswordReset(token, password);
      if (!res.ok) { setError(res.error ?? "Reset failed."); return; }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-white">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md">
          {invalid ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reset link not valid</h2>
              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {invalid}
              </div>
              <p className="mt-6 text-center text-sm text-slate-500">
                <Link href="/login" className="font-medium text-cardinal-700 hover:underline">Back to sign in</Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                <KeyRound className="h-5 w-5 text-cardinal-700" /> Set a new password
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                For <span className="font-medium text-slate-700">{email}</span>. You&apos;ll be signed in everywhere else gets signed out.
              </p>
              <form onSubmit={submit} className="mt-7 space-y-4">
                <div>
                  <Label htmlFor="password">New password (8+ characters)</Label>
                  <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required minLength={8} />
                </div>
                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Saving…" : "Set password & sign in"} <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
