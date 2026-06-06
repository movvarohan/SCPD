import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mock-auth gate: send unauthenticated visitors to /login. Swap for real auth
// later — the only contract is the presence of the session cookie.
const AUTH_COOKIE = "sc-user-id";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Expose the path so the root layout can skip the app shell on /login.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  const pass = () => NextResponse.next({ request: { headers } });

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/samples") ||
    pathname.includes(".")
  ) {
    return pass();
  }
  if (!req.cookies.get(AUTH_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return pass();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
