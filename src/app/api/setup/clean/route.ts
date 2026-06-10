import { db } from "@/lib/db";
import { DEMO_USER_EMAILS } from "../../../../../prisma/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-time de-staging: removes ALL sample/fictional data from the database so
// production contains only what real users create.
// Deletes: every lead/company/draft/interaction/import job, the five seeded
// demo accounts (by exact email), and any pending invites to those emails.
// Keeps: real user accounts, scoring rules, email templates, settings.
//   GET /api/setup/clean?secret=<CRON_SECRET>&confirm=1
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || url.searchParams.get("secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Ops helper: remove a single account by email (e.g., a setup-verification
  // account). Sessions cascade. Usage: ?secret=…&removeUser=email@x.com
  const removeUser = url.searchParams.get("removeUser");
  if (removeUser) {
    const res = await db.user.deleteMany({ where: { email: removeUser.toLowerCase() } });
    return Response.json({ ok: true, removedUser: removeUser, count: res.count });
  }

  if (url.searchParams.get("confirm") !== "1") {
    return Response.json({
      ok: false,
      warning: "This deletes ALL leads/companies/drafts/interactions/import jobs and the seeded demo accounts. Re-run with confirm=1.",
    });
  }

  const [interactions, drafts, leads, companies, importJobs] = await Promise.all([
    db.interaction.deleteMany(),
    db.outreachDraft.deleteMany(),
    db.lead.deleteMany(),
    db.company.deleteMany(),
    db.importJob.deleteMany(),
  ]);
  const demoUsers = await db.user.deleteMany({ where: { email: { in: DEMO_USER_EMAILS } } });
  const demoInvites = await db.invite.deleteMany({ where: { email: { in: DEMO_USER_EMAILS } } });

  const remainingUsers = await db.user.count();
  return Response.json({
    ok: true,
    removed: {
      leads: leads.count,
      companies: companies.count,
      drafts: drafts.count,
      interactions: interactions.count,
      importJobs: importJobs.count,
      demoAccounts: demoUsers.count,
      demoInvites: demoInvites.count,
    },
    remainingRealUsers: remainingUsers,
  });
}
