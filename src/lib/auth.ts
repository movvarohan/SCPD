import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/password";
import type { User } from "@prisma/client";

// ---------------------------------------------------------------------------
// Session-based authentication
// ---------------------------------------------------------------------------
// The cookie holds an opaque random token; the Session table maps it to a user
// with an expiry. Sign-up creates an admin; admins invite the rest of the team.
// To swap in SSO later, replace signIn/signUp with your provider's callback and
// keep createSession() — everything else only depends on getCurrentUser().

export const AUTH_COOKIE = "sc-session";
const SESSION_DAYS = 30;

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });
  const store = await cookies();
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  store.delete(AUTH_COOKIE);
}

// Returns the signed-in user, or null. No fallback — unauthenticated requests
// are redirected to /login by the root layout.
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
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
    | "manage_team"
): boolean {
  if (!user) return false;
  const role = user.role;
  switch (action) {
    case "import":
    case "source":
    case "configure_scoring":
    case "assign":
    case "view_all":
    case "manage_team":
      return role === "ADMIN";
    case "approve_send":
    case "review":
      return role === "ADMIN" || role === "REVIEWER";
    default:
      return false;
  }
}
