import { db } from "@/lib/db";
import pkg from "../../../../package.json";

export const dynamic = "force-dynamic";

// Liveness/readiness probe for uptime monitoring.
export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    /* db unreachable */
  }
  return Response.json(
    { ok: dbOk, db: dbOk ? "up" : "down", version: pkg.version, time: new Date().toISOString() },
    { status: dbOk ? 200 : 503 }
  );
}
