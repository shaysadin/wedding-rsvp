"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, PanelLeftClose, PanelRightClose, ArrowLeft, ArrowRight } from "lucide-react";

const SIDEBAR_STORAGE_KEY = "event-sidebar-collapsed";

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
import { Separator } from "@/components/ui/separator";
import { EventSwitcher } from "@/components/events/event-switcher";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { AppLogo } from "@/components/shared/app-logo";
import { Icons } from "@/components/shared/icons";
import { EventOption } from "@/contexts/event-context";

// Event-scoped navigation items
const eventNavSections = [
  {
    titleKey: "navigation.overview",
    title: "OVERVIEW",
    items: [
      { href: "", icon: "dashboard", titleKey: "navigation.eventDashboard", title: "Dashboard" },
      { href: "/guests", icon: "users", titleKey: "navigation.guests", title: "Guests" },
    ],
  },
  {
    titleKey: "navigation.planning",
    title: "PLANNING",
    items: [
      { href: "/tasks", icon: "checkSquare", titleKey: "navigation.tasks", title: "Tasks" },
      { href: "/seating", icon: "layoutGrid", titleKey: "navigation.seating", title: "Seating" },
      { href: "/suppliers", icon: "suppliers", titleKey: "navigation.suppliers", title: "Suppliers" },
      { href: "/gifts", icon: "gift", titleKey: "navigation.gifts", title: "Gifts" },
    ],
  },
  {
    titleKey: "navigation.communication",
    title: "COMMUNICATION",
    items: [
      { href: "/invitations", icon: "mail", titleKey: "navigation.invitations", title: "Invitations" },
      { href: "/messages", icon: "messageSquare", titleKey: "navigation.messages", title: "Messages" },
      { href: "/automations", icon: "sparkles", titleKey: "navigation.automations", title: "Automations" },
      { href: "/customize", icon: "palette", titleKey: "navigation.customize", title: "RSVP Design" },
      { href: "/voice-agent", icon: "phone", titleKey: "navigation.voiceAgent", title: "Voice Agent" },
      { href: "/rsvp", icon: "mailCheck", titleKey: "navigation.rsvp", title: "RSVP Approvals" },
    ],
  },
];

// Global navigation items (shown at bottom)
const globalNavItems = [
  { href: "/dashboard", icon: "home", titleKey: "navigation.lobby", title: "My Events" },
  { href: "/dashboard/billing", icon: "creditCard", titleKey: "navigation.billing", title: "Billing" },
  { href: "/dashboard/settings", icon: "settings", titleKey: "navigation.settings", title: "Settings" },
];

interface EventSidebarProps {
  currentEvent: EventOption;
  events: EventOption[];
  locale: string;
}

export function EventSidebar({ currentEvent, events, locale }: EventSidebarProps) {
  const path = usePathname();
  const t = useTranslations();
  const isRTL = locale === "he";

  const { isTablet } = useMediaQuery();

  // Initialize state from localStorage or default based on screen size
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    // Default to expanded on larger screens, collapsed on tablet
    return !isTablet;
  });
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) {
      // If user has a saved preference, use it
      setIsSidebarExpanded(saved !== "true"); // stored as "collapsed" = true
    } else {
      // No saved preference, use screen size default
      setIsSidebarExpanded(!isTablet);
    }
    setHasInitialized(true);
  }, []);

  // Only apply screen size default on initial load if no saved preference
  useEffect(() => {
    if (!hasInitialized) return;

    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    // Only auto-adjust if user hasn't set a preference
    if (saved === null) {
      setIsSidebarExpanded(!isTablet);
    }
  }, [isTablet, hasInitialized]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarExpanded(prev => {
      const newValue = !prev;
      // Save preference to localStorage (storing collapsed state)
      localStorage.setItem(SIDEBAR_STORAGE_KEY, (!newValue).toString());
      return newValue;
    });
  }, []);

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

  // Check if current path matches the event sub-page
  const isSubPageActive = (subPage: string) => {
    if (!path) return false;
    const eventBasePath = `/${locale}/events/${currentEvent.id}`;

    if (subPage === "") {
      // Dashboard - exact match only
      return path === eventBasePath || path === `${eventBasePath}/`;
    }

    return path.startsWith(`${eventBasePath}${subPage}`);
  };

  // Check if path matches global item
  const isGlobalActive = (href: string) => {
    if (!path) return false;
    return path.includes(href);
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

        {/* Event Switcher */}
        <div className="shrink-0 px-4 pb-2">
          <EventSwitcher
            currentEvent={currentEvent}
            events={events}
            locale={locale}
            expanded={isSidebarExpanded}
          />
        </div>

        {/* Scrollable Navigation */}
        <ScrollArea className="flex-1 min-h-0">
          <nav className="flex flex-col gap-6 px-4 py-4">
            {eventNavSections.map((section) => (
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
                  const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
                  const itemTitle = getTitle(item.titleKey, item.title);
                  const fullHref = `/${locale}/events/${currentEvent.id}${item.href}`;
                  const isActive = isSubPageActive(item.href);

                  return (
                    <Fragment key={`link-fragment-${item.title}`}>
                      {isSidebarExpanded ? (
                        <Link
                          href={fullHref}
                          className={cn(
                            "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted rtl:flex-row-reverse",
                            isActive
                              ? "bg-background/80"
                              : "text-muted-foreground hover:text-accent-foreground",
                          )}
                        >
                          <Icon className="size-5 shrink-0" />
                          {itemTitle}
                        </Link>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={fullHref}
                              className={cn(
                                "flex items-center gap-3 rounded-md py-2 text-sm font-medium hover:bg-muted",
                                isActive
                                  ? "bg-background/80"
                                  : "text-muted-foreground hover:text-accent-foreground",
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
                  );
                })}
              </section>
            ))}

            {/* Separator before global nav */}
            <Separator className="my-2" />

            {/* Global Navigation */}
            <section className="flex flex-col gap-0.5">
              {isSidebarExpanded && (
                <p className="text-xs text-muted-foreground rtl:text-end">
                  {getTitle("navigation.account", "ACCOUNT")}
                </p>
              )}
              {globalNavItems.map((item) => {
                const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
                const itemTitle = getTitle(item.titleKey, item.title);
                const fullHref = `/${locale}${item.href}`;
                const isActive = isGlobalActive(item.href);

                return (
                  <Fragment key={`global-${item.title}`}>
                    {isSidebarExpanded ? (
                      <Link
                        href={fullHref}
                        className={cn(
                          "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted rtl:flex-row-reverse",
                          isActive
                            ? "bg-background/80"
                            : "text-muted-foreground hover:text-accent-foreground",
                        )}
                      >
                        <Icon className="size-5 shrink-0" />
                        {itemTitle}
                      </Link>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={fullHref}
                            className={cn(
                              "flex items-center gap-3 rounded-md py-2 text-sm font-medium hover:bg-muted",
                              isActive
                                ? "bg-background/80"
                                : "text-muted-foreground hover:text-accent-foreground",
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
                );
              })}
            </section>
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

export function MobileSheetEventSidebar({ currentEvent, events, locale }: EventSidebarProps) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { isSm, isMobile } = useMediaQuery();
  const t = useTranslations();
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

  // Check if current path matches the event sub-page
  const isSubPageActive = (subPage: string) => {
    if (!path) return false;
    const eventBasePath = `/${locale}/events/${currentEvent.id}`;

    if (subPage === "") {
      return path === eventBasePath || path === `${eventBasePath}/`;
    }

    return path.startsWith(`${eventBasePath}${subPage}`);
  };

  // Check if path matches global item
  const isGlobalActive = (href: string) => {
    if (!path) return false;
    return path.includes(href);
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

            {/* Event Switcher */}
            <div className="mt-4">
              <EventSwitcher
                currentEvent={currentEvent}
                events={events}
                locale={locale}
                expanded={true}
                onEventChange={() => setOpen(false)}
              />
            </div>
          </div>

          {/* Scrollable Navigation */}
          <ScrollArea className="flex-1 min-h-0">
            <nav className="flex flex-col gap-6 p-6 text-lg font-medium">
              {eventNavSections.map((section) => (
                <section
                  key={section.title}
                  className="flex flex-col gap-0.5"
                >
                  <p className="text-xs text-muted-foreground rtl:text-end">
                    {getTitle(section.titleKey, section.title)}
                  </p>

                  {section.items.map((item) => {
                    const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
                    const itemTitle = getTitle(item.titleKey, item.title);
                    const fullHref = `/${locale}/events/${currentEvent.id}${item.href}`;
                    const isActive = isSubPageActive(item.href);

                    return (
                      <Link
                        key={`mobile-link-${item.title}`}
                        onClick={() => setOpen(false)}
                        href={fullHref}
                        className={cn(
                          "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted rtl:flex-row-reverse",
                          isActive
                            ? "bg-background/80"
                            : "text-muted-foreground hover:text-accent-foreground",
                        )}
                      >
                        <Icon className="size-5 shrink-0" />
                        {itemTitle}
                      </Link>
                    );
                  })}
                </section>
              ))}

              {/* Separator before global nav */}
              <Separator className="my-2" />

              {/* Global Navigation */}
              <section className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground rtl:text-end">
                  {getTitle("navigation.account", "ACCOUNT")}
                </p>
                {globalNavItems.map((item) => {
                  const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
                  const itemTitle = getTitle(item.titleKey, item.title);
                  const fullHref = `/${locale}${item.href}`;
                  const isActive = isGlobalActive(item.href);

                  return (
                    <Link
                      key={`mobile-global-${item.title}`}
                      onClick={() => setOpen(false)}
                      href={fullHref}
                      className={cn(
                        "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted rtl:flex-row-reverse",
                        isActive
                          ? "bg-background/80"
                          : "text-muted-foreground hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="size-5 shrink-0" />
                      {itemTitle}
                    </Link>
                  );
                })}
              </section>
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
