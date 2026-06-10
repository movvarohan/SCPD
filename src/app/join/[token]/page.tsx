import { JoinForm } from "@/components/join-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join the team · SC Sourcing Engine" };

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { token } });

  let invalid: string | undefined;
  if (!invite) invalid = "This invite link doesn't exist. Ask your admin to send a new one.";
  else if (invite.acceptedAt) invalid = "This invite was already used. Sign in instead, or ask for a fresh invite.";
  else if (invite.expiresAt < new Date()) invalid = "This invite has expired. Ask your admin for a new link.";

  return (
    <JoinForm
      token={token}
      email={invite?.email ?? ""}
      role={invite?.role ?? "PD"}
      invalid={invalid}
    />
  );
}
