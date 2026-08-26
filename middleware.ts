import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_TOKEN_COOKIE, verifyAdminToken } from "@/lib/auth";

const ADMIN_LOGIN_PATH = "/admin/login";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isAdminLogin = pathname === ADMIN_LOGIN_PATH;

  // Only protect /admin* and /api/admin*.
  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Allow the login page and login API without a token.
  if (isAdminLogin || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl.clone();
    url.pathname = ADMIN_LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await verifyAdminToken(token);
  } catch {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl.clone();
    url.pathname = ADMIN_LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
