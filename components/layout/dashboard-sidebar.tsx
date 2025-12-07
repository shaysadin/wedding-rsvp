"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserRole } from "@prisma/client";
import { NavItem, SidebarNavItem } from "@/types";
import { Menu, PanelLeftClose, PanelRightClose, ChevronDown, ChevronRight } from "lucide-react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RoleSwitcher } from "@/components/dashboard/role-switcher";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { Icons } from "@/components/shared/icons";

interface UserEvent {
  id: string;
  title: string;
}

interface DashboardSidebarProps {
  links: SidebarNavItem[];
  userEvents?: UserEvent[];
  currentRole?: UserRole;
  availableRoles?: UserRole[];
}

export function DashboardSidebar({ links, userEvents = [], currentRole, availableRoles = [] }: DashboardSidebarProps) {
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
  const [eventsOpen, setEventsOpen] = useState(true);

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

  // Check if current path is an event page
  const isEventActive = (eventId: string) => {
    return path?.includes(`/dashboard/events/${eventId}`);
  };

  const isEventsPage = path?.includes("/dashboard/events");

  return (
    <TooltipProvider delayDuration={0}>
      <div className="sticky top-0 h-full">
        <ScrollArea className="h-full overflow-y-auto">
          <aside
            className={cn(
              isSidebarExpanded ? "w-[220px] xl:w-[260px]" : "w-[68px]",
              "hidden h-screen bg-sidebar border-e border-sidebar-border md:block",
            )}
          >
            <div className="flex h-full max-h-screen flex-1 flex-col gap-2">
              <div className={cn(
                "flex h-14 items-center p-4 lg:h-[60px]",
                isRTL && "flex-row-reverse"
              )}>
                {isSidebarExpanded ? (
                  <Link
                    href={`/${locale}/dashboard`}
                    className={cn(
                      "flex items-center gap-2",
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500">
                      <Icons.heart className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-foreground">
                      {siteConfig.name}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href={`/${locale}/dashboard`}
                    className="flex items-center justify-center"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500">
                      <Icons.heart className="h-4 w-4 text-white" />
                    </div>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("size-9 lg:size-8", isRTL ? "me-auto" : "ms-auto")}
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

              {/* Role Switcher - only visible for users with multiple roles */}
              {currentRole && availableRoles.length > 1 && (
                <div className="px-4">
                  <RoleSwitcher
                    currentRole={currentRole}
                    availableRoles={availableRoles}
                    expanded={isSidebarExpanded}
                  />
                </div>
              )}

              <nav className="flex flex-1 flex-col gap-8 px-4 pt-4">
                {links.map((section) => (
                  <section
                    key={section.title}
                    className="flex flex-col gap-0.5"
                  >
                    {isSidebarExpanded ? (
                      <p className={cn("text-xs text-muted-foreground", isRTL && "text-right")}>
                        {getTitle(section.titleKey, section.title)}
                      </p>
                    ) : (
                      <div className="h-4" />
                    )}
                    {section.items.map((item) => {
                      const Icon = Icons[item.icon || "arrowRight"];
                      const itemTitle = getTitle(item.titleKey, item.title);
                      const isEventsItem = item.href === "/dashboard/events";

                      // For the Events item, show collapsible with sub-events
                      if (isEventsItem && userEvents.length > 0 && isSidebarExpanded) {
                        return (
                          <Collapsible
                            key={`collapsible-${item.title}`}
                            open={eventsOpen}
                            onOpenChange={setEventsOpen}
                          >
                            <div className="flex flex-col">
                              <div className={cn(
                                "flex items-center gap-1",
                                isRTL && "flex-row-reverse"
                              )}>
                                <Link
                                  href={item.href}
                                  className={cn(
                                    "flex flex-1 items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted",
                                    isRTL && "flex-row-reverse text-right",
                                    isPathActive(item.href) || isEventsPage
                                      ? "bg-background/60"
                                      : "text-muted-foreground hover:text-accent-foreground",
                                  )}
                                >
                                  <Icon className="size-5 shrink-0" />
                                  {itemTitle}
                                </Link>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7">
                                    {eventsOpen ? (
                                      <ChevronDown className="size-4" />
                                    ) : (
                                      <ChevronRight className="size-4 rtl:rotate-180" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                              <CollapsibleContent>
                                <div className={cn(
                                  "flex flex-col gap-0.5 mt-1",
                                  isRTL ? "mr-4 pr-2 border-r" : "ml-4 pl-2 border-l"
                                )}>
                                  {userEvents.map((event) => (
                                    <Link
                                      key={event.id}
                                      href={`/${locale}/dashboard/events/${event.id}`}
                                      className={cn(
                                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                                        isRTL && "flex-row-reverse text-right",
                                        isEventActive(event.id)
                                          ? "bg-background/60 font-medium"
                                          : "text-muted-foreground hover:text-accent-foreground",
                                      )}
                                    >
                                      <Icons.heart className="size-3.5 shrink-0" />
                                      <span className="truncate">{event.title}</span>
                                    </Link>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      }

                      return (
                        item.href && (
                          <Fragment key={`link-fragment-${item.title}`}>
                            {isSidebarExpanded ? (
                              <Link
                                key={`link-${item.title}`}
                                href={item.disabled ? "#" : item.href}
                                className={cn(
                                  "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted",
                                  isRTL && "flex-row-reverse text-right",
                                  isPathActive(item.href)
                                    ? "bg-background/60"
                                    : "text-muted-foreground hover:text-accent-foreground",
                                  item.disabled &&
                                    "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                                )}
                              >
                                <Icon className="size-5 shrink-0" />
                                {itemTitle}
                                {item.badge && (
                                  <Badge className="me-auto flex size-5 shrink-0 items-center justify-center rounded-full">
                                    {item.badge}
                                  </Badge>
                                )}
                              </Link>
                            ) : (
                              <Tooltip key={`tooltip-${item.title}`}>
                                <TooltipTrigger asChild>
                                  <Link
                                    key={`link-tooltip-${item.title}`}
                                    href={item.disabled ? "#" : item.href}
                                    className={cn(
                                      "flex items-center gap-3 rounded-md py-2 text-sm font-medium hover:bg-muted",
                                      isPathActive(item.href)
                                        ? "bg-background/60"
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

              <div className="mt-auto xl:p-4">
                {isSidebarExpanded ? <UpgradeCard /> : null}
              </div>
            </div>
          </aside>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

export function MobileSheetSidebar({ links, userEvents = [], currentRole, availableRoles = [] }: DashboardSidebarProps) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(true);
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

  // Check if current path is an event page
  const isEventActive = (eventId: string) => {
    return path?.includes(`/dashboard/events/${eventId}`);
  };

  const isEventsPage = path?.includes("/dashboard/events");

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
        <SheetContent side={isRTL ? "right" : "left"} className="flex flex-col p-0">
          <ScrollArea className="h-full overflow-y-auto">
            <div className="flex h-screen flex-col">
              <nav className="flex flex-1 flex-col gap-y-8 p-6 text-lg font-medium">
                <Link
                  href={`/${locale}/dashboard`}
                  className={cn(
                    "flex items-center gap-2 text-lg font-semibold",
                    isRTL && "flex-row-reverse"
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500">
                    <Icons.heart className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-urban text-xl font-bold">
                    {siteConfig.name}
                  </span>
                </Link>

                {/* Role Switcher - only visible for users with multiple roles */}
                {currentRole && availableRoles.length > 1 && (
                  <RoleSwitcher
                    currentRole={currentRole}
                    availableRoles={availableRoles}
                    expanded={true}
                  />
                )}

                {links.map((section) => (
                  <section
                    key={section.title}
                    className="flex flex-col gap-0.5"
                  >
                    <p className={cn("text-xs text-muted-foreground", isRTL && "text-right")}>
                      {getTitle(section.titleKey, section.title)}
                    </p>

                    {section.items.map((item) => {
                      const Icon = Icons[item.icon || "arrowRight"];
                      const itemTitle = getTitle(item.titleKey, item.title);
                      const isEventsItem = item.href === "/dashboard/events";

                      // For the Events item, show collapsible with sub-events
                      if (isEventsItem && userEvents.length > 0) {
                        return (
                          <Collapsible
                            key={`mobile-collapsible-${item.title}`}
                            open={eventsOpen}
                            onOpenChange={setEventsOpen}
                          >
                            <div className="flex flex-col">
                              <div className={cn(
                                "flex items-center gap-1",
                                isRTL && "flex-row-reverse"
                              )}>
                                <Link
                                  onClick={() => setOpen(false)}
                                  href={item.href}
                                  className={cn(
                                    "flex flex-1 items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted",
                                    isRTL && "flex-row-reverse text-right",
                                    isPathActive(item.href) || isEventsPage
                                      ? "bg-background/60"
                                      : "text-muted-foreground hover:text-accent-foreground",
                                  )}
                                >
                                  <Icon className="size-5 shrink-0" />
                                  {itemTitle}
                                </Link>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7">
                                    {eventsOpen ? (
                                      <ChevronDown className="size-4" />
                                    ) : (
                                      <ChevronRight className="size-4 rtl:rotate-180" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                              <CollapsibleContent>
                                <div className={cn(
                                  "flex flex-col gap-0.5 mt-1",
                                  isRTL ? "mr-4 pr-2 border-r" : "ml-4 pl-2 border-l"
                                )}>
                                  {userEvents.map((event) => (
                                    <Link
                                      key={event.id}
                                      onClick={() => setOpen(false)}
                                      href={`/${locale}/dashboard/events/${event.id}`}
                                      className={cn(
                                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                                        isRTL && "flex-row-reverse text-right",
                                        isEventActive(event.id)
                                          ? "bg-background/60 font-medium"
                                          : "text-muted-foreground hover:text-accent-foreground",
                                      )}
                                    >
                                      <Icons.heart className="size-3.5 shrink-0" />
                                      <span className="truncate">{event.title}</span>
                                    </Link>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      }

                      return (
                        item.href && (
                          <Fragment key={`link-fragment-${item.title}`}>
                            <Link
                              key={`link-${item.title}`}
                              onClick={() => {
                                if (!item.disabled) setOpen(false);
                              }}
                              href={item.disabled ? "#" : item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted",
                                isRTL && "flex-row-reverse text-right",
                                isPathActive(item.href)
                                  ? "bg-background/60"
                                  : "text-muted-foreground hover:text-accent-foreground",
                                item.disabled &&
                                  "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                              )}
                            >
                              <Icon className="size-5 shrink-0" />
                              {itemTitle}
                              {item.badge && (
                                <Badge className="me-auto flex size-5 shrink-0 items-center justify-center rounded-full">
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

                <div className="mt-auto">
                  <UpgradeCard />
                </div>
              </nav>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex size-9 animate-pulse rounded-lg bg-muted md:hidden" />
  );
}
