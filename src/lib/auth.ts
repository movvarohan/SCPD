import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mock authentication
// ---------------------------------------------------------------------------
// For the MVP, the "current user" is stored in a cookie and can be switched
// from the header. This keeps role-based UI working without a real auth flow.
//
// TODO (real auth): replace getCurrentUser() with a session lookup
// (NextAuth / Supabase Auth / Clerk). The rest of the app only depends on the
// returned User shape, so swapping this out is isolated.

export const AUTH_COOKIE = "sc-user-id";

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const userId = store.get(AUTH_COOKIE)?.value;

  if (userId) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }
  // Default to the first admin so the app is usable out of the box.
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (admin) return admin;
  return db.user.findFirst();
}

export function can(
  user: Pick<User, "role"> | null,
  action:
    | "import"
    | "source"
    | "configure_scoring"
    | "approve_send"
    | "assign"
    | "review"
    | "view_all"
): boolean {
  if (!user) return false;
  const role = user.role;
  switch (action) {
    case "import":
    case "source":
    case "configure_scoring":
    case "assign":
    case "view_all":
      return role === "ADMIN";
    case "approve_send":
      return role === "ADMIN" || role === "REVIEWER";
    case "review":
      return role === "ADMIN" || role === "REVIEWER";
    default:
      return false;
  }
}
