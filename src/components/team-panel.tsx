"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Copy, Check, Trash2, Users } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Label, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { createInvite, revokeInvite, updateMemberRole, removeMember } from "@/server/actions/auth";
import { initialsOf, formatDate, cn } from "@/lib/utils";

export interface MemberDTO {
  id: string; name: string; email: string; role: string; createdAt: string; isYou: boolean;
}
export interface InviteDTO {
  id: string; email: string; role: string; token: string; expiresAt: string;
}

const ROLE_TONE: Record<string, "cardinal" | "amber" | "blue"> = {
  ADMIN: "cardinal", REVIEWER: "amber", PD: "blue",
};

export function TeamPanel({
  members, invites, isAdmin, baseUrl,
}: {
  members: MemberDTO[]; invites: InviteDTO[]; isAdmin: boolean; baseUrl: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("PD");
  const [copied, setCopied] = React.useState<string | null>(null);
  const [newLink, setNewLink] = React.useState<string | null>(null);

  function invite(e?: React.FormEvent) {
    e?.preventDefault();
    start(async () => {
      const res = await createInvite(email, role);
      if (!res.ok) { toast(res.error ?? "Invite failed.", "error"); return; }
      const link = `${baseUrl}/join/${res.token}`;
      setNewLink(link);
      setEmail("");
      toast(`Invite created for ${role}. Share the link below.`, "success");
      router.refresh();
    });
  }

  async function copy(link: string, key: string) {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard can be blocked — the link is visible to copy manually.
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function setMemberRole(id: string, newRole: string) {
    start(async () => {
      const res = await updateMemberRole(id, newRole);
      toast(res.ok ? "Role updated." : res.error ?? "Failed.", res.ok ? "success" : "error");
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Remove ${name} from the workspace? Their sessions end immediately.`)) return;
    start(async () => {
      const res = await removeMember(id);
      toast(res.ok ? `${name} removed.` : res.error ?? "Failed.", res.ok ? "success" : "error");
      router.refresh();
    });
  }

  function revoke(id: string) {
    start(async () => {
      await revokeInvite(id);
      toast("Invite revoked.", "success");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle><span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> Team & invites</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Invite form */}
        {isAdmin && (
          <form onSubmit={invite} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Invite a teammate</div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@stanfordconsulting.org" required className="flex-1" />
              <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-full sm:w-36">
                <option value="PD">PD</option>
                <option value="REVIEWER">Reviewer</option>
                <option value="ADMIN">Admin</option>
              </Select>
              <Button type="submit" disabled={pending}><UserPlus className="h-4 w-4" /> Invite</Button>
            </div>
            {newLink && (
              <div className="mt-2.5 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-emerald-800">{newLink}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => copy(newLink, "new")}>
                  {copied === "new" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied === "new" ? "Copied" : "Copy link"}
                </Button>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-400">Send the link however you like — it expires in 14 days and works once.</p>
          </form>
        )}

        {/* Pending invites */}
        {invites.length > 0 && (
          <div>
            <Label>Pending invites</Label>
            <div className="mt-1.5 space-y-1.5">
              {invites.map((inv) => {
                const link = `${baseUrl}/join/${inv.token}`;
                return (
                  <div key={inv.id} className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{inv.email}</span>
                    <Badge tone={ROLE_TONE[inv.role] ?? "blue"}>{inv.role}</Badge>
                    <span className="hidden text-[11px] text-slate-400 sm:block">expires {formatDate(inv.expiresAt)}</span>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => copy(link, inv.id)}>
                          {copied === inv.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => revoke(inv.id)}><Trash2 className="h-3.5 w-3.5 text-slate-400" /></Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Members */}
        <div>
          <Label>Members ({members.length})</Label>
          <div className="mt-1.5 space-y-1.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                  {initialsOf(m.name)}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {m.name} {m.isYou && <span className="text-[11px] font-normal text-slate-400">(you)</span>}
                  </div>
                  <div className="truncate text-xs text-slate-400">{m.email}</div>
                </div>
                {isAdmin ? (
                  <Select
                    value={m.role}
                    onChange={(e) => setMemberRole(m.id, e.target.value)}
                    disabled={pending}
                    className={cn("w-32", m.isYou && "opacity-90")}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="REVIEWER">Reviewer</option>
                    <option value="PD">PD</option>
                  </Select>
                ) : (
                  <Badge tone={ROLE_TONE[m.role] ?? "blue"}>{m.role}</Badge>
                )}
                {isAdmin && !m.isYou && (
                  <Button variant="ghost" size="sm" onClick={() => remove(m.id, m.name)} title="Remove member">
                    <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
