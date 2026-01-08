import createMiddleware from "next-intl/middleware";

// Define locales inline to avoid import issues in edge runtime
const locales = ["he", "en"] as const;
const defaultLocale = "he";

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches - Hebrew is the default
  defaultLocale,

  // Always show locale prefix in URL
  localePrefix: "always",

  // Don't detect locale from browser - use Hebrew as default
  // This ensures Hebrew is shown by default for all users
  localeDetection: false,
});

export const config = {
  // Match only internationalized pathnames
  // Skip API routes, static files, images, etc.
  matcher: [
    // Match all pathnames except for
    // - ... if they start with `/api`, `/_next` or `/_vercel`
    // - ... the ones containing a dot (e.g. `favicon.ico`)
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
