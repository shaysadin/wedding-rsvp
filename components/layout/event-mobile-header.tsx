"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, Home } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { EventOption } from "@/contexts/event-context";
import { EventSwitcherInline } from "./event-switcher-inline";
import { UserAccountNav } from "./user-account-nav";

interface EventMobileHeaderProps {
  currentEvent: EventOption;
  events: EventOption[];
  locale: string;
}

export function EventMobileHeader({ currentEvent, events, locale }: EventMobileHeaderProps) {
  const path = usePathname();
  const t = useTranslations();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const isRTL = locale === "he";

  // Get the current page title based on path
  const getPageTitle = () => {
    const subPageMatch = path.match(/\/events\/[^/]+\/(.+)/);
    if (!subPageMatch) return currentEvent.title;

    const subPage = subPageMatch[1];
    const titleMap: Record<string, string> = {
      guests: t("navigation.guests"),
      tasks: t("navigation.tasks"),
      seating: t("navigation.seating"),
      suppliers: t("navigation.suppliers"),
      gifts: t("navigation.gifts"),
      invitations: t("navigation.invitations"),
      messages: t("navigation.messages"),
      automations: t("navigation.automations"),
      customize: t("navigation.customize"),
      "voice-agent": t("navigation.voiceAgent"),
      rsvp: t("navigation.rsvp"),
    };

    return titleMap[subPage] || currentEvent.title;
  };

  // Check if we're on a sub-page (not the event dashboard)
  const isSubPage = path.match(/\/events\/[^/]+\/.+/);

  return (
    <header className="flex shrink-0 md:hidden h-14 items-center justify-between border-b px-3 bg-background">
      {/* Left - Home Button */}
      <Button variant="ghost" size="icon" asChild className="size-9 shrink-0">
        <Link href={`/${locale}/dashboard`}>
          <Home className="size-5" />
          <span className="sr-only">{t("navigation.lobby")}</span>
        </Link>
      </Button>

      {/* Center - Event Name / Page Title with Switcher */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1 px-2 max-w-[200px]"
          >
            <span className="font-semibold truncate">
              {isSubPage ? getPageTitle() : currentEvent.title}
            </span>
            {events.length > 1 && (
              <ChevronDown className={cn(
                "size-4 shrink-0 transition-transform",
                drawerOpen && "rotate-180"
              )} />
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="rtl:text-end">
              {isRTL ? "בחר אירוע" : "Select Event"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <EventSwitcherInline
              currentEvent={currentEvent}
              events={events}
              locale={locale}
              onEventChange={() => setDrawerOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Right - User Avatar */}
      <div className="shrink-0">
        <UserAccountNav />
      </div>
    </header>
  );
}
