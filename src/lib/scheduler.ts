import { getAutoSendConfig } from "@/lib/services/settings";
import { runDueFollowUps } from "@/lib/services/followups";
import { runAutopilot } from "@/lib/services/autopilot";

// In-process scheduler: while "auto-run follow-ups" is enabled, it sends due
// follow-ups on the configured interval — no button, no external cron. Works
// because the app runs as a long-lived Node server (`next dev` / `next start`).
// For serverless/Vercel, use the /api/cron/follow-ups route + a platform cron.

const g = globalThis as unknown as { __scScheduler?: boolean };

export function startScheduler() {
  if (g.__scScheduler) return; // singleton (survives HMR via globalThis)
  g.__scScheduler = true;

  let running = false;
  let lastRun = 0;

  const timer = setInterval(async () => {
    if (running) return;
    try {
      const cfg = await getAutoSendConfig();
      if (!cfg.autoFollowUps || !cfg.autoRunFollowUps) return;
      const interval = Math.max(1, cfg.runIntervalMinutes) * 60 * 1000;
      if (Date.now() - lastRun < interval) return;
      running = true;
      lastRun = Date.now();
      const r = await runDueFollowUps();
      if (r.sent > 0) console.log(`[scheduler] auto-sent ${r.sent} follow-up(s) of ${r.due} due`);
      if (cfg.autopilot) {
        const a = await runAutopilot();
        if (a.sent > 0 || a.queuedForReview > 0)
          console.log(`[scheduler] autopilot: ${a.sent} sent, ${a.queuedForReview} queued for review`);
      }
    } catch (e) {
      console.error("[scheduler] error", e);
    } finally {
      running = false;
    }
  }, 60 * 1000); // check every minute; gated by the configured interval

  // Don't keep the process alive just for the timer.
  (timer as unknown as { unref?: () => void }).unref?.();
  console.log("[scheduler] follow-up scheduler started");
}
