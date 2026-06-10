import { db } from "@/lib/db";
import { runSeed } from "../../../../../prisma/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-time production bootstrap: loads the demo/sample dataset (users, leads,
// drafts, scoring rules, templates) into the connected database.
//   GET /api/setup/seed?secret=<CRON_SECRET>
// Safety: refuses when users already exist unless force=1 is also passed
// (force WIPES ALL DATA and reseeds — use deliberately).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || url.searchParams.get("secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userCount = await db.user.count();
  const force = url.searchParams.get("force") === "1";
  if (userCount > 0 && !force) {
    return Response.json({
      ok: false,
      skipped: `Database already has ${userCount} user(s). Pass force=1 to WIPE everything and reseed.`,
    });
  }

  await runSeed(db);
  const [users, leads, drafts] = await Promise.all([
    db.user.count(), db.lead.count(), db.outreachDraft.count(),
  ]);
  return Response.json({ ok: true, seeded: { users, leads, drafts } });
}
