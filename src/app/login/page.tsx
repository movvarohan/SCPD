import { LoginForm } from "@/components/login-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in · SC Sourcing Engine" };

export default async function LoginPage() {
  // Show the demo-credentials hint only when the seeded demo admin exists.
  const demo = await db.user.findUnique({ where: { email: "admin@stanfordconsulting.org" } });
  return <LoginForm demoHint={Boolean(demo?.passwordHash)} />;
}
