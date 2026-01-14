"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreHorizontal, PanelLeftClose, PanelRightClose } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSidebar, useSidebarExpanded } from "@/contexts/sidebar-context";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EventSwitcher } from "@/components/events/event-switcher";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { AppLogo } from "@/components/shared/app-logo";
import { Icons } from "@/components/shared/icons";
import { SidebarBackdrop } from "@/components/layout/sidebar-backdrop";
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

  const { isExpanded, isMobileOpen, toggleSidebar, setIsHovered, closeMobileSidebar } = useSidebar();
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
      <SidebarBackdrop />
      <aside
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed mt-16 flex flex-col lg:mt-0 top-0 bg-white dark:bg-gray-900 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50",
          // Border on the correct side based on RTL
          isRTL ? "border-l border-gray-200 dark:border-gray-800" : "border-r border-gray-200 dark:border-gray-800",
          isRTL ? "right-0" : "left-0",
          effectivelyExpanded || isMobileOpen ? "w-[260px]" : "w-[80px]",
          isMobileOpen
            ? "translate-x-0"
            : isRTL
              ? "translate-x-full lg:translate-x-0"
              : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo & Toggle - full width border to sync with header */}
        <div className={cn(
          "flex items-center border-b border-gray-200 dark:border-gray-800 px-4 h-[61px]",
          !effectivelyExpanded && !isMobileOpen ? "lg:justify-center" : "justify-between"
        )}>
          <Link href={`/${locale}/dashboard`} onClick={isMobileOpen ? closeMobileSidebar : undefined}>
            <AppLogo size={effectivelyExpanded || isMobileOpen ? "md" : "sm"} />
          </Link>

          {(effectivelyExpanded || isMobileOpen) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={toggleSidebar}
            >
              {isExpanded ? (
                <PanelLeftClose
                  size={18}
                  className="rtl:rotate-180 text-gray-500"
                />
              ) : (
                <PanelRightClose
                  size={18}
                  className="rtl:rotate-180 text-gray-500"
                />
              )}
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          )}
        </div>

        {/* Event Switcher */}
        <div className="mb-6 pt-6 px-4">
          <EventSwitcher
            currentEvent={currentEvent}
            events={events}
            locale={locale}
            expanded={effectivelyExpanded || isMobileOpen}
            onEventChange={isMobileOpen ? closeMobileSidebar : undefined}
          />
        </div>

        {/* Scrollable Navigation */}
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar flex-1 px-4">
          <nav className="flex flex-col gap-4">
            {eventNavSections.map((section) => (
              <div key={section.title}>
                <h2 className={cn(
                  "mb-4 text-xs uppercase flex leading-5 text-gray-400",
                  !effectivelyExpanded && !isMobileOpen ? "lg:justify-center" : "justify-start"
                )}>
                  {effectivelyExpanded || isMobileOpen ? (
                    getTitle(section.titleKey, section.title)
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </h2>

                <ul className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
                    const itemTitle = getTitle(item.titleKey, item.title);
                    const fullHref = `/${locale}/events/${currentEvent.id}${item.href}`;
                    const isActive = isSubPageActive(item.href);

                    return (
                      <li key={`nav-${item.title}`}>
                        {effectivelyExpanded || isMobileOpen ? (
                          <Link
                            href={fullHref}
                            onClick={isMobileOpen ? closeMobileSidebar : undefined}
                            className={cn(
                              "menu-item group",
                              isActive ? "menu-item-active" : "menu-item-inactive"
                            )}
                          >
                            <span className={isActive ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <span>{itemTitle}</span>
                          </Link>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={fullHref}
                                className={cn(
                                  "menu-item group justify-center",
                                  isActive ? "menu-item-active" : "menu-item-inactive"
                                )}
                              >
                                <span className={isActive ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                                  <Icon className="h-5 w-5" />
                                </span>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side={isRTL ? "left" : "right"}>
                              {itemTitle}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* Separator */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

            {/* Global Navigation */}
            <div>
              <h2 className={cn(
                "mb-4 text-xs uppercase flex leading-5 text-gray-400",
                !effectivelyExpanded && !isMobileOpen ? "lg:justify-center" : "justify-start"
              )}>
                {effectivelyExpanded || isMobileOpen ? (
                  getTitle("navigation.account", "ACCOUNT")
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </h2>

              <ul className="flex flex-col gap-1">
                {globalNavItems.map((item) => {
                  const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
                  const itemTitle = getTitle(item.titleKey, item.title);
                  const fullHref = `/${locale}${item.href}`;
                  const isActive = isGlobalActive(item.href);

                  return (
                    <li key={`global-${item.title}`}>
                      {effectivelyExpanded || isMobileOpen ? (
                        <Link
                          href={fullHref}
                          onClick={isMobileOpen ? closeMobileSidebar : undefined}
                          className={cn(
                            "menu-item group",
                            isActive ? "menu-item-active" : "menu-item-inactive"
                          )}
                        >
                          <span className={isActive ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span>{itemTitle}</span>
                        </Link>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={fullHref}
                              className={cn(
                                "menu-item group justify-center",
                                isActive ? "menu-item-active" : "menu-item-inactive"
                              )}
                            >
                              <span className={isActive ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                                <Icon className="h-5 w-5" />
                              </span>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side={isRTL ? "left" : "right"}>
                            {itemTitle}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Upgrade Card */}
          {(effectivelyExpanded || isMobileOpen) && (
            <div className="mt-auto pt-6">
              <UpgradeCard />
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

// Mobile header button to toggle sidebar
export function MobileSidebarEventToggle() {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  const t = useTranslations();

  return (
    <button
      className="flex items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-lg z-50 dark:border-gray-800 md:hidden dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
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
export function MobileSheetEventSidebar({ currentEvent, events, locale }: EventSidebarProps) {
  return <MobileSidebarEventToggle />;
}
