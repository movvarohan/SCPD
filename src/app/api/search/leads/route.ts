import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fullNameOf } from "@/lib/utils";
import { rateLimit, tooManyRequests } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Quick search for the command palette. Session-gated.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Palette fires on keystrokes; allow a generous burst then throttle.
  const rl = rateLimit(`search:${user.id}`, 60, 60_000);
  if (!rl.ok) return tooManyRequests(rl);

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ results: [] });

  const leads = await db.lead.findMany({
    where: {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { score: "desc" },
    take: 8,
  });
  return Response.json({
    results: leads.map((l) => ({
      id: l.id,
      name: fullNameOf(l),
      company: l.companyName,
      title: l.title,
    })),
  });
}
