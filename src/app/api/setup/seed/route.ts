import { db } from "@/lib/db";
import { seedConfigDefaults } from "../../../../../prisma/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Production bootstrap: loads CONFIG DEFAULTS ONLY (scoring rules + email
// templates). Idempotent and safe on a live database. It never creates users,
// leads, or any sample/fictional data — production data comes from real
// sign-ups, imports, and sourcing.
//   GET /api/setup/seed?secret=<CRON_SECRET>
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || url.searchParams.get("secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  await seedConfigDefaults(db);
  const [rules, templates] = await Promise.all([
    db.scoringRule.count(),
    db.emailTemplate.count(),
  ]);
  return Response.json({ ok: true, configDefaults: { scoringRules: rules, emailTemplates: templates } });
}
