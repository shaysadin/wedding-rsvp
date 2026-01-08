"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Menu, X, User, LogIn } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { UserRole } from "@prisma/client";

import { docsConfig } from "@/config/docs";
import { cn } from "@/lib/utils";
import { DocsSidebarNav } from "@/components/docs/sidebar-nav";
import { Icons } from "@/components/shared/icons";

import { ModeToggle } from "./mode-toggle";
import { LanguageSwitcher } from "./language-switcher";

export function NavMobile() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const selectedLayout = useSelectedLayoutSegment();
  const documentation = selectedLayout === "docs";
  const locale = useLocale();
  const t = useTranslations("marketing.nav");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  const navLinks = [
    { titleKey: "pricing", href: "/pricing" },
    { titleKey: "blog", href: "/blog" },
    { titleKey: "documentation", href: "/docs" },
  ];

  const links = documentation ? docsConfig.mainNav : navLinks;

  // prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [open]);

  return (
    <>
      {/* Mobile header icons - visible only on mobile */}
      <div className="flex items-center gap-1 md:hidden">
        {/* User/Login icon */}
        {session ? (
          <Link
            href={
              // Check if user has wedding owner role - users with both roles go to dashboard
              session.user.roles?.includes(UserRole.ROLE_WEDDING_OWNER)
                ? "/dashboard"
                : session.user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)
                  ? "/admin"
                  : "/dashboard"
            }
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <User className="size-5 text-muted-foreground" />
          </Link>
        ) : status === "unauthenticated" ? (
          <Link
            href={`/${locale}/login`}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <LogIn className="size-5 text-muted-foreground" />
          </Link>
        ) : null}

        {/* Hamburger menu button */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "rounded-full p-2 transition-colors duration-200 hover:bg-muted focus:outline-none active:bg-muted",
            open && "hover:bg-muted active:bg-muted",
          )}
        >
          {open ? (
            <X className="size-5 text-muted-foreground" />
          ) : (
            <Menu className="size-5 text-muted-foreground" />
          )}
        </button>
      </div>

      <nav
        className={cn(
          "fixed inset-0 z-50 hidden w-full overflow-auto bg-background px-5 py-16 lg:hidden",
          open && "block",
        )}
      >
        {/* Close button inside menu */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-muted"
        >
          <X className="size-5 text-muted-foreground" />
        </button>

        {/* Language & Theme toggles at top */}
        <div className="mb-6 flex items-center justify-between border-b pb-4">
          <span className="text-sm font-medium text-muted-foreground">
            {tCommon("settings")}
          </span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </div>

        <ul className="grid divide-y divide-muted">
          {links && links.length > 0 && links.map((item) => (
            <li key={item.href} className="py-3">
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex w-full font-medium capitalize"
              >
                {"titleKey" in item ? t(item.titleKey) : item.title}
              </Link>
            </li>
          ))}

          {session ? (
            <>
              {/* Show admin link only for users with platform owner role */}
              {session.user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER) && (
                <li className="py-3">
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-2 font-medium capitalize"
                  >
                    <Icons.settings className="size-4" />
                    {tCommon("admin")}
                  </Link>
                </li>
              )}

              {/* Show dashboard link for users with wedding owner role */}
              {session.user.roles?.includes(UserRole.ROLE_WEDDING_OWNER) && (
                <li className="py-3">
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-2 font-medium capitalize"
                  >
                    <Icons.dashboard className="size-4" />
                    {tCommon("dashboard")}
                  </Link>
                </li>
              )}
            </>
          ) : (
            <>
              <li className="py-3">
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 font-medium capitalize"
                >
                  <LogIn className="size-4" />
                  {tCommon("login")}
                </Link>
              </li>

              <li className="py-3">
                <Link
                  href={`/${locale}/register`}
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 font-medium capitalize"
                >
                  <User className="size-4" />
                  {tCommon("register")}
                </Link>
              </li>
            </>
          )}
        </ul>

        {documentation && (
          <div className="mt-8 block md:hidden">
            <DocsSidebarNav setOpen={setOpen} />
          </div>
        )}
      </nav>
    </>
  );
}
