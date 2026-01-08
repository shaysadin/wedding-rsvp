import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { locales, defaultLocale } from "@/lib/i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  // Disable browser locale detection - always default to Hebrew
  localeDetection: false,
});

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n for API routes, static files, and public RSVP pages
  const shouldSkipI18n =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/rsvp") ||
    pathname.startsWith("/gift") ||
    pathname.includes(".");

  if (shouldSkipI18n) {
    return NextResponse.next();
  }

  // Apply i18n middleware
  const response = intlMiddleware(request);

  // Add pathname header for layout detection
  response.headers.set("x-pathname", pathname);

  return response;
}

export const config = {
  // Match all pathnames except for API routes, _next, static files
  // Note: rsvp routes are handled by shouldSkipI18n check in middleware function
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
