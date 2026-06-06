import { LoginForm } from "@/components/login-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in · SC Sourcing Engine" };

export default async function LoginPage() {
  const users = await db.user.findMany({ orderBy: { role: "asc" } });
  return (
    <LoginForm
      users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))}
    />
  );
}
