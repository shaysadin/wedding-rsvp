"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PlanTier } from "@prisma/client";
import {
  Calendar,
  MapPin,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSidebar, useSidebarExpanded } from "@/contexts/sidebar-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { AppLogo } from "@/components/shared/app-logo";
import { Icons } from "@/components/shared/icons";
import { WorkspaceSelectorClient } from "@/components/workspaces/workspace-selector-client";
import { SidebarBackdrop } from "@/components/layout/sidebar-backdrop";

// Navigation items for the lobby sidebar
const lobbyNavItems = [
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
        "flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5",
        "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700",
        !expanded && "justify-center px-2"
      )}>
        {expanded ? (
          <span className="text-sm text-gray-500">
            {isRTL ? "אין אירועים" : "No events"}
          </span>
        ) : (
          <Calendar className="h-5 w-5 text-gray-400" />
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center w-full gap-2 px-3 py-2.5 rounded-lg border transition-colors",
            "border-gray-200 bg-white hover:bg-gray-50",
            "dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700",
            !expanded && "justify-center px-2"
          )}
        >
          {expanded ? (
            <>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-500/10">
                <Calendar className="h-4 w-4 text-brand-500" />
              </div>
              <div className="flex flex-col items-start text-start truncate flex-1">
                <span className="font-medium truncate text-sm text-gray-900 dark:text-white">
                  {isRTL ? "בחר אירוע" : "Select Event"}
                </span>
                <span className="text-xs text-gray-500">
                  {events.length} {isRTL ? "אירועים" : "events"}
                </span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
                open && "rotate-180"
              )} />
            </>
          ) : (
            <Calendar className="h-5 w-5 text-brand-500" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isRTL ? "end" : "start"}
        className="w-[260px] p-2"
      >
        <div className="mb-2 px-2 py-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {isRTL ? "האירועים שלי" : "My Events"}
          </p>
        </div>
        {events.map((event) => (
          <DropdownMenuItem
            key={event.id}
            onClick={() => handleSelect(event.id)}
            className="flex items-center gap-3 p-3 cursor-pointer rounded-lg"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
              <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="flex-1 min-w-0 text-start">
              <p className="font-medium truncate text-gray-900 dark:text-white">{event.title}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{event.location}</span>
                <span className="mx-1">•</span>
                <span>{formatDate(event.dateTime)}</span>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LobbySidebar({ events, locale, userPlan }: LobbySidebarProps) {
  const path = usePathname();
  const t = useTranslations();
  const isRTL = locale === "he";

  const { isExpanded, isMobileOpen, toggleSidebar, setIsHovered } = useSidebar();
  const effectivelyExpanded = useSidebarExpanded();

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
    <>
      <SidebarBackdrop />
      <aside
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed mt-16 flex flex-col lg:mt-0 top-0 bg-white dark:bg-gray-900 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50",
          // Border on the correct side based on RTL
          isRTL ? "border-l border-gray-200 dark:border-gray-800" : "border-r border-gray-200 dark:border-gray-800",
          isRTL ? "right-0" : "left-0",
          effectivelyExpanded || isMobileOpen ? "w-[290px]" : "w-[90px]",
          isMobileOpen
            ? "translate-x-0"
            : isRTL
              ? "translate-x-full lg:translate-x-0"
              : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo - full width border to sync with header */}
        <div className={cn(
          "flex items-center border-b border-gray-200 dark:border-gray-800 px-5 h-[60px]",
          !effectivelyExpanded && !isMobileOpen ? "lg:justify-center" : "justify-start"
        )}>
          <Link href={`/${locale}/dashboard`}>
            <AppLogo size={effectivelyExpanded || isMobileOpen ? "md" : "sm"} />
          </Link>
        </div>

        {/* Scrollable Content */}
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar flex-1 pt-6 px-5">
          {/* Workspace Selector - for Business plan users */}
          {(effectivelyExpanded || isMobileOpen) && userPlan === PlanTier.BUSINESS && (
            <div className="mb-4">
              <WorkspaceSelectorClient />
            </div>
          )}

          {/* Event Selector */}
          <div className="mb-6">
            <EventSelector
              events={events}
              locale={locale}
              expanded={effectivelyExpanded || isMobileOpen}
            />
          </div>

          {/* Navigation */}
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className={cn(
                  "mb-4 text-xs uppercase flex leading-5 text-gray-400",
                  !effectivelyExpanded && !isMobileOpen ? "lg:justify-center" : "justify-start"
                )}>
                  {effectivelyExpanded || isMobileOpen ? (
                    isRTL ? "תפריט" : "Menu"
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </h2>

                <ul className="flex flex-col gap-2">
                  {lobbyNavItems.map((item) => {
                    const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
                    const itemTitle = getTitle(item.titleKey, item.title);
                    const fullHref = `/${locale}${item.href}`;
                    const isActive = isPathActive(item.href);

                    return (
                      <li key={`nav-${item.title}`}>
                        <Link
                          href={fullHref}
                          className={cn(
                            "menu-item group",
                            isActive ? "menu-item-active" : "menu-item-inactive",
                            !effectivelyExpanded && !isMobileOpen && "lg:justify-center"
                          )}
                        >
                          <span className={isActive ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                            <Icon className="h-5 w-5" />
                          </span>
                          {(effectivelyExpanded || isMobileOpen) && (
                            <span>{itemTitle}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </nav>

          {/* Upgrade Card */}
          {(effectivelyExpanded || isMobileOpen) && <UpgradeCard />}
        </div>
      </aside>
    </>
  );
}

// Mobile header button to toggle sidebar
export function MobileSidebarToggle() {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  const t = useTranslations();

  return (
    <button
      className="flex items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-lg z-50 dark:border-gray-800 lg:hidden dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
      onClick={toggleMobileSidebar}
      aria-label={t("common.menu")}
    >
      {isMobileOpen ? (
        <Icons.close className="h-5 w-5" />
      ) : (
        <Icons.menu className="h-4 w-4" />
      )}
    </button>
  );
}

// Compatibility export for existing code
export function MobileSheetLobbySidebar({ events, locale, userPlan }: LobbySidebarProps) {
  return <MobileSidebarToggle />;
}
