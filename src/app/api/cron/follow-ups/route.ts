import { runDueFollowUps } from "@/lib/services/followups";
import { getAutoSendConfig } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

// Scheduled follow-up runner for serverless/hosted deployments.
// Point a platform cron (Vercel Cron, GitHub Actions, system cron) at:
//   GET /api/cron/follow-ups        (with header  Authorization: Bearer <CRON_SECRET>)
//   or  /api/cron/follow-ups?secret=<CRON_SECRET>
// If CRON_SECRET is unset, the route is open (fine for local/dev).
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    const url = new URL(req.url);
    if (auth !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  const cfg = await getAutoSendConfig();
  if (!cfg.autoFollowUps) {
    return Response.json({ ok: true, skipped: "automatic follow-ups are off" });
  }
  const r = await runDueFollowUps();
  return Response.json({ ok: true, ...r, cadence: `${cfg.followUpDays1}/${cfg.followUpDays2}` });
}

export const GET = handle;
export const POST = handle;
