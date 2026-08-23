import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";

const PUBLIC_PATHS = ["/login"];

/**
 * Redirects signed-out visitors to the login page.
 *
 * This is a convenience layer only — it is NOT the security boundary. Every
 * page and server action calls requireSession() itself, so access is still
 * enforced even if this never runs.
 *
 * (Named `proxy` per the Next.js 16 file convention that replaced `middleware`.)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = await decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except static assets and the cron endpoint, which authenticates
  // itself with CRON_SECRET rather than a user session.
  matcher: ["/((?!api/cron|_next/static|_next/image|favicon.ico).*)"],
};
