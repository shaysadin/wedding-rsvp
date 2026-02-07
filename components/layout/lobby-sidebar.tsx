"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PlanTier } from "@prisma/client";
import {
  Menu,
  PanelLeftClose,
  PanelRightClose,
  Archive,
  Settings,
  User,
  CreditCard,
  Calendar,
  MapPin,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { AppLogo } from "@/components/shared/app-logo";
import { Icons } from "@/components/shared/icons";
import { WorkspaceSelectorClient } from "@/components/workspaces/workspace-selector-client";

// Navigation items for the lobby sidebar
const lobbyNavItems = [
  { href: "/dashboard", icon: "home", titleKey: "navigation.lobby", title: "Lobby" },
  { href: "/dashboard/archives", icon: "archive", titleKey: "navigation.archives", title: "Archives" },
  { href: "/dashboard/settings", icon: "settings", titleKey: "navigation.settings", title: "Settings" },
  { href: "/dashboard/billing", icon: "creditCard", titleKey: "navigation.billing", title: "Billing" },
];

interface EventOption {
  id: string;
  title: string;
  dateTime: Date;
  location: string;
  venue?: string | null;
}

interface LobbySidebarProps {
  events: EventOption[];
  locale: string;
  userPlan: PlanTier;
}

// Event selector dropdown component
function EventSelector({
  events,
  locale,
  expanded = true,
  onEventSelect,
}: {
  events: EventOption[];
  locale: string;
  expanded?: boolean;
  onEventSelect?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isRTL = locale === "he";
  const t = useTranslations();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(isRTL ? "he-IL" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSelect = (eventId: string) => {
    setOpen(false);
    onEventSelect?.();
    router.push(`/${locale}/events/${eventId}`);
  };

  if (events.length === 0) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2.5",
        !expanded && "justify-center px-2"
      )}>
        {expanded ? (
          <span className="text-sm text-muted-foreground">
            {isRTL ? "אין אירועים" : "No events"}
          </span>
        ) : (
          <Calendar className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between gap-2 h-auto py-2 w-full",
            !expanded && "w-9 p-0 justify-center"
          )}
        >
          {expanded ? (
            <>
              <div className="flex items-center gap-2 truncate">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col items-start text-start truncate">
                  <span className="font-medium truncate text-sm">
                    {isRTL ? "בחר אירוע" : "Select Event"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {events.length} {isRTL ? "אירועים" : "events"}
                  </span>
                </div>
              </div>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </motion.div>
            </>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <AnimatePresence>
        {open && (
          <DropdownMenuContent
            align={isRTL ? "start" : "end"}
            className="w-[280px] p-2"
            asChild
            forceMount
          >
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className="mb-2 px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {isRTL ? "האירועים שלי" : "My Events"}
                </p>
              </div>
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.03 }}
                >
                  <DropdownMenuItem
                    onClick={() => handleSelect(event.id)}
                    className="flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-start">
                      <p className="font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(event.dateTime)}</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              ))}
            </motion.div>
          </DropdownMenuContent>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}

export function LobbySidebar({ events, locale, userPlan }: LobbySidebarProps) {
  const path = usePathname();
  const t = useTranslations();
  const isRTL = locale === "he";

  const { isTablet } = useMediaQuery();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(!isTablet);

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  useEffect(() => {
    setIsSidebarExpanded(!isTablet);
  }, [isTablet]);

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

  // Check if current path matches the item href
  const isPathActive = (href: string) => {
    if (!path) return false;
    const pathWithoutLocale = path.replace(`/${locale}`, "") || "/";
    return pathWithoutLocale === href || pathWithoutLocale.startsWith(`${href}/`);
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

        {/* Workspace Selector - for Business plan users */}
        {isSidebarExpanded && (
          <div className="shrink-0 px-4 pb-2">
            <WorkspaceSelectorClient />
          </div>
        )}

        {/* Event Selector */}
        <div className="shrink-0 px-4 pb-2">
          <EventSelector
            events={events}
            locale={locale}
            expanded={isSidebarExpanded}
          />
        </div>

        {/* Separator */}
        <div className="px-4 py-2">
          <Separator />
        </div>

        {/* Scrollable Navigation */}
        <ScrollArea className="flex-1 min-h-0">
          <nav className="flex flex-col gap-0.5 px-4 py-2">
            {lobbyNavItems.map((item) => {
              const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
              const itemTitle = getTitle(item.titleKey, item.title);
              const fullHref = `/${locale}${item.href}`;
              const isActive = isPathActive(item.href);

              return (
                <Fragment key={`nav-${item.title}`}>
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

export function MobileSheetLobbySidebar({ events, locale, userPlan }: LobbySidebarProps) {
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

  // Check if current path matches the item href
  const isPathActive = (href: string) => {
    if (!path) return false;
    const pathWithoutLocale = path.replace(`/${locale}`, "") || "/";
    return pathWithoutLocale === href || pathWithoutLocale.startsWith(`${href}/`);
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

            {/* Workspace Selector */}
            <div className="mt-4">
              <WorkspaceSelectorClient />
            </div>

            {/* Event Selector */}
            <div className="mt-4">
              <EventSelector
                events={events}
                locale={locale}
                expanded={true}
                onEventSelect={() => setOpen(false)}
              />
            </div>
          </div>

          {/* Separator */}
          <div className="px-6 py-4">
            <Separator />
          </div>

          {/* Scrollable Navigation */}
          <ScrollArea className="flex-1 min-h-0">
            <nav className="flex flex-col gap-0.5 px-6 text-lg font-medium">
              {lobbyNavItems.map((item) => {
                const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
                const itemTitle = getTitle(item.titleKey, item.title);
                const fullHref = `/${locale}${item.href}`;
                const isActive = isPathActive(item.href);

                return (
                  <Link
                    key={`mobile-nav-${item.title}`}
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
