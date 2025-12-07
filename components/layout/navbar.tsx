"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { UserRole } from "@prisma/client";

import { docsConfig } from "@/config/docs";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { useScroll } from "@/hooks/use-scroll";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DocsSearch } from "@/components/docs/search";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NavMobile } from "@/components/layout/mobile-nav";

interface NavBarProps {
  scroll?: boolean;
  large?: boolean;
}

const navKeys = ["pricing", "blog", "documentation"] as const;

export function NavBar({ scroll = false }: NavBarProps) {
  const scrolled = useScroll(50);
  const { data: session, status } = useSession();
  const locale = useLocale();
  const t = useTranslations("marketing.nav");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  const selectedLayout = useSelectedLayoutSegment();
  const documentation = selectedLayout === "docs";

  const navLinks = [
    { titleKey: "pricing", href: "/pricing" },
    { titleKey: "blog", href: "/blog" },
    { titleKey: "documentation", href: "/docs" },
  ];

  const links = documentation ? docsConfig.mainNav : navLinks;

  return (
    <header
      className={`sticky top-0 z-40 flex w-full justify-center bg-background/80 backdrop-blur-xl transition-all ${
        scroll ? (scrolled ? "border-b" : "bg-transparent") : "border-b"
      }`}
    >
      <MaxWidthWrapper
        className="flex h-14 items-center justify-between py-4"
        large={documentation}
      >
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-1.5">
            <Icons.logo />
            <span className="font-urban text-xl font-bold">
              {siteConfig.name}
            </span>
          </Link>

          {links && links.length > 0 ? (
            <nav className="hidden gap-6 md:flex">
              {links.map((item, index) => (
                <Link
                  key={index}
                  href={"disabled" in item && item.disabled ? "#" : item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center text-lg font-medium transition-colors hover:text-foreground/80 sm:text-sm",
                    item.href.startsWith(`/${selectedLayout}`)
                      ? "text-foreground"
                      : "text-foreground/80",
                    "disabled" in item && item.disabled && "cursor-not-allowed opacity-80",
                  )}
                >
                  {"titleKey" in item ? t(item.titleKey) : item.title}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="flex items-center space-x-3">
          {/* right header for docs */}
          {documentation ? (
            <div className="hidden flex-1 items-center space-x-4 sm:justify-end lg:flex">
              <div className="hidden lg:flex lg:grow-0">
                <DocsSearch />
              </div>
              <div className="flex lg:hidden">
                <Icons.search className="size-6 text-muted-foreground" />
              </div>
            </div>
          ) : null}

          <div className="hidden items-center space-x-2 md:flex">
            <LanguageSwitcher />
            <ModeToggle />
          </div>

          {session ? (
            <Link
              href={session.user.role === UserRole.ROLE_PLATFORM_OWNER ? "/admin" : "/dashboard"}
              className="hidden md:block"
            >
              <Button
                className="gap-2 px-5"
                variant="default"
                size="sm"
                rounded="full"
              >
                <span>{tCommon("dashboard")}</span>
              </Button>
            </Link>
          ) : status === "unauthenticated" ? (
            <Link href={`/${locale}/login`} className="hidden md:block">
              <Button
                className="gap-2 px-5"
                variant="default"
                size="sm"
                rounded="full"
              >
                <span>{tAuth("signIn")}</span>
                <Icons.arrowRight className="size-4" />
              </Button>
            </Link>
          ) : (
            <Skeleton className="hidden h-9 w-28 rounded-full lg:flex" />
          )}

          <NavMobile />
        </div>
      </MaxWidthWrapper>
    </header>
  );
}
