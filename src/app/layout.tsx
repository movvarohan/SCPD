import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { UserSwitcher } from "@/components/user-switcher";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "SC Sourcing Engine",
  description:
    "Agent-assisted client sourcing for Stanford Consulting Project Directors.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUser();
  const users = await db.user.findMany({ orderBy: { role: "asc" } });

  return (
    <html lang="en">
      <body className="font-sans">
        <ToastProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar role={current?.role ?? "PD"} />
            <div className="flex flex-1 flex-col overflow-hidden">
              <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
                <div className="md:hidden flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cardinal-600 text-xs font-bold text-white">
                    SC
                  </div>
                  <span className="text-sm font-semibold">Sourcing Engine</span>
                </div>
                <div className="hidden text-sm text-slate-500 md:block">
                  Find leads · enrich · score · draft · review · assign
                </div>
                {current && (
                  <UserSwitcher
                    users={users.map((u) => ({
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      role: u.role,
                    }))}
                    current={{
                      id: current.id,
                      name: current.name,
                      email: current.email,
                      role: current.role,
                    }}
                  />
                )}
              </header>
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
