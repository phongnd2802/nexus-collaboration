import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Paths that require authentication
const protectedPaths = [
  "/dashboard",
  "/profile",
  "/projects",
  "/messages",
  "/team",
  "/calendar",
  "/tasks",
];

// Paths that do not require authentication
const publicPaths = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

// Check if the path is protected (requires auth)
function isProtected(path: string) {
  const pathWithoutLocale = path.replace(/^\/(en|vi)/, "") || "/";
  return protectedPaths.some(
    (protectedPath) =>
      pathWithoutLocale === protectedPath || pathWithoutLocale.startsWith(`${protectedPath}/`)
  );
}

// Check if the path is public (no auth required)
function isPublic(path: string) {
  const pathWithoutLocale = path.replace(/^\/(en|vi)/, "") || "/";
  return publicPaths.some(
    (publicPath) => pathWithoutLocale === publicPath || pathWithoutLocale.startsWith(`${publicPath}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 1. Handle i18n routing
  const response = handleI18nRouting(request);

  // 2. Auth check
  if (isProtected(pathname) && !token) {
    return NextResponse.redirect(
      new URL(
        `/auth/signin?callbackUrl=${encodeURIComponent(request.url)}`,
        request.url
      )
    );
  }

  if ((pathname === "/auth/signin" || pathname === "/auth/signup") && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/(en|vi)/:path*", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
