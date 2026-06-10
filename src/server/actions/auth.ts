"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, can } from "@/lib/auth";
import { hashPassword, verifyPassword, randomToken } from "@/lib/password";

const INVITE_DAYS = 14;

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

// --- Sign in ----------------------------------------------------------------
export async function signIn(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await db.user.findUnique({ where: { email: normEmail(email) } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Invalid email or password." };
  }
  await createSession(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Sign up (creates an Admin) ----------------------------------------------
// Internal tool: open by default so the first admin can self-serve; set
// OPEN_SIGNUP=false once your team is onboarded to make it invite-only.
export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if ((process.env.OPEN_SIGNUP ?? "true").toLowerCase() === "false") {
    const count = await db.user.count();
    if (count > 0) return { ok: false, error: "Sign-up is invite-only. Ask an admin for an invite link." };
  }
  if (!name.trim() || !email.includes("@")) return { ok: false, error: "Enter your name and a valid email." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const existing = await db.user.findUnique({ where: { email: normEmail(email) } });
  if (existing) return { ok: false, error: "An account with that email already exists — sign in instead." };

  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: normEmail(email),
      role: "ADMIN",
      passwordHash: hashPassword(password),
    },
  });
  await createSession(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Sign out -----------------------------------------------------------------
export async function signOut() {
  await destroySession();
  revalidatePath("/", "layout");
}

// --- Invites ------------------------------------------------------------------
export async function createInvite(
  email: string,
  role: string
): Promise<{ ok: boolean; error?: string; token?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "manage_team")) return { ok: false, error: "Only admins can invite team members." };
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email." };
  if (!["ADMIN", "PD", "REVIEWER"].includes(role)) return { ok: false, error: "Invalid role." };
  const existing = await db.user.findUnique({ where: { email: normEmail(email) } });
  if (existing) return { ok: false, error: "That person already has an account." };

  // Replace any prior pending invite for the same email.
  await db.invite.deleteMany({ where: { email: normEmail(email), acceptedAt: null } });
  const token = randomToken(24);
  await db.invite.create({
    data: {
      email: normEmail(email),
      role,
      token,
      invitedById: user!.id,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  revalidatePath("/settings");
  return { ok: true, token };
}

export async function revokeInvite(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!can(user, "manage_team")) return { ok: false };
  await db.invite.delete({ where: { id } }).catch(() => {});
  revalidatePath("/settings");
  return { ok: true };
}

// Accept an invite: invitee sets their name + password and is signed in.
export async function acceptInvite(
  token: string,
  name: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt) return { ok: false, error: "This invite link is invalid or already used." };
  if (invite.expiresAt < new Date()) return { ok: false, error: "This invite has expired — ask your admin for a new one." };
  if (!name.trim()) return { ok: false, error: "Enter your name." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: invite.email,
      role: invite.role,
      passwordHash: hashPassword(password),
    },
  });
  if (invite.role === "PD") {
    await db.pDProfile.create({
      data: { userId: user.id, industries: "", functions: "", availability: "medium" },
    }).catch(() => {});
  }
  await db.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await createSession(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Team management ------------------------------------------------------------
export async function updateMemberRole(userId: string, role: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "manage_team")) return { ok: false, error: "Admins only." };
  if (!["ADMIN", "PD", "REVIEWER"].includes(role)) return { ok: false, error: "Invalid role." };
  if (user!.id === userId && role !== "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) return { ok: false, error: "You're the last admin — promote someone else first." };
  }
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "manage_team")) return { ok: false, error: "Admins only." };
  if (user!.id === userId) return { ok: false, error: "You can't remove yourself." };
  await db.session.deleteMany({ where: { userId } });
  await db.user.delete({ where: { id: userId } }).catch(() => {});
  revalidatePath("/settings");
  return { ok: true };
}
