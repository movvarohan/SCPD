import { runAutopilot } from "@/lib/services/autopilot";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Daily Autopilot: fully automated research → draft → send for top leads.
// Triggered by Vercel Cron (Authorization: Bearer CRON_SECRET) or manually:
//   GET /api/cron/autopilot?secret=<CRON_SECRET>
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    const url = new URL(req.url);
    if (auth !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  const result = await runAutopilot();
  return Response.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
