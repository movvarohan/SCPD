import { ResetForm } from "@/components/reset-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reset password · SC Sourcing Engine" };

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const reset = await db.passwordReset.findUnique({ where: { token } });
  const user = reset ? await db.user.findUnique({ where: { id: reset.userId } }) : null;

  let invalid: string | undefined;
  if (!reset || !user) invalid = "This reset link doesn't exist. Ask your admin to issue a new one.";
  else if (reset.usedAt) invalid = "This reset link was already used. Sign in with your new password, or ask for a fresh link.";
  else if (reset.expiresAt < new Date()) invalid = "This reset link has expired (links last 24 hours). Ask your admin for a new one.";

  return <ResetForm token={token} email={user?.email ?? ""} invalid={invalid} />;
}
