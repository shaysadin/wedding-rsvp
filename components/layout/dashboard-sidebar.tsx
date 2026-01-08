"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserRole } from "@prisma/client";
import { SidebarNavItem } from "@/types";
import { Menu, PanelLeftClose, PanelRightClose } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RoleSwitcher } from "@/components/dashboard/role-switcher";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { AppLogo } from "@/components/shared/app-logo";
import { Icons } from "@/components/shared/icons";
import { WorkspaceSelectorClient } from "@/components/workspaces/workspace-selector-client";

interface DashboardSidebarProps {
  links: SidebarNavItem[];
  currentRole?: UserRole;
  availableRoles?: UserRole[];
}

export function DashboardSidebar({ links, currentRole, availableRoles = [] }: DashboardSidebarProps) {
  const path = usePathname();
  const t = useTranslations();

  // Extract locale from path
  const locale = path?.split("/")[1] || "he";
  const isRTL = locale === "he";

  // Helper function for translations
  const getTitle = (titleKey?: string, fallback?: string) => {
    if (!titleKey) return fallback || "";
    try {
      const parts = titleKey.split(".");
      if (parts.length === 2) {
        return t(`${parts[0]}.${parts[1]}` as any) || fallback;
      }
      return fallback || "";
    } catch {
      return fallback || "";
    }
  };

  const { isTablet } = useMediaQuery();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(!isTablet);

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  useEffect(() => {
    setIsSidebarExpanded(!isTablet);
  }, [isTablet]);

  // Check if current path matches the item href (accounting for locale prefix)
  const isPathActive = (href: string) => {
    if (!path) return false;
    // Remove locale prefix from path for comparison
    const pathWithoutLocale = path.replace(`/${locale}`, "") || "/";
    return pathWithoutLocale === href;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          isSidebarExpanded ? "w-[220px] xl:w-[260px]" : "w-[68px]",
          "sticky top-0 hidden h-screen flex-col bg-sidebar border-e border-sidebar-border md:flex",
        )}
      >
        {/* Fixed Header - Logo */}
        <div className="flex h-14 shrink-0 items-center p-4 lg:h-[60px]">
          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center"
          >
            <AppLogo size={isSidebarExpanded ? "md" : "sm"} />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="size-9 lg:size-8 ms-auto"
            onClick={toggleSidebar}
          >
            {isSidebarExpanded ? (
              <PanelLeftClose
                size={18}
                className="stroke-muted-foreground rtl:rotate-180"
              />
            ) : (
              <PanelRightClose
                size={18}
                className="stroke-muted-foreground rtl:rotate-180"
              />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>

        {/* Fixed Role Switcher - only visible for users with multiple roles */}
        {currentRole && availableRoles.length > 1 && (
          <div className="shrink-0 px-4 pb-2">
            <RoleSwitcher
              currentRole={currentRole}
              availableRoles={availableRoles}
              expanded={isSidebarExpanded}
            />
          </div>
        )}

        {/* Workspace Selector - for Business plan users with multiple workspaces */}
        {isSidebarExpanded && (
          <div className="shrink-0 px-4 pb-2">
            <WorkspaceSelectorClient />
          </div>
        )}

        {/* Scrollable Navigation */}
        <ScrollArea className="flex-1 min-h-0">
          <nav className="flex flex-col gap-6 px-4 py-4">
                {links.map((section) => (
                  <section
                    key={section.title}
                    className="flex flex-col gap-0.5"
                  >
                    {isSidebarExpanded ? (
                      <p className="text-xs text-muted-foreground rtl:text-end">
                        {getTitle(section.titleKey, section.title)}
                      </p>
                    ) : (
                      <div className="h-4" />
                    )}
                    {section.items.map((item) => {
                      const Icon = Icons[item.icon || "arrowRight"];
                      const itemTitle = getTitle(item.titleKey, item.title);

                      return (
                        item.href && (
                          <Fragment key={`link-fragment-${item.title}`}>
                            {isSidebarExpanded ? (
                              <Link
                                key={`link-${item.title}`}
                                href={item.disabled ? "#" : `/${locale}${item.href}`}
                                className={cn(
                                  "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted rtl:flex-row-reverse",
                                  isPathActive(item.href)
                                    ? "bg-background/80"
                                    : "text-muted-foreground hover:text-accent-foreground",
                                  item.disabled &&
                                    "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                                )}
                              >
                                <Icon className="size-5 shrink-0" />
                                {itemTitle}
                                {item.badge && (
                                  <Badge className="ms-auto flex size-5 shrink-0 items-center justify-center rounded-full">
                                    {item.badge}
                                  </Badge>
                                )}
                              </Link>
                            ) : (
                              <Tooltip key={`tooltip-${item.title}`}>
                                <TooltipTrigger asChild>
                                  <Link
                                    key={`link-tooltip-${item.title}`}
                                    href={item.disabled ? "#" : `/${locale}${item.href}`}
                                    className={cn(
                                      "flex items-center gap-3 rounded-md py-2 text-sm font-medium hover:bg-muted",
                                      isPathActive(item.href)
                                        ? "bg-background/80"
                                        : "text-muted-foreground hover:text-accent-foreground",
                                      item.disabled &&
                                        "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                                    )}
                                  >
                                    <span className="flex size-full items-center justify-center">
                                      <Icon className="size-5" />
                                    </span>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent side={isRTL ? "left" : "right"}>
                                  {itemTitle}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </Fragment>
                        )
                      );
                    })}
                  </section>
                ))}
          </nav>
        </ScrollArea>

        {/* Fixed Footer - Upgrade Card */}
        <div className="shrink-0 p-4">
          {isSidebarExpanded ? <UpgradeCard /> : null}
        </div>
      </aside>
    </TooltipProvider>
  );
}

export function MobileSheetSidebar({ links, currentRole, availableRoles = [] }: DashboardSidebarProps) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { isSm, isMobile } = useMediaQuery();
  const t = useTranslations();

  // Extract locale from path
  const locale = path?.split("/")[1] || "he";
  const isRTL = locale === "he";

  // Helper function for translations
  const getTitle = (titleKey?: string, fallback?: string) => {
    if (!titleKey) return fallback || "";
    try {
      const parts = titleKey.split(".");
      if (parts.length === 2) {
        return t(`${parts[0]}.${parts[1]}` as any) || fallback;
      }
      return fallback || "";
    } catch {
      return fallback || "";
    }
  };

  // Check if current path matches the item href (accounting for locale prefix)
  const isPathActive = (href: string) => {
    if (!path) return false;
    // Remove locale prefix from path for comparison
    const pathWithoutLocale = path.replace(`/${locale}`, "") || "/";
    return pathWithoutLocale === href;
  };

  if (isSm || isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 md:hidden"
          >
            <Menu className="size-5" />
            <span className="sr-only">{t("common.menu")}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side={isRTL ? "right" : "left"} className="flex h-full flex-col p-0">
          <SheetTitle className="sr-only">{t("common.menu")}</SheetTitle>
          {/* Fixed Header - Logo */}
          <div className="shrink-0 p-6 pb-0">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center"
              onClick={() => setOpen(false)}
            >
              <AppLogo size="lg" />
            </Link>

            {/* Role Switcher - only visible for users with multiple roles */}
            {currentRole && availableRoles.length > 1 && (
              <div className="mt-4">
                <RoleSwitcher
                  currentRole={currentRole}
                  availableRoles={availableRoles}
                  expanded={true}
                />
              </div>
            )}

            {/* Workspace Selector - for Business plan users with multiple workspaces */}
            <div className="mt-4">
              <WorkspaceSelectorClient />
            </div>
          </div>

          {/* Scrollable Navigation */}
          <ScrollArea className="flex-1 min-h-0">
            <nav className="flex flex-col gap-6 p-6 text-lg font-medium">
              {links.map((section) => (
                  <section
                    key={section.title}
                    className="flex flex-col gap-0.5"
                  >
                    <p className="text-xs text-muted-foreground rtl:text-end">
                      {getTitle(section.titleKey, section.title)}
                    </p>

                    {section.items.map((item) => {
                      const Icon = Icons[item.icon || "arrowRight"];
                      const itemTitle = getTitle(item.titleKey, item.title);

                      return (
                        item.href && (
                          <Fragment key={`link-fragment-${item.title}`}>
                            <Link
                              key={`link-${item.title}`}
                              onClick={() => {
                                if (!item.disabled) setOpen(false);
                              }}
                              href={item.disabled ? "#" : `/${locale}${item.href}`}
                              className={cn(
                                "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted rtl:flex-row-reverse",
                                isPathActive(item.href)
                                  ? "bg-background/80"
                                  : "text-muted-foreground hover:text-accent-foreground",
                                item.disabled &&
                                  "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                              )}
                            >
                              <Icon className="size-5 shrink-0" />
                              {itemTitle}
                              {item.badge && (
                                <Badge className="ms-auto flex size-5 shrink-0 items-center justify-center rounded-full">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          </Fragment>
                        )
                      );
                    })}
                  </section>
                ))}
            </nav>
          </ScrollArea>

          {/* Fixed Footer - Upgrade Card */}
          <div className="shrink-0 p-6 pt-2">
            <UpgradeCard />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex size-9 animate-pulse rounded-lg bg-muted md:hidden" />
  );
}
