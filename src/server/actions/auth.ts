"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, can } from "@/lib/auth";
import { hashPassword, verifyPassword, randomToken } from "@/lib/password";
import { audit } from "@/lib/services/audit";

const INVITE_DAYS = 14;
const RESET_HOURS = 24;
// Brute-force lockout: after this many consecutive failures, lock for N minutes.
const LOCKOUT_THRESHOLD = 8;
const LOCKOUT_MINUTES = 15;

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

// --- Sign in ----------------------------------------------------------------
export async function signIn(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await db.user.findUnique({ where: { email: normEmail(email) } });

  // Lockout window active?
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    await audit("auth.signin_locked", `Locked sign-in attempt for ${normEmail(email)}`);
    return { ok: false, error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    if (user) {
      const fails = user.failedLogins + 1;
      const lock = fails >= LOCKOUT_THRESHOLD;
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLogins: lock ? 0 : fails,
          lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : null,
        },
      });
      if (lock) await audit("auth.lockout", `Account locked ${LOCKOUT_MINUTES}m after ${LOCKOUT_THRESHOLD} failures: ${user.email}`);
    }
    await audit("auth.signin_failed", `Failed sign-in for ${normEmail(email)}`);
    return { ok: false, error: "Invalid email or password." };
  }

  if (user.failedLogins > 0 || user.lockedUntil) {
    await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  }
  await createSession(user.id);
  await audit("auth.signin", `${user.email} signed in`, user);
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
  await audit("auth.signup", `${user.email} created an admin account`, user);
  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Sign out -----------------------------------------------------------------
export async function signOut() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit("auth.signout", `${user.email} signed out`, user);
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
  await audit("team.invite_created", `Invited ${normEmail(email)} as ${role}`, user);
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
  await audit("team.invite_accepted", `${user.email} joined as ${invite.role}`, user);
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
  const target = await db.user.update({ where: { id: userId }, data: { role } });
  await audit("team.role_changed", `${target.email} -> ${role}`, user);
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "manage_team")) return { ok: false, error: "Admins only." };
  if (user!.id === userId) return { ok: false, error: "You can't remove yourself." };
  const target = await db.user.findUnique({ where: { id: userId } });
  await db.session.deleteMany({ where: { userId } });
  await db.user.delete({ where: { id: userId } }).catch(() => {});
  await audit("team.member_removed", `Removed ${target?.email ?? userId}`, user);
  revalidatePath("/settings");
  return { ok: true };
}

// --- Password resets (admin-issued, one-time links) ---------------------------
export async function issuePasswordReset(
  userId: string
): Promise<{ ok: boolean; error?: string; token?: string }> {
  const actor = await getCurrentUser();
  if (!can(actor, "manage_team")) return { ok: false, error: "Admins only." };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };

  // One active reset per user.
  await db.passwordReset.deleteMany({ where: { userId, usedAt: null } });
  const token = randomToken(24);
  await db.passwordReset.create({
    data: { token, userId, expiresAt: new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000) },
  });
  await audit("auth.reset_issued", `Reset link issued for ${target.email}`, actor);
  revalidatePath("/settings");
  return { ok: true, token };
}

// Complete a reset: set the new password, revoke ALL existing sessions, sign in.
export async function completePasswordReset(
  token: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const reset = await db.passwordReset.findUnique({ where: { token } });
  if (!reset || reset.usedAt) return { ok: false, error: "This reset link is invalid or already used." };
  if (reset.expiresAt < new Date()) return { ok: false, error: "This reset link has expired — ask your admin for a new one." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const user = await db.user.update({
    where: { id: reset.userId },
    data: { passwordHash: hashPassword(password), failedLogins: 0, lockedUntil: null },
  });
  await db.session.deleteMany({ where: { userId: user.id } }); // log out everywhere
  await db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
  await createSession(user.id);
  await audit("auth.reset_completed", `${user.email} set a new password`, user);
  revalidatePath("/", "layout");
  return { ok: true };
}
