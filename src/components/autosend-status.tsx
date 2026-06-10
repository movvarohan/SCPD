"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { pauseAutoSend } from "@/server/actions/settings";

// Dashboard banner shown when auto-send is ON: live daily counter + kill switch.
export function AutoSendStatus({
  autoSentToday, sentToday, dailyCap,
}: {
  autoSentToday: number; sentToday: number; dailyCap: number;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const pct = dailyCap > 0 ? Math.min(100, Math.round((autoSentToday / dailyCap) * 100)) : 0;

  function pause() {
    if (!confirm("Pause automatic sending immediately? Drafts will go to the Review Queue instead.")) return;
    start(async () => {
      await pauseAutoSend();
      toast("Auto-send paused. New drafts now require review.", "success");
      router.refresh();
    });
  }

  return (
    <div className="mb-6 rounded-lg border border-cardinal-200 bg-cardinal-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cardinal-700 text-white">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-cardinal-900">Automation is ON</div>
            <div className="text-xs text-cardinal-800/80">
              Drafts send automatically; Autopilot &amp; follow-ups run daily.{" "}
              <Link href="/settings" className="underline">Manage rules</Link>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums text-cardinal-900">
              {autoSentToday}<span className="text-sm font-normal text-cardinal-700/70"> / {dailyCap}</span>
            </div>
            <div className="text-[11px] text-cardinal-800/70">auto-sent today</div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-lg font-semibold tabular-nums text-slate-800">{sentToday}</div>
            <div className="text-[11px] text-slate-500">total sent today</div>
          </div>
          <Button variant="danger" size="sm" onClick={pause} disabled={pending}>
            <PauseCircle className="h-4 w-4" /> {pending ? "Pausing…" : "Pause auto-send"}
          </Button>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cardinal-100">
        <div className="h-full rounded-full bg-cardinal-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
