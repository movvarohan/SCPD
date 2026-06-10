import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth gate: unauthenticated visitors are sent to /login. The cookie holds an
// opaque session token; the server validates it against the DB (middleware only
// checks presence — pages do the real lookup via getCurrentUser()).
const AUTH_COOKIE = "sc-session";

const PUBLIC_PREFIXES = ["/login", "/signup", "/join", "/api", "/_next", "/samples"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Expose the path so the root layout can skip the app shell on auth pages.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  const pass = () => NextResponse.next({ request: { headers } });

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname.includes(".")) {
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
