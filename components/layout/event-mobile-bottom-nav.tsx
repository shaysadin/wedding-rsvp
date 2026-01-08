"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface EventMobileBottomNavProps {
  eventId: string;
  locale: string;
}

export function EventMobileBottomNav({ eventId, locale }: EventMobileBottomNavProps) {
  const path = usePathname();
  const t = useTranslations();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const isRTL = locale === "he";

  // Primary navigation items (shown in bottom nav)
  const primaryNavItems = [
    { href: "", icon: Icons.dashboard, labelKey: "navigation.eventDashboard", label: "Dashboard" },
    { href: "/guests", icon: Icons.users, labelKey: "navigation.guests", label: "Guests" },
    { href: "/invitations", icon: Icons.mail, labelKey: "navigation.invitations", label: "Invitations" },
    { href: "/messages", icon: Icons.messageSquare, labelKey: "navigation.messages", label: "Messages" },
  ];

  // Secondary navigation items (shown in "More" drawer)
  const secondaryNavItems = [
    { href: "/tasks", icon: Icons.checkSquare, labelKey: "navigation.tasks", label: "Tasks" },
    { href: "/seating", icon: Icons.layoutGrid, labelKey: "navigation.seating", label: "Seating" },
    { href: "/suppliers", icon: Icons.suppliers, labelKey: "navigation.suppliers", label: "Suppliers" },
    { href: "/gifts", icon: Icons.gift, labelKey: "navigation.gifts", label: "Gifts" },
    { href: "/automations", icon: Icons.sparkles, labelKey: "navigation.automations", label: "Automations" },
    { href: "/customize", icon: Icons.palette, labelKey: "navigation.customize", label: "RSVP Design" },
    { href: "/voice-agent", icon: Icons.phone, labelKey: "navigation.voiceAgent", label: "Voice Agent" },
    { href: "/rsvp", icon: Icons.mailCheck, labelKey: "navigation.rsvp", label: "RSVP Approvals" },
  ];

  // Global navigation items
  const globalNavItems = [
    { href: "/dashboard", icon: Icons.home, labelKey: "navigation.lobby", label: "My Events" },
    { href: "/dashboard/billing", icon: Icons.creditCard, labelKey: "navigation.billing", label: "Billing" },
    { href: "/dashboard/settings", icon: Icons.settings, labelKey: "navigation.settings", label: "Settings" },
  ];

  // Check if current path matches the event sub-page
  const isSubPageActive = (subPage: string) => {
    if (!path) return false;
    const eventBasePath = `/${locale}/events/${eventId}`;

    if (subPage === "") {
      return path === eventBasePath || path === `${eventBasePath}/`;
    }

    return path.startsWith(`${eventBasePath}${subPage}`);
  };

  // Get translated label
  const getLabel = (labelKey: string, fallback: string) => {
    try {
      const parts = labelKey.split(".");
      if (parts.length === 2) {
        return t(`${parts[0]}.${parts[1]}` as any) || fallback;
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  // Check if any secondary item is active
  const isSecondaryActive = secondaryNavItems.some(item => isSubPageActive(item.href));

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 inset-x-0 z-50 md:hidden",
          "bg-background/95 backdrop-blur-lg border-t border-border",
          "safe-area-bottom"
        )}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isSubPageActive(item.href);
            const fullHref = `/${locale}/events/${eventId}${item.href}`;

            return (
              <Link
                key={item.href}
                href={fullHref}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors flex-1 max-w-[72px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-full transition-colors",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className={cn(
                    "size-5 transition-transform",
                    isActive && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-none truncate max-w-full",
                  isActive && "font-semibold"
                )}>
                  {getLabel(item.labelKey, item.label)}
                </span>
              </Link>
            );
          })}

          {/* More Button */}
          <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
            <DrawerTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors flex-1 max-w-[72px]",
                  isSecondaryActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-full transition-colors",
                  isSecondaryActive && "bg-primary/10"
                )}>
                  <MoreHorizontal className={cn(
                    "size-5 transition-transform",
                    isSecondaryActive && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-none truncate max-w-full",
                  isSecondaryActive && "font-semibold"
                )}>
                  {isRTL ? "עוד" : "More"}
                </span>
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="rtl:text-end">
                  {isRTL ? "תפריט" : "Menu"}
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 space-y-6">
                {/* Event Features */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide rtl:text-end">
                    {isRTL ? "תכונות האירוע" : "Event Features"}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {secondaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isSubPageActive(item.href);
                      const fullHref = `/${locale}/events/${eventId}${item.href}`;

                      return (
                        <Link
                          key={item.href}
                          href={fullHref}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="size-6" />
                          <span className="text-[10px] font-medium text-center leading-tight">
                            {getLabel(item.labelKey, item.label)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Global Navigation */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide rtl:text-end">
                    {isRTL ? "חשבון" : "Account"}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {globalNavItems.map((item) => {
                      const Icon = item.icon;
                      const fullHref = `/${locale}${item.href}`;

                      return (
                        <Link
                          key={item.href}
                          href={fullHref}
                          onClick={() => setMoreOpen(false)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Icon className="size-6" />
                          <span className="text-[10px] font-medium text-center leading-tight">
                            {getLabel(item.labelKey, item.label)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        {/* Safe area padding for devices with home indicator */}
        <div className="h-safe-area-inset-bottom bg-background" />
      </nav>
    </>
  );
}
