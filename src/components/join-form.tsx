"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, Mail } from "lucide-react";
import { acceptInvite } from "@/server/actions/auth";
import { Button, Input, Label, Badge } from "@/components/ui";
import { AuthBrandPanel } from "@/components/login-form";

export function JoinForm({
  token, email, role, invalid,
}: {
  token: string; email: string; role: string; invalid?: string;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    start(async () => {
      const res = await acceptInvite(token, name, password);
      if (!res.ok) { setError(res.error ?? "Could not accept invite."); return; }
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
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Invite not valid</h2>
              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {invalid}
              </div>
              <p className="mt-6 text-center text-sm text-slate-500">
                <Link href="/login" className="font-medium text-cardinal-700 hover:underline">Back to sign in</Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Join the team</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                You&apos;ve been invited to the SC Sourcing Engine. Set up your account to get started.
              </p>

              <div className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="flex-1 truncate font-medium text-slate-800">{email}</span>
                <Badge tone={role === "ADMIN" ? "cardinal" : role === "REVIEWER" ? "amber" : "blue"}>{role}</Badge>
              </div>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="name">Your full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Park" className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="password">Choose a password (8+ characters)</Label>
                  <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" required minLength={8} />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Joining…" : "Join & continue"} <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
