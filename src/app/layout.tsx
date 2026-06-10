import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { AccountMenu } from "@/components/account-menu";
import { CommandPalette, CommandPaletteHint } from "@/components/command-palette";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "SC Sourcing Engine",
  description:
    "Agent-assisted client sourcing for Stanford Consulting Project Directors.",
};

const AUTH_PREFIXES = ["/login", "/signup", "/join", "/reset"];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") || "";
  const isAuthPage = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  // Auth screens render without the app shell (no sidebar/header).
  if (isAuthPage) {
    return (
      <html lang="en">
        <body className="font-sans">
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    );
  }

  const current = await getCurrentUser();
  // Stale/invalid session cookie → back to login. No silent fallback user.
  if (!current) redirect("/login");

  return (
    <html lang="en">
      <body className="font-sans">
        <ToastProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar role={current.role} />
            <div className="flex flex-1 flex-col overflow-hidden">
              <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-sm">
                <div className="md:hidden flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cardinal-700 text-xs font-bold text-white">
                    SC
                  </div>
                  <span className="text-sm font-semibold">Sourcing Engine</span>
                </div>
                <CommandPaletteHint />
                <AccountMenu
                  current={{
                    id: current.id,
                    name: current.name,
                    email: current.email,
                    role: current.role,
                  }}
                />
              </header>
              <CommandPalette />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
