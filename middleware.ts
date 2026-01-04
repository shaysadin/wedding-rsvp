import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { locales, defaultLocale } from "@/lib/i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n for API routes, static files, and public RSVP pages
  const shouldSkipI18n =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/rsvp") ||
    pathname.includes(".");

  if (shouldSkipI18n) {
    console.log("[middleware] Skipping for:", pathname);
    return NextResponse.next();
  }

  // Apply i18n middleware
  console.log("[middleware] Applying i18n for:", pathname);
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for API routes, _next, static files
  // Note: rsvp routes are handled by shouldSkipI18n check in middleware function
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
